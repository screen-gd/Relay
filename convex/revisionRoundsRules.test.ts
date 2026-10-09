import { expect, test } from "vitest";
import {
  adjustmentFor,
  checkExtraHours,
  correctedRounds,
  countOutputRounds,
  extraCharges,
  extraRounds,
  resolveIncludedRounds,
  resolveRoundBasis,
  scopeExtraRounds,
} from "./revisionRoundsRules";

const version = (
  versionNumber: number,
  createdAt: string,
  firstFeedbackAt: string | null = null
) => ({ versionNumber, createdAt, firstFeedbackAt });

test("a round closes only when feedback on a version is followed by a new version", () => {
  expect(countOutputRounds([])).toEqual({
    computed: 0,
    closingVersions: [],
    openRound: false,
  });
  // Feedback on v1 with no v2 yet is an open round, not a counted one.
  expect(
    countOutputRounds([
      version(1, "2026-10-01T10:00:00Z", "2026-10-02T10:00:00Z"),
    ])
  ).toEqual({ computed: 0, closingVersions: [], openRound: true });
  // Versions uploaded without client feedback in between never count.
  expect(
    countOutputRounds([
      version(1, "2026-10-01T10:00:00Z"),
      version(2, "2026-10-01T11:00:00Z"),
      version(3, "2026-10-01T12:00:00Z"),
    ]).computed
  ).toBe(0);
});

test("versions are ordered by number and many comments on one version count once", () => {
  const rounds = countOutputRounds([
    version(3, "2026-10-05T10:00:00Z", "2026-10-06T10:00:00Z"),
    version(1, "2026-10-01T10:00:00Z", "2026-10-02T10:00:00Z"),
    version(2, "2026-10-03T10:00:00Z"),
    version(4, "2026-10-07T10:00:00Z"),
  ]);
  expect(rounds).toEqual({
    computed: 2,
    closingVersions: [2, 4],
    openRound: false,
  });
});

test("feedback recorded after the next version existed does not close a round", () => {
  expect(
    countOutputRounds([
      version(1, "2026-10-01T10:00:00Z", "2026-10-04T10:00:00Z"),
      version(2, "2026-10-03T10:00:00Z"),
    ]).computed
  ).toBe(0);
});

test("editor corrections adjust the count without going below zero", () => {
  expect(correctedRounds(2, 1)).toBe(3);
  expect(correctedRounds(1, -3)).toBe(0);
  expect(adjustmentFor(2, 0)).toBe(-2);
  expect(() => adjustmentFor(2, 1.5)).toThrow("whole number");
  expect(() => adjustmentFor(2, -1)).toThrow("whole number");
});

test("project limit wins over package and workspace defaults", () => {
  expect(
    resolveIncludedRounds({ project: 0, template: 3, workspace: 2 })
  ).toEqual({
    includedRounds: 0,
    source: "project",
  });
  expect(resolveIncludedRounds({ template: 3, workspace: 2 })).toEqual({
    includedRounds: 3,
    source: "template",
  });
  expect(resolveIncludedRounds({})).toEqual({
    includedRounds: null,
    source: null,
  });
  expect(extraRounds(5, null)).toBe(0);
  expect(extraRounds(5, 2)).toBe(3);
  expect(extraRounds(1, 2)).toBe(0);
});

test("round basis comes from the project, then the workspace, then per output", () => {
  expect(
    resolveRoundBasis({ project: "per_project", workspace: "per_output" })
  ).toEqual({
    roundBasis: "per_project",
    source: "project",
  });
  expect(resolveRoundBasis({ workspace: "per_project" })).toEqual({
    roundBasis: "per_project",
    source: "workspace",
  });
  expect(resolveRoundBasis({})).toEqual({
    roundBasis: "per_output",
    source: "default",
  });
});

test("per project sums rounds across outputs before applying the limit", () => {
  expect(scopeExtraRounds("per_output", [3, 1, 2], 2)).toEqual({
    total: 1,
    perOutput: [1, 0, 0],
  });
  expect(scopeExtraRounds("per_project", [3, 1, 2], 2)).toEqual({
    total: 4,
    perOutput: [0, 0, 0],
  });
  expect(scopeExtraRounds("per_project", [1, 1], 3).total).toBe(0);
  expect(scopeExtraRounds("per_project", [3, 4], null).total).toBe(0);
});

test("charges are exact to the cent and total needs every billed rate", () => {
  expect(
    extraCharges({
      extraRounds: 3,
      extraHours: 1.5,
      extraRoundRate: 0.1,
      extraHourRate: 75.55,
    })
  ).toEqual({ extraRounds: 0.3, extraHours: 113.33, total: 113.63 });
  expect(
    extraCharges({
      extraRounds: 2,
      extraHours: 0,
      extraRoundRate: 150,
      extraHourRate: null,
    })
  ).toEqual({ extraRounds: 300, extraHours: null, total: 300 });
  expect(
    extraCharges({
      extraRounds: 2,
      extraHours: 1,
      extraRoundRate: 150,
      extraHourRate: null,
    })
  ).toEqual({ extraRounds: 300, extraHours: null, total: null });
  expect(() => checkExtraHours(1.1)).toThrow("quarter hours");
});

import { describe, expect, it } from "vitest";
import {
  CLIENT_FEEDBACK_DAYS,
  DUE_SOON_DAYS,
  evaluateDeadlineRisks,
  workspaceToday,
  type RiskOutput,
  type RiskProject,
} from "./deadlineRiskRules";

const TODAY = "2026-10-09";

const stages: RiskProject["workflowStages"] = [
  { id: "edit", label: "Edit", purpose: "editing" },
  { id: "review", label: "Client review", purpose: "client_review" },
  { id: "approved", label: "Approved", purpose: "approved" },
  { id: "done", label: "Delivered", purpose: "delivered" },
];

function project(overrides: Partial<RiskProject> = {}): RiskProject {
  return {
    id: "project-1",
    title: "Launch film",
    status: "In Progress",
    dueDate: TODAY,
    archived: false,
    workflowStageId: "edit",
    workflowStages: stages,
    outputs: [],
    ...overrides,
  };
}

function output(overrides: Partial<RiskOutput> = {}): RiskOutput {
  return {
    id: "output-1",
    title: "Main cut",
    reviewState: "draft",
    dueDate: TODAY,
    archived: false,
    ...overrides,
  };
}

function addDays(days: number) {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("evaluateDeadlineRisks", () => {
  it("flags overdue work and ignores finished, cancelled and archived Projects", () => {
    const findings = evaluateDeadlineRisks(
      [
        project({ id: "late", dueDate: addDays(-2) }),
        project({
          id: "delivered",
          status: "Delivered",
          workflowStageId: "done",
          dueDate: addDays(-2),
        }),
        project({ id: "cancelled", status: "Cancelled", dueDate: addDays(-2) }),
        project({ id: "archived", archived: true, dueDate: addDays(-2) }),
      ],
      TODAY
    );
    expect(findings).toEqual([
      expect.objectContaining({
        projectId: "late",
        kind: "overdue",
        severity: "high",
        waitingOn: "editor",
        daysUntilDue: -2,
      }),
    ]);
  });

  it("uses the due-soon window only while the editor owes work", () => {
    const ids = (
      status: RiskProject["status"],
      stageId: string,
      days: number
    ) =>
      evaluateDeadlineRisks(
        [project({ status, workflowStageId: stageId, dueDate: addDays(days) })],
        TODAY
      ).map((finding) => [finding.kind, finding.severity]);
    expect(ids("In Progress", "edit", DUE_SOON_DAYS)).toEqual([
      ["due_soon", "medium"],
    ]);
    expect(ids("In Progress", "edit", 1)).toEqual([["due_soon", "high"]]);
    expect(ids("In Progress", "edit", DUE_SOON_DAYS + 1)).toEqual([]);
    expect(ids("Review", "review", CLIENT_FEEDBACK_DAYS)).toEqual([
      ["awaiting_client", "medium"],
    ]);
    expect(ids("Review", "review", CLIENT_FEEDBACK_DAYS + 1)).toEqual([]);
  });

  it("treats an approved Review stage as editor work, not client feedback", () => {
    const [finding] = evaluateDeadlineRisks(
      [
        project({
          status: "Review",
          workflowStageId: "approved",
          dueDate: addDays(2),
        }),
      ],
      TODAY
    );
    expect(finding).toMatchObject({ kind: "due_soon", waitingOn: "editor" });
  });

  it("folds matching outputs into the Project finding and reports differing outputs", () => {
    const findings = evaluateDeadlineRisks(
      [
        project({
          dueDate: addDays(-1),
          outputs: [
            output({ id: "same", dueDate: addDays(-1) }),
            output({
              id: "client",
              reviewState: "sent_to_client",
              dueDate: addDays(4),
            }),
            output({
              id: "approved",
              reviewState: "approved",
              dueDate: addDays(-1),
            }),
            output({ id: "no-date", dueDate: undefined }),
            output({ id: "bad-date", dueDate: "next week" }),
            output({ id: "archived", archived: true, dueDate: addDays(-1) }),
          ],
        }),
      ],
      TODAY
    );
    expect(
      findings.map(({ subject, outputId, kind, relatedOutputIds }) => ({
        subject,
        outputId,
        kind,
        relatedOutputIds,
      }))
    ).toEqual([
      {
        subject: "project",
        outputId: undefined,
        kind: "overdue",
        relatedOutputIds: ["same"],
      },
      {
        subject: "output",
        outputId: "client",
        kind: "awaiting_client",
        relatedOutputIds: [],
      },
    ]);
  });

  it("rejects malformed dates for today", () => {
    expect(() => evaluateDeadlineRisks([], "10/09/2026")).toThrow("YYYY-MM-DD");
  });
});

describe("workspaceToday", () => {
  it("uses the Workspace time zone and falls back to UTC", () => {
    const now = Date.parse("2026-10-09T02:00:00Z");
    expect(workspaceToday(now, "America/Los_Angeles")).toBe("2026-10-08");
    expect(workspaceToday(now, "Not/AZone")).toBe("2026-10-09");
    expect(workspaceToday(now)).toBe("2026-10-09");
  });
});

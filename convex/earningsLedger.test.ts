import { describe, expect, it } from "vitest";
import { buildPayoutReport } from "../src/lib/payout-reporting";
import {
  buildLedger,
  groupByClient,
  groupByPeriod,
  MAX_CITED_SOURCES,
  summarize,
  validateRange,
  type LedgerBatch,
  type LedgerProject,
} from "./earningsLedger";

function project(overrides: Partial<LedgerProject> = {}): LedgerProject {
  return {
    id: "project-1",
    title: "Project",
    clientId: "client-a",
    status: "Delivered",
    workType: "Freelance",
    earnings: 0,
    paid: false,
    dueDate: "2026-08-10",
    ...overrides,
  };
}

function batch(overrides: Partial<LedgerBatch> = {}): LedgerBatch {
  return {
    id: "batch-1",
    amount: 500,
    paid: false,
    completedAt: "2026-08-12T10:00:00.000Z",
    projectIds: [],
    ...overrides,
  };
}

const projects = [
  project({
    id: "paid",
    earnings: 100,
    paid: true,
    completedAt: "2026-08-06T09:00:00.000Z",
  }),
  project({ id: "unpaid", earnings: 75, clientId: "client-b" }),
  project({
    id: "plan-work",
    earnings: 999,
    salaryPlanId: "plan" as LedgerProject["salaryPlanId"],
  }),
  project({ id: "salary-tag", earnings: 999, workType: "job / salary" }),
  project({ id: "in-progress", earnings: 300, status: "In Progress" }),
  project({
    id: "september",
    earnings: 40,
    completedAt: "2026-09-02T00:00:00.000Z",
  }),
];
const batches = [
  batch({
    id: "paid-batch",
    paid: true,
    projectIds: ["plan-work"],
    clientId: "client-a",
  }),
  batch({ id: "unpaid-batch", amount: 700, projectIds: ["salary-tag"] }),
];
const ledger = buildLedger({
  projects,
  batches,
  salaryWorkType: "Job / Salary",
});

describe("buildLedger", () => {
  it("matches the Reports page totals for the same records", () => {
    const report = buildPayoutReport({
      projects: projects.map((item) => ({
        ...item,
        profileId: "video-editing",
        startDate: "2026-08-01",
        notes: "",
        salaryPlanId: item.salaryPlanId ? String(item.salaryPlanId) : undefined,
      })),
      salaryBatches: batches.map((item, index) => ({
        id: item.id,
        number: index + 1,
        completedDate: item.completedAt,
        archived: false,
        archivedDate: "",
        amount: item.amount,
        paid: item.paid,
        projectIds: item.projectIds,
        clientId: item.clientId,
      })),
      salaryWorkType: "Job / Salary",
      salaryBatchAmount: 0,
      profileName: "Owner",
      period: "all",
    });
    expect(summarize(ledger.entries)).toMatchObject(report.money);
  });

  it("pays salary work through batches and links each salary Project to its batch", () => {
    expect(ledger.salaryProjects).toEqual([
      {
        projectId: "plan-work",
        date: "2026-08-10",
        clientId: "client-a",
        salaryBatchId: "paid-batch",
      },
      {
        projectId: "salary-tag",
        date: "2026-08-10",
        clientId: "client-a",
        salaryBatchId: "unpaid-batch",
      },
    ]);
    expect(
      ledger.entries.find((entry) => entry.sourceId === "unpaid-batch")
    ).toMatchObject({
      clientId: "client-a",
      amount: 700,
      date: "2026-08-12",
    });
  });

  it("cites the sources behind each figure and caps long lists", () => {
    expect(summarize(ledger.entries)).toEqual({
      earned: 1_415,
      collected: 600,
      outstanding: 815,
      projectCount: 3,
      salaryBatchCount: 2,
      sources: {
        projectIds: ["paid", "unpaid", "september"],
        salaryBatchIds: ["paid-batch", "unpaid-batch"],
        truncated: false,
      },
    });
    const many = Array.from({ length: MAX_CITED_SOURCES + 1 }, (_, index) => ({
      kind: "project" as const,
      sourceId: `p${index}`,
      date: "2026-08-01",
      clientId: null,
      amount: 0.1,
      paid: false,
    }));
    expect(summarize(many)).toMatchObject({
      earned: 2.6,
      projectCount: MAX_CITED_SOURCES + 1,
      sources: { truncated: true },
    });
    expect(summarize(many).sources.projectIds).toHaveLength(MAX_CITED_SOURCES);
  });
});

describe("grouping", () => {
  it("groups by Client, highest earnings first", () => {
    expect(
      groupByClient(ledger.entries).map(({ clientId, earned }) => [
        clientId,
        earned,
      ])
    ).toEqual([
      ["client-a", 1_340],
      ["client-b", 75],
    ]);
  });

  it("returns clipped calendar buckets, including empty ones", () => {
    const periods = groupByPeriod(
      ledger.entries,
      { start: "2026-07-15", end: "2026-09-30" },
      "month"
    );
    expect(
      periods.map(({ label, periodStart, periodEnd, earned }) => [
        label,
        periodStart,
        periodEnd,
        earned,
      ])
    ).toEqual([
      ["2026-07", "2026-07-15", "2026-07-31", 0],
      ["2026-08", "2026-08-01", "2026-08-31", 1_375],
      ["2026-09", "2026-09-01", "2026-09-30", 40],
    ]);
    expect(
      groupByPeriod(
        ledger.entries,
        { start: "2026-01-01", end: "2026-12-31" },
        "quarter"
      ).map((period) => period.label)
    ).toEqual(["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]);
  });

  it("rejects malformed or reversed ranges", () => {
    expect(() => validateRange({ start: "2026-8-1" })).toThrow("YYYY-MM-DD");
    expect(() =>
      validateRange({ start: "2026-09-01", end: "2026-08-01" })
    ).toThrow("on or before");
  });
});

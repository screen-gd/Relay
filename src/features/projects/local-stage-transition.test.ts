import { describe, expect, it } from "vitest";
import type { SalaryBatch, SalaryPlan, WorkItem } from "@/lib/types";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { buildPayoutReport } from "@/lib/payout-reporting";
import {
  applyLocalStageTransition,
  dashboardSalaryBatch,
  previewLocalStageTransition,
  salaryBatchProgress,
} from "./local-stage-transition";

const settings = {
  ...createDefaultSettings(),
  salaryWorkType: "Job / Salary",
  salaryBatchSize: 5,
  salaryBatchAmount: 10000,
};

const workflowStages: WorkItem["workflowStages"] = [
  { id: "planned", label: "Planned", purpose: "planned" },
  { id: "delivered", label: "Delivered", purpose: "delivered" },
];

function salaryProject(
  id: string,
  overrides: Partial<WorkItem> = {}
): WorkItem {
  return {
    id,
    profileId: "video-editor",
    title: id,
    clientId: "client-a",
    status: "Planned",
    workflowStageId: "planned",
    workflowStages,
    workType: "Job / Salary",
    startDate: "2026-09-01",
    dueDate: "2026-10-14",
    earnings: 500,
    notes: "",
    ...overrides,
  };
}

/** Delivers one Project the way the board does: preview, then apply. */
function deliver(items: WorkItem[], batches: SalaryBatch[], projectId: string) {
  const input = { projectId, stageId: "delivered" };
  const preview = previewLocalStageTransition(items, batches, settings, input);
  const applied = applyLocalStageTransition(items, batches, settings, input);
  return { preview, ...applied };
}

function reportFor(projects: WorkItem[], batches: SalaryBatch[]) {
  return buildPayoutReport({
    projects,
    salaryBatches: batches,
    salaryWorkType: settings.salaryWorkType,
    salaryBatchAmount: settings.salaryBatchAmount,
    profileName: "Editor",
    period: "all",
  });
}

describe("local delivery and salary totals", () => {
  it("shows the confirmed batch progress on the dashboard and in Reports", () => {
    const { preview, result, nextItems, nextBatches } = deliver(
      [salaryProject("flow")],
      [],
      "flow"
    );

    expect(preview).toMatchObject({ kind: "salary", progress: 1 });
    expect(result).toMatchObject({ kind: "salary", progress: 1 });
    expect(salaryBatchProgress(nextItems, nextBatches, settings)).toEqual({
      progress: 1,
      requiredProjectCount: 5,
    });
    const report = reportFor(nextItems, nextBatches);
    expect(report.deliveredProjects).toMatchObject([
      { id: "flow", isSalaryEdit: true },
    ]);
    // Salary edits are paid per completed batch, not per Project.
    expect(report.earned).toBe(0);
  });

  it("completes a batch that the dashboard and Reports both settle", () => {
    const delivered = ["a", "b", "c", "d"].map((id, index) =>
      salaryProject(id, {
        status: "Delivered",
        workflowStageId: "delivered",
        completedAt: `2026-10-0${index + 1}T00:00:00.000Z`,
      })
    );
    const { preview, result, nextItems, nextBatches } = deliver(
      [...delivered, salaryProject("e")],
      [],
      "e"
    );

    expect(preview).toMatchObject({ kind: "salary", batchCreated: true });
    expect(result).toMatchObject({ kind: "salary", batchCreated: true });
    expect(nextBatches).toHaveLength(1);
    expect(salaryBatchProgress(nextItems, nextBatches, settings).progress).toBe(
      0
    );
    expect(reportFor(nextItems, nextBatches).earned).toBe(10000);
  });

  it("counts a Payment plan Project toward its plan, not the settings batch", () => {
    const legacy = ["a", "b"].map((id) =>
      salaryProject(id, {
        status: "Delivered",
        workflowStageId: "delivered",
        completedAt: "2026-10-01T00:00:00.000Z",
      })
    );
    const { result, nextItems, nextBatches } = deliver(
      [...legacy, salaryProject("plan", { salaryPlanId: "plan-a" })],
      [],
      "plan"
    );

    expect(result).toMatchObject({ kind: "salary", progress: 1 });
    expect(salaryBatchProgress(nextItems, nextBatches, settings).progress).toBe(
      2
    );
  });
});

describe("dashboard salary batch", () => {
  const plan: SalaryPlan = {
    id: "plan-a",
    clientId: "client-a",
    requiredProjectCount: 4,
    amount: 8000,
    startDate: "2026-09-01",
    notes: "",
    archived: false,
  };
  const delivered = (id: string, overrides: Partial<WorkItem> = {}) =>
    salaryProject(id, { status: "Delivered", ...overrides });

  it("tracks a Payment plan's unsettled deliveries against the plan size", () => {
    const projects = [
      ...["a", "b", "c", "d", "e", "f"].map((id) =>
        delivered(id, { salaryPlanId: plan.id })
      ),
      salaryProject("planned", { salaryPlanId: plan.id }),
    ];
    const batches: SalaryBatch[] = [
      {
        id: "batch-1",
        number: 1,
        completedDate: "2026-10-01",
        archived: false,
        archivedDate: "",
        paid: true,
        projectIds: ["a", "b", "c", "d"],
        requiredProjectCount: 4,
        salaryPlanId: plan.id,
      },
    ];

    expect(dashboardSalaryBatch(projects, batches, [plan], settings)).toEqual({
      progress: 2,
      size: 4,
    });
  });

  it("prefers the settings batch on ties and hides with no salary work", () => {
    const projects = [
      delivered("legacy"),
      delivered("planned", { salaryPlanId: plan.id }),
    ];

    expect(dashboardSalaryBatch(projects, [], [plan], settings)).toEqual({
      progress: 1,
      size: 5,
    });
    expect(
      dashboardSalaryBatch(
        [salaryProject("client", { workType: "Client" })],
        [],
        [plan],
        settings
      )
    ).toBeNull();
  });
});

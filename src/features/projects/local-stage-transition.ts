import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import {
  getWorkflowStageStatus,
  moveProjectToStage,
  resolveProjectWorkflowStage,
} from "./project-domain";
import type { ProjectStageTransitionResult } from "./project-workflow-port";
import {
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
} from "@/features/routes/utils/work-type-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";

/**
 * Progress toward the next settings-based Payment batch: delivered personal
 * Projects of the salary work type, on no Payment plan, not yet in a batch.
 * The dashboard reads this; delivery previews count the same Projects, so the
 * confirmed "n/size" is what the dashboard shows after delivery.
 */
export function salaryBatchProgress(
  projects: readonly WorkItem[],
  batches: readonly SalaryBatch[],
  settings: Pick<SettingsState, "salaryWorkType" | "salaryBatchSize">
) {
  const requiredProjectCount = normalizedSalaryBatchSize(
    settings.salaryBatchSize
  );
  const settledIds = new Set(
    batches.flatMap((batch) => batch.projectIds ?? [])
  );
  const pending = projects.filter(
    (project) =>
      !project.teamId &&
      !project.salaryPlanId &&
      project.workType === settings.salaryWorkType &&
      isDoneStatus(project.status) &&
      !settledIds.has(project.id)
  ).length;
  return { progress: pending % requiredProjectCount, requiredProjectCount };
}

/** Delivery effect a stage move would have, computed from local state. */
export function previewLocalStageTransition(
  items: WorkItem[],
  salaryBatches: SalaryBatch[],
  settings: SettingsState,
  input: { projectId: string; stageId: string }
): ProjectStageTransitionResult {
  const project = items.find((item) => item.id === input.projectId);
  if (!project) throw new Error("Project not found");
  return getWorkflowStageStatus(project, input.stageId) === "Delivered"
    ? localDeliveryEffect(project, items, salaryBatches, settings).result
    : { kind: "none" };
}

/**
 * Applies a stage move to local state, creating a Payment batch when a
 * delivery completes one. Used by Local Mode and by signed-out cloud users.
 */
export function applyLocalStageTransition(
  items: WorkItem[],
  salaryBatches: SalaryBatch[],
  settings: SettingsState,
  input: { projectId: string; stageId: string }
): {
  nextItems: WorkItem[];
  nextBatches: SalaryBatch[];
  result: ProjectStageTransitionResult;
} {
  const project = items.find((item) => item.id === input.projectId);
  if (!project) throw new Error("Project not found");
  const stageId = resolveProjectWorkflowStage(project, input.stageId);
  const status = getWorkflowStageStatus(project, stageId);
  const changedAt = new Date().toISOString();
  const completedAt =
    status === "Delivered"
      ? project.status === "Delivered"
        ? (project.completedAt ?? changedAt)
        : changedAt
      : undefined;
  const nextItems = items.map((item) =>
    item.id === input.projectId
      ? moveProjectToStage(item, stageId, changedAt)
      : item
  );
  let nextBatches = salaryBatches;
  let result: ProjectStageTransitionResult = { kind: "none", completedAt };
  if (status === "Delivered") {
    const effect = localDeliveryEffect(
      project,
      nextItems,
      salaryBatches,
      settings
    );
    if (effect.result.kind === "client") {
      result = { ...effect.result, completedAt };
    } else {
      if (effect.result.batchCreated) {
        const number =
          salaryBatches.reduce(
            (highest, batch) => Math.max(highest, batch.number),
            0
          ) + 1;
        nextBatches = [
          ...salaryBatches,
          {
            id: `batch-${number}`,
            number,
            completedDate: changedAt.slice(0, 10),
            archived: false,
            archivedDate: "",
            amount: effect.result.amount,
            paid: false,
            paidDate: "",
            projectIds: effect.projectIds,
            requiredProjectCount: effect.result.requiredProjectCount,
            workType: project.workType,
          },
        ];
      }
      result = { ...effect.result, completedAt };
    }
  }
  return { nextItems, nextBatches, result };
}

function localDeliveryEffect(
  project: WorkItem,
  items: WorkItem[],
  batches: SalaryBatch[],
  settings: SettingsState
) {
  if (project.teamId || project.workType !== settings.salaryWorkType) {
    return {
      result: { kind: "client" as const, earned: project.earnings },
      projectIds: [],
    };
  }
  const requiredProjectCount = normalizedSalaryBatchSize(
    settings.salaryBatchSize
  );
  const settledIds = new Set(
    batches.flatMap((batch) => batch.projectIds ?? [])
  );
  // Mirrors convex/projects.ts deliveryEffect: Projects only share a batch
  // with Projects on the same Payment plan (or none).
  const contributors = items
    .filter(
      (item) =>
        !item.teamId &&
        item.workType === settings.salaryWorkType &&
        item.salaryPlanId === project.salaryPlanId &&
        (item.id === project.id || isDoneStatus(item.status)) &&
        !settledIds.has(item.id)
    )
    .sort((left, right) =>
      (left.completedAt ?? left.createdAt ?? "").localeCompare(
        right.completedAt ?? right.createdAt ?? ""
      )
    )
    .slice(0, requiredProjectCount);
  const batchCreated = contributors.length === requiredProjectCount;
  return {
    result: {
      kind: "salary" as const,
      progress: batchCreated ? 0 : contributors.length,
      requiredProjectCount,
      amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
      batchCreated,
    },
    projectIds: contributors.map((item) => item.id),
  };
}

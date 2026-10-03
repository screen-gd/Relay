import type {
  Client,
  ProjectGroup,
  SalaryPlan,
  SavedProjectTemplate,
  WorkItem,
  WorkflowStage,
} from "@/lib/types";
import {
  dueDateAfterDelivery,
  type StoredProjectStatus,
} from "@/lib/domain-values";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow-templates";
import { z } from "zod";

export type { ProjectGroup } from "@/lib/types";

export type ProjectGroupSummary = {
  projectCount: number;
  deliveredCount: number;
  progress: number;
  earned: number;
  collected: number;
  outstanding: number;
};

export const newProjectFormSchema = z.strictObject({
  name: z.string().trim().min(1, "Project name is required."),
  clientId: z.string().min(1, "Client is required."),
  projectGroupId: z.string().optional(),
  workflowTemplateId: z.string().optional(),
  dueDate: z.iso.date("Choose a valid due date."),
  financialType: z.enum(["client", "salary-plan"]),
  salaryPlanId: z.string().optional(),
});

export type NewProjectInput = z.infer<typeof newProjectFormSchema>;
export type NewProjectFormValues = z.input<typeof newProjectFormSchema>;

type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; errors: string[] };

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProjectGroup(
  input: Record<string, unknown>,
  clients: readonly Client[]
): ValidationResult<ProjectGroup> {
  const id = trimmedString(input.id);
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const teamId = trimmedString(input.teamId);
  const errors: string[] = [];

  if (!id) errors.push("Project Group id is required.");
  if (!name) errors.push("Project Group name is required.");
  if (!clientId) errors.push("Client is required.");
  else if (!clients.some((client) => client.id === clientId))
    errors.push("Client does not exist.");
  if (typeof input.archived !== "boolean")
    errors.push("Archive state is required.");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      id,
      ...(teamId ? { teamId } : {}),
      name,
      clientId,
      notes: typeof input.notes === "string" ? input.notes : "",
      archived: input.archived === true,
      createdAt: trimmedString(input.createdAt) || new Date().toISOString(),
    },
  };
}

export function normalizeProjectGroups(
  input: unknown,
  clients: readonly Client[]
): ProjectGroup[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return [];
    const result = normalizeProjectGroup(
      Object.fromEntries(Object.entries(candidate)),
      clients
    );
    return result.ok ? [result.value] : [];
  });
}

export function deriveProjectGroupSummary(
  group: ProjectGroup,
  projects: readonly WorkItem[]
): ProjectGroupSummary {
  const grouped = projects.filter(
    (project) => project.projectGroupId === group.id
  );
  const delivered = grouped.filter((project) => project.status === "Delivered");
  const earned = delivered.reduce(
    (total, project) => total + project.earnings,
    0
  );
  const collected = delivered.reduce(
    (total, project) => total + (project.paid ? project.earnings : 0),
    0
  );

  return {
    projectCount: grouped.length,
    deliveredCount: delivered.length,
    progress: grouped.length ? delivered.length / grouped.length : 0,
    earned,
    collected,
    outstanding: earned - collected,
  };
}

const newProjectFields = new Set([
  "name",
  "clientId",
  "projectGroupId",
  "workflowTemplateId",
  "dueDate",
  "financialType",
  "salaryPlanId",
]);

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validateNewProjectInput(
  input: Record<string, unknown>,
  references: {
    clients: readonly Client[];
    projectGroups: readonly ProjectGroup[];
    workflowTemplates: readonly SavedProjectTemplate[];
    salaryPlans?: readonly SalaryPlan[];
  }
): ValidationResult<NewProjectInput> {
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const projectGroupId = trimmedString(input.projectGroupId);
  const workflowTemplateId = trimmedString(input.workflowTemplateId);
  const dueDate = trimmedString(input.dueDate);
  const financialType =
    input.financialType === "client" || input.financialType === "salary-plan"
      ? input.financialType
      : undefined;
  const salaryPlanId = trimmedString(input.salaryPlanId);
  const errors = Object.keys(input)
    .filter((field) => !newProjectFields.has(field))
    .map((field) => `Unexpected field: ${field}.`);

  if (!name) errors.push("Project name is required.");
  if (
    !references.clients.some(
      (client) => client.id === clientId && !client.archived
    )
  ) {
    errors.push("Active Client does not exist.");
  }

  const group = projectGroupId
    ? references.projectGroups.find(
        (projectGroup) =>
          projectGroup.id === projectGroupId && !projectGroup.archived
      )
    : undefined;
  if (projectGroupId && !group)
    errors.push("Active Project Group does not exist.");
  else if (group && group.clientId !== clientId)
    errors.push("Project Group must belong to the selected Client.");

  if (
    workflowTemplateId &&
    !references.workflowTemplates.some(
      (item) => item.id === workflowTemplateId && !item.archived
    )
  ) {
    errors.push("Active Workflow Template does not exist.");
  }
  if (!isIsoDate(dueDate)) errors.push("Due date must be a valid ISO date.");
  if (!financialType) {
    errors.push("Financial type must be client or salary-plan.");
  }
  const salaryPlan = salaryPlanId
    ? references.salaryPlans?.find(
        (plan) => plan.id === salaryPlanId && !plan.archived
      )
    : undefined;
  const hasSalaryPlanCatalog = Boolean(references.salaryPlans?.length);
  if (salaryPlanId && hasSalaryPlanCatalog && !salaryPlan)
    errors.push("Active Payment plan does not exist.");
  if (salaryPlan && salaryPlan.clientId !== clientId)
    errors.push("Payment plan Client must match the selected Client.");
  if (hasSalaryPlanCatalog && financialType === "salary-plan" && !salaryPlanId)
    errors.push("Payment plan is required.");
  if (financialType === "client" && salaryPlanId)
    errors.push("Payment plan is only valid for Salary Projects.");

  if (errors.length || !financialType) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      clientId,
      ...(projectGroupId ? { projectGroupId } : {}),
      ...(workflowTemplateId ? { workflowTemplateId } : {}),
      dueDate,
      financialType,
      ...(salaryPlanId ? { salaryPlanId } : {}),
    },
  };
}

/** The calendar day (YYYY-MM-DD) of an ISO timestamp in the local time zone. */
export function localDateKey(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export { dueDateAfterDelivery };

export function projectStatusUpdate(
  project: WorkItem,
  status: StoredProjectStatus,
  changedAt: string
): Pick<WorkItem, "status" | "completedAt" | "dueDate"> {
  const newlyDelivered =
    status === "Delivered" && project.status !== "Delivered";
  return {
    status,
    completedAt:
      status === "Delivered"
        ? newlyDelivered
          ? changedAt
          : (project.completedAt ?? changedAt)
        : undefined,
    dueDate: newlyDelivered
      ? dueDateAfterDelivery(project.dueDate, localDateKey(changedAt))
      : project.dueDate,
  };
}

export type ProjectStageGroup = {
  key: string;
  stage: WorkflowStage;
  projects: WorkItem[];
};

function stageMatches(stage: WorkflowStage, requested: string | WorkflowStage) {
  return typeof requested === "string"
    ? stage.id === requested || stage.label === requested
    : stage.id === requested.id;
}

export function getProjectWorkflowStages(
  project: Pick<WorkItem, "workflowStages">
): WorkflowStage[] {
  const stages = project.workflowStages ?? [];
  return stages.length
    ? stages
    : DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }));
}

export function getProjectWorkflowStage(
  project: Pick<WorkItem, "workflowStageId" | "workflowStages" | "status">
): WorkflowStage {
  const stages = getProjectWorkflowStages(project);
  const currentStage = project.workflowStageId;
  const current = currentStage
    ? stages.find((stage) => stageMatches(stage, currentStage))
    : undefined;
  if (current) return current;
  if (project.status === "Delivered")
    return (
      stages.find((stage) => stage.purpose === "delivered") ??
      stages.at(-1) ??
      DEFAULT_WORKFLOW_STAGES.at(-1)!
    );
  if (project.status === "Planned")
    return (
      stages.find((stage) => stage.purpose === "planned") ??
      stages[0] ??
      DEFAULT_WORKFLOW_STAGES[0]
    );
  const exact = stages.find((stage) => stage.label === project.status);
  if (exact) return exact;
  const matchingPurpose = stages.find(
    (stage) => getWorkflowStageStatus(project, stage) === project.status
  );
  // An unmatched active project falls back to the first working stage, never
  // to a delivered stage.
  const firstWorkingStage = stages.find(
    (stage, index) => index > 0 && stage.purpose !== "delivered"
  );
  return (
    matchingPurpose ??
    firstWorkingStage ??
    stages[0] ??
    DEFAULT_WORKFLOW_STAGES[0]
  );
}

export function getProjectProgress(
  project: Pick<WorkItem, "workflowStageId" | "workflowStages" | "status">
) {
  if (project.status === "Cancelled") return 0;
  if (project.status === "Delivered") return 100;
  const stages = getProjectWorkflowStages(project);
  const current = getProjectWorkflowStage(project);
  const index = stages.findIndex((stage) => stage.id === current.id);
  return stages.length > 1
    ? Math.round((Math.max(0, index) / (stages.length - 1)) * 100)
    : 0;
}

export function getWorkflowStageStatus(
  project: Pick<WorkItem, "workflowStages">,
  stage: string | WorkflowStage
): StoredProjectStatus {
  const stages = getProjectWorkflowStages(project);
  const resolved = stages.find((candidate) => stageMatches(candidate, stage));
  if (resolved) {
    if (resolved.purpose === "delivered") return "Delivered";
    if (resolved.purpose === "planned") return "Planned";
    if (resolved.purpose === "revisions") return "Revision";
    if (resolved.purpose === "client_review" || resolved.purpose === "approved")
      return "Review";
    return "In Progress";
  }
  const normalized =
    typeof stage === "string"
      ? stage.trim().toLowerCase()
      : stage.label.trim().toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";
  if (
    normalized.includes("deliver") ||
    normalized.includes("publish") ||
    normalized.includes("export")
  )
    return "Delivered";
  if (normalized.includes("revision")) return "Revision";
  if (normalized.includes("review") || normalized.includes("approv"))
    return "Review";
  return "In Progress";
}

export function resolveProjectWorkflowStage(
  project: Pick<WorkItem, "workflowStages">,
  requestedStage: string | WorkflowStage
): string {
  const stages = getProjectWorkflowStages(project);
  const resolved = stages.find((stage) => stageMatches(stage, requestedStage));
  if (resolved) return resolved.id;
  const requestedStatus = getWorkflowStageStatus(
    { workflowStages: DEFAULT_WORKFLOW_STAGES },
    requestedStage
  );
  return (
    stages.find(
      (stage) => getWorkflowStageStatus(project, stage) === requestedStatus
    )?.id ??
    (typeof requestedStage === "string" ? requestedStage : requestedStage.id)
  );
}

/** Keeps empty columns visible and resolves merged columns to each workflow's own IDs. */
export function createProjectStageBoard(
  projects: readonly WorkItem[],
  stages?: readonly (WorkflowStage | string)[]
) {
  const workflows = projects.map(getProjectWorkflowStages);
  const available = workflows.flat();
  const currentStages = projects.map((project) =>
    project.status === "Cancelled"
      ? { id: "cancelled", label: "Cancelled", purpose: "delivered" as const }
      : getProjectWorkflowStage(project)
  );
  const selected = stages
    ? stages.flatMap((stage) => {
        if (typeof stage !== "string") return [stage];
        const resolved = available.find((candidate) =>
          stageMatches(candidate, stage)
        );
        return resolved ? [resolved] : [];
      })
    : available;
  const candidates = [...selected, ...currentStages];
  const normalize = (label: string) => label.trim().toLowerCase();
  const compareText = (left: string, right: string) =>
    left < right ? -1 : left > right ? 1 : 0;
  // Identity is transitive: an ID match can connect two otherwise different labels.
  const parents = candidates.map((_, index) => index);
  const root = (index: number): number => {
    while (parents[index] !== index) index = parents[index];
    return index;
  };
  const ids = new Map<string, number>();
  const labels = new Map<string, number>();
  candidates.forEach((stage, index) => {
    for (const match of [
      ids.get(stage.id),
      labels.get(normalize(stage.label)),
    ]) {
      if (match !== undefined) parents[root(index)] = root(match);
    }
    ids.set(stage.id, index);
    labels.set(normalize(stage.label), index);
  });
  const members = new Map<number, WorkflowStage[]>();
  candidates.forEach((stage, index) => {
    const key = root(index);
    const group = members.get(key) ?? [];
    group.push(stage);
    members.set(key, group);
  });
  const defaultRank = (stage: WorkflowStage) => {
    const index = DEFAULT_WORKFLOW_STAGES.findIndex(
      (candidate) =>
        candidate.id === stage.id ||
        normalize(candidate.label) === normalize(stage.label)
    );
    return index < 0 ? Infinity : index;
  };
  const columns = [...members.values()].map((stages) => {
    stages.sort(
      (left, right) =>
        defaultRank(left) - defaultRank(right) ||
        Number(DEFAULT_WORKFLOW_STAGES.some((stage) => stage.id === right.id)) -
          Number(
            DEFAULT_WORKFLOW_STAGES.some((stage) => stage.id === left.id)
          ) ||
        compareText(left.id, right.id) ||
        compareText(left.label, right.label)
    );
    const stage = stages[0];
    const rank = Math.min(...stages.map(defaultRank));
    return {
      key: stage.id,
      stage,
      members: stages,
      rank,
      terminal: stages.some(
        (stage) =>
          stage.purpose === "delivered" ||
          ["delivered", "cancelled", "canceled"].includes(
            normalize(stage.label)
          )
      ),
      projects: [] as WorkItem[],
    };
  });
  const byId = new Map(
    columns.flatMap((column) =>
      column.members.map((stage) => [stage.id, column] as const)
    )
  );
  const byLabel = new Map(
    columns.flatMap((column) =>
      column.members.map((stage) => [normalize(stage.label), column] as const)
    )
  );
  const columnFor = (stage: WorkflowStage) =>
    byId.get(stage.id) ?? byLabel.get(normalize(stage.label));
  const compareColumns = (
    left: (typeof columns)[number],
    right: (typeof columns)[number]
  ) =>
    Number(left.terminal) - Number(right.terminal) ||
    left.rank - right.rank ||
    compareText(left.key, right.key);
  const edges = new Map(
    columns.map((column) => [column.key, new Set<string>()])
  );
  const reaches = (
    from: string,
    target: string,
    visited = new Set<string>()
  ): boolean => {
    if (from === target) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    return [...(edges.get(from) ?? [])].some((next) =>
      reaches(next, target, visited)
    );
  };
  const addOrder = (ordered: typeof columns) => {
    for (let index = 1; index < ordered.length; index++) {
      const previous = ordered[index - 1];
      const next = ordered[index];
      if (
        previous.key !== next.key &&
        previous.terminal === next.terminal &&
        !reaches(next.key, previous.key)
      )
        edges.get(previous.key)?.add(next.key);
    }
  };
  // Default order wins conflicts. Sorted workflow constraints make cycle handling deterministic.
  addOrder(
    columns
      .filter((column) => Number.isFinite(column.rank))
      .sort(compareColumns)
  );
  const sequences = workflows.map((workflow) =>
    workflow.flatMap((stage) => {
      const column = columnFor(stage);
      return column ? [column] : [];
    })
  );
  sequences.sort((left, right) =>
    compareText(
      JSON.stringify(left.map((column) => column.key)),
      JSON.stringify(right.map((column) => column.key))
    )
  );
  sequences.forEach(addOrder);
  const remaining = new Set(columns);
  const ordered: typeof columns = [];
  while (remaining.size) {
    const next = [...remaining]
      .filter(
        (column) =>
          ![...remaining].some((other) => edges.get(other.key)?.has(column.key))
      )
      .sort(compareColumns)[0];
    remaining.delete(next);
    ordered.push(next);
  }
  projects.forEach((project, index) =>
    columnFor(currentStages[index])?.projects.push(project)
  );
  const board: ProjectStageGroup[] = ordered.map(
    ({ key, stage, projects }) => ({ key, stage, projects })
  );
  return {
    board,
    resolveMoveStage: (
      project: WorkItem,
      columnKey: string
    ): string | undefined => {
      const current = getProjectWorkflowStage(project);
      if (columnFor(current)?.key === columnKey) return current.id;
      return getProjectWorkflowStages(project).find(
        (stage) => columnFor(stage)?.key === columnKey
      )?.id;
    },
  };
}

/** Backwards-compatible grouping entry point, including an optional explicit column set. */
export function groupProjectsByStage(
  projects: readonly WorkItem[],
  stages?: readonly (WorkflowStage | string)[]
): ProjectStageGroup[] {
  return createProjectStageBoard(projects, stages).board;
}

export type ProjectStageMenuChoice = {
  stage: WorkflowStage;
  label: string;
  current: boolean;
  disabled: boolean;
  ariaLabel: string;
};

/** Produces the non-drag stage choices used by keyboard and pointer users alike. */
export function getProjectStageMenuChoices(
  project: Pick<
    WorkItem,
    "status" | "title" | "workflowStageId" | "workflowStages"
  >,
  stages: readonly (WorkflowStage | string)[] = getProjectWorkflowStages(
    project
  )
): ProjectStageMenuChoice[] {
  const availableStages = getProjectWorkflowStages(project);
  const choices = [
    ...new Map(
      stages.flatMap((stage) => {
        const resolved =
          typeof stage === "string"
            ? availableStages.find((candidate) =>
                stageMatches(candidate, stage)
              )
            : stage;
        return resolved ? [[resolved.id, resolved] as const] : [];
      })
    ),
  ].map(([, stage]) => stage);
  const currentStage = getProjectWorkflowStage({
    ...project,
    workflowStages: choices,
  });
  return choices.map((stage) => {
    const current = stage.id === currentStage.id;
    return {
      stage,
      label: stage.label,
      current,
      disabled: current,
      ariaLabel: current
        ? `${project.title}, current stage ${stage.label}`
        : `Move ${project.title} to ${stage.label}`,
    };
  });
}

export function moveProjectToStage(
  project: WorkItem,
  requestedStage: string | WorkflowStage,
  changedAt: string
): WorkItem {
  const workflowStage = resolveProjectWorkflowStage(project, requestedStage);
  const status = getWorkflowStageStatus(project, workflowStage);
  return {
    ...project,
    workflowStageId: workflowStage,
    ...projectStatusUpdate(project, status, changedAt),
  };
}

/** Delivered and cancelled work no longer competes for attention. */
export function isProjectFinished(project: Pick<WorkItem, "status">) {
  return project.status === "Delivered" || project.status === "Cancelled";
}

/** The project sits with the client, so the editor cannot act on it yet. */
export function isWaitingOnClient(
  project: Pick<WorkItem, "workflowStageId" | "workflowStages" | "status">
) {
  return (
    project.status === "Client Review" ||
    getProjectWorkflowStage(project).purpose === "client_review"
  );
}

const DUE_SOON_DAYS = 7;

function daysUntil(dueDate: string, today: string) {
  return Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000
  );
}

/**
 * Urgency order used by "Due first" on Projects and "Due soon" on the
 * dashboard. `today` is the local YYYY-MM-DD day.
 *
 * 1. Active work before finished work.
 * 2. Active work by due window: overdue, due within 7 days, later, no date.
 * 3. Inside a window, work the editor can act on before work waiting on the
 *    client.
 * 4. Overdue work shows the most recently missed deadline first; other
 *    windows show the soonest due date first.
 * 5. Finished work shows the most recent delivery first.
 */
export function compareProjectUrgency(
  left: WorkItem,
  right: WorkItem,
  today: string
) {
  const finishedOrder =
    Number(isProjectFinished(left)) - Number(isProjectFinished(right));
  if (finishedOrder) return finishedOrder;
  if (isProjectFinished(left)) {
    const finishedOn = (project: WorkItem) =>
      project.completedAt || project.dueDate || "";
    return finishedOn(right).localeCompare(finishedOn(left));
  }

  const window = (project: WorkItem) => {
    if (!project.dueDate) return 3;
    const days = daysUntil(project.dueDate, today);
    return days < 0 ? 0 : days <= DUE_SOON_DAYS ? 1 : 2;
  };
  const windowOrder = window(left) - window(right);
  if (windowOrder) return windowOrder;

  const waitingOrder =
    Number(isWaitingOnClient(left)) - Number(isWaitingOnClient(right));
  if (waitingOrder) return waitingOrder;

  const dueOrder = left.dueDate.localeCompare(right.dueDate);
  return window(left) === 0 ? -dueOrder : dueOrder;
}

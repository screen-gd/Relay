import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  projectOutputReviewStateValidator,
  storedProjectStatusValidator,
} from "./domainValidators";

/**
 * Deadline-risk rules (#79). Code decides which deadlines are at risk; an AI
 * digest may only phrase these findings later.
 *
 * Thresholds, in whole calendar days in the Workspace time zone:
 * - `overdue`: the due date has passed and the work is not done.
 * - `due_soon`: the editor still owes work and the due date is at most
 *   `DUE_SOON_DAYS` away (today counts as 0).
 * - `awaiting_client`: the work sits with the Client for review and the due
 *   date is at most `CLIENT_FEEDBACK_DAYS` away. This window is wider because
 *   late feedback still leaves revisions to do.
 * Severity is `high` when overdue or due within one day, otherwise `medium`.
 */
export const DUE_SOON_DAYS = 3;
export const CLIENT_FEEDBACK_DAYS = 5;
const HIGH_SEVERITY_DAYS = 1;

export const deadlineRiskKindValidator = v.union(
  v.literal("overdue"),
  v.literal("due_soon"),
  v.literal("awaiting_client")
);

export const deadlineRiskFindingValidator = v.object({
  kind: deadlineRiskKindValidator,
  severity: v.union(v.literal("high"), v.literal("medium")),
  waitingOn: v.union(v.literal("editor"), v.literal("client")),
  subject: v.union(v.literal("project"), v.literal("output")),
  projectId: v.string(),
  projectTitle: v.string(),
  outputId: v.optional(v.string()),
  outputTitle: v.optional(v.string()),
  /** Project status for project findings, review state for output findings. */
  state: v.union(
    storedProjectStatusValidator,
    projectOutputReviewStateValidator
  ),
  dueDate: v.string(),
  /** Negative when overdue. */
  daysUntilDue: v.number(),
  /** Outstanding Project Outputs folded into a project finding with the same kind and due date. */
  relatedOutputIds: v.array(v.string()),
});

export type DeadlineRiskFinding = Infer<typeof deadlineRiskFindingValidator>;
type RiskKind = DeadlineRiskFinding["kind"];
type WaitingOn = DeadlineRiskFinding["waitingOn"];

export type RiskOutput = Pick<
  Doc<"projectOutputs">,
  "id" | "title" | "reviewState" | "dueDate" | "archived"
>;

export type RiskProject = Pick<
  Doc<"projects">,
  | "id"
  | "title"
  | "status"
  | "dueDate"
  | "archived"
  | "workflowStageId"
  | "workflowStages"
> & { outputs: RiskOutput[] };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function dayNumber(dateKey: string) {
  if (!DATE_KEY.test(dateKey)) return null;
  const time = Date.parse(`${dateKey}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.round(time / DAY_MS);
}

/** Today's date (YYYY-MM-DD) in `timeZone`, falling back to UTC for unknown zones. */
export function workspaceToday(now: number, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

/** Who owes the next step on a Project, or null when it is finished. */
function projectWaitingOn(project: RiskProject): WaitingOn | null {
  if (project.status === "Delivered" || project.status === "Cancelled")
    return null;
  const purpose = project.workflowStages.find(
    (stage) => stage.id === project.workflowStageId
  )?.purpose;
  if (purpose === "delivered") return null;
  if (purpose) return purpose === "client_review" ? "client" : "editor";
  return project.status === "Review" || project.status === "Client Review"
    ? "client"
    : "editor";
}

/** Approved and final-delivered outputs carry no deadline risk. */
function outputWaitingOn(output: RiskOutput): WaitingOn | null {
  switch (output.reviewState) {
    case "draft":
    case "changes_requested":
      return "editor";
    case "sent_to_client":
      return "client";
    case "approved":
    case "final_delivered":
      return null;
  }
}

function classify(waitingOn: WaitingOn, days: number): RiskKind | null {
  if (days < 0) return "overdue";
  if (waitingOn === "client") {
    return days <= CLIENT_FEEDBACK_DAYS ? "awaiting_client" : null;
  }
  return days <= DUE_SOON_DAYS ? "due_soon" : null;
}

function assess(
  waitingOn: WaitingOn | null,
  dueDate: string | undefined,
  today: number
) {
  const due = dueDate ? dayNumber(dueDate) : null;
  if (!waitingOn || due === null || !dueDate) return null;
  const daysUntilDue = due - today;
  const kind = classify(waitingOn, daysUntilDue);
  if (!kind) return null;
  return {
    kind,
    severity:
      kind === "overdue" || daysUntilDue <= HIGH_SEVERITY_DAYS
        ? ("high" as const)
        : ("medium" as const),
    waitingOn,
    dueDate,
    daysUntilDue,
  };
}

/**
 * Evaluates deadline risk for Projects and their Project Outputs on `today`
 * (YYYY-MM-DD). Archived, delivered and cancelled work is ignored. Output
 * findings that match their Project's kind and due date fold into the Project
 * finding's `relatedOutputIds`. Results are sorted most urgent first.
 */
export function evaluateDeadlineRisks(
  projects: RiskProject[],
  today: string
): DeadlineRiskFinding[] {
  const todayNumber = dayNumber(today);
  if (todayNumber === null) throw new Error("Today must use YYYY-MM-DD format");
  const findings: DeadlineRiskFinding[] = [];
  for (const project of projects) {
    if (project.archived) continue;
    const projectWaiting = projectWaitingOn(project);
    if (!projectWaiting) continue;
    const projectRisk = assess(projectWaiting, project.dueDate, todayNumber);
    const projectFinding: DeadlineRiskFinding | null = projectRisk
      ? {
          ...projectRisk,
          subject: "project",
          projectId: project.id,
          projectTitle: project.title,
          state: project.status,
          relatedOutputIds: [],
        }
      : null;
    if (projectFinding) findings.push(projectFinding);
    for (const output of project.outputs) {
      if (output.archived) continue;
      const risk = assess(outputWaitingOn(output), output.dueDate, todayNumber);
      if (!risk) continue;
      if (
        projectFinding?.kind === risk.kind &&
        projectFinding.dueDate === risk.dueDate
      ) {
        projectFinding.relatedOutputIds.push(output.id);
        continue;
      }
      findings.push({
        ...risk,
        subject: "output",
        projectId: project.id,
        projectTitle: project.title,
        outputId: output.id,
        outputTitle: output.title,
        state: output.reviewState,
        relatedOutputIds: [],
      });
    }
  }
  return findings.sort(
    (a, b) =>
      a.daysUntilDue - b.daysUntilDue ||
      a.projectTitle.localeCompare(b.projectTitle) ||
      a.projectId.localeCompare(b.projectId) ||
      (a.outputId ?? "").localeCompare(b.outputId ?? "")
  );
}

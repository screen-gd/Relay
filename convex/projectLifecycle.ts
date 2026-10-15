import { ConvexError, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { projectLifecycleValidator } from "./domainValidators";
import { resolveOwnerWorkspaceEntitlements } from "./workspaceSubscriptions";
import {
  FREE_OPEN_PROJECT_LIMIT,
  OPEN_PROJECT_LIMIT_CODE,
  OPEN_PROJECT_LIMIT_MESSAGE,
} from "../shared/subscription-plans";

export type ProjectLifecycle = Infer<typeof projectLifecycleValidator>;

type LifecycleInput = Pick<
  Doc<"projects">,
  "archived" | "status" | "paid" | "earnings"
> & {
  /** Paid through a Salary Batch (a Salary Plan or the legacy salary work type). */
  salaryWork: boolean;
  /** Included in a completed Salary Batch. */
  inSalaryBatch: boolean;
};

/**
 * The one rule for where a Project lives:
 * - archived or cancelled work is history;
 * - work that is not delivered is active;
 * - delivered work stays in the live list until it is settled, then moves to
 *   history. Salary work settles when a Salary Batch includes it; client work
 *   settles when it is marked paid or has no agreed amount to collect.
 */
export function projectLifecycle(project: LifecycleInput): ProjectLifecycle {
  if (project.archived || project.status === "Cancelled") return "history";
  if (project.status !== "Delivered") return "active";
  const settled = project.salaryWork
    ? project.inSalaryBatch
    : project.paid || !(project.earnings > 0);
  return settled ? "history" : "awaiting_payment";
}

type FunctionCtx = QueryCtx | MutationCtx;

async function salaryWorkType(ctx: FunctionCtx, project: Doc<"projects">) {
  if (project.teamId) return null;
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", project.ownerUserId))
    .unique();
  return settings?.salaryWorkType ?? "Job / Salary";
}

async function inSalaryBatch(ctx: FunctionCtx, project: Doc<"projects">) {
  // Batches are listed per owner; the same scan backs Salary Batch creation.
  for await (const batch of ctx.db
    .query("projectSalaryBatches")
    .withIndex("by_ownerUserId", (q) =>
      q.eq("ownerUserId", project.ownerUserId)
    )) {
    if (batch.projectIds.includes(project.id)) return true;
  }
  return false;
}

/** Reads what `projectLifecycle` needs from the database and applies it. */
export async function resolveProjectLifecycle(
  ctx: FunctionCtx,
  project: Doc<"projects">
): Promise<ProjectLifecycle> {
  const delivered = project.status === "Delivered" && !project.archived;
  const workType = delivered ? await salaryWorkType(ctx, project) : null;
  const salaryType =
    !project.teamId &&
    (Boolean(project.salaryPlanId) ||
      (workType !== null &&
        project.workType.trim().toLowerCase() ===
          workType.trim().toLowerCase()));
  // Salary Batches are a paid feature. On Free no batch will ever include the
  // Project, so it settles on delivery instead of waiting in the live list.
  const salaryWork =
    salaryType &&
    Boolean(
      (await resolveOwnerWorkspaceEntitlements(ctx, project.ownerUserId))
        ?.capabilities.salaryPlans
    );
  return projectLifecycle({
    ...project,
    salaryWork,
    inSalaryBatch:
      delivered && salaryWork && (await inSalaryBatch(ctx, project)),
  });
}

/**
 * Recomputes a Project's lifecycle after a write. Moving a Project back into
 * active work counts against the Free limit, so reopening and unarchiving go
 * through the same check as creating.
 */
export async function syncProjectLifecycle(
  ctx: MutationCtx,
  projectDocId: Id<"projects">
) {
  const project = await ctx.db.get("projects", projectDocId);
  if (!project) return;
  const lifecycle = await resolveProjectLifecycle(ctx, project);
  if (lifecycle === project.lifecycle) return;
  if (lifecycle === "active" && project.lifecycle !== undefined)
    await requireOpenProjectCapacity(ctx, project, project._id);
  await ctx.db.patch(project._id, { lifecycle });
}

/** Projects in progress for the workspace that owns `project`, up to `limit`. */
async function openProjects(
  ctx: FunctionCtx,
  project: Pick<Doc<"projects">, "ownerUserId" | "teamId">,
  limit: number
) {
  const teamId = project.teamId;
  return teamId
    ? await ctx.db
        .query("projects")
        .withIndex("by_teamId_and_lifecycle_and_completedAt", (q) =>
          q.eq("teamId", teamId).eq("lifecycle", "active")
        )
        .take(limit)
    : await ctx.db
        .query("projects")
        .withIndex(
          "by_ownerUserId_and_teamId_and_lifecycle_and_completedAt",
          (q) =>
            q
              .eq("ownerUserId", project.ownerUserId)
              .eq("teamId", undefined)
              .eq("lifecycle", "active")
        )
        .take(limit);
}

/** The Free limit for this Project's workspace, or null when the plan is paid. */
export async function openProjectLimitFor(
  ctx: FunctionCtx,
  project: Pick<Doc<"projects">, "ownerUserId" | "teamId">
) {
  const workspaceId = project.teamId
    ? ctx.db.normalizeId("teamWorkspaces", project.teamId)
    : null;
  const ownerUserId = workspaceId
    ? ((await ctx.db.get("teamWorkspaces", workspaceId))?.ownerUserId ??
      project.ownerUserId)
    : project.ownerUserId;
  const entitlements = await resolveOwnerWorkspaceEntitlements(
    ctx,
    ownerUserId
  );
  // A workspace without a subscription row is on Free.
  return entitlements ? entitlements.openProjectLimit : FREE_OPEN_PROJECT_LIMIT;
}

/**
 * Throws when a Free workspace already has the limit of Projects in progress.
 * `exceptId` leaves out the Project being moved, so its own row is not counted.
 */
export async function requireOpenProjectCapacity(
  ctx: FunctionCtx,
  project: Pick<Doc<"projects">, "ownerUserId" | "teamId">,
  exceptId?: Id<"projects">
) {
  const limit = await openProjectLimitFor(ctx, project);
  if (limit === null) return;
  const open = await openProjects(ctx, project, limit + 1);
  const counted = open.filter(({ _id }) => _id !== exceptId).length;
  // ConvexError keeps the code and message in production, where plain Error
  // messages are redacted, so the app can explain the limit.
  if (counted >= limit)
    throw new ConvexError({
      code: OPEN_PROJECT_LIMIT_CODE,
      message: OPEN_PROJECT_LIMIT_MESSAGE,
    });
}

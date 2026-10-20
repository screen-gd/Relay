import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  evaluateDeadlineRisks,
  workspaceToday,
  type RiskProject,
} from "./deadlineRiskRules";
import { canSeeTeamProject } from "./projectAccess";
import schema from "./schema";

const WORKSPACES_PER_PAGE = 50;
const MAX_PROJECTS_PER_SOURCE = 500;
const MAX_OUTPUTS_PER_PROJECT = 50;
const MAX_OUTPUTS_PER_SCAN = 5_000;
const MAX_FINDINGS = 200;

/**
 * Cron entry point: walks every Workspace a page at a time and schedules one
 * scan per Workspace so each scan gets its own transaction budget.
 */
export const scanAll = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("teamWorkspaces")
      .paginate({ numItems: WORKSPACES_PER_PAGE, cursor });
    for (const workspace of page.page) {
      await ctx.scheduler.runAfter(0, internal.deadlineRisk.scanWorkspace, {
        workspaceId: workspace._id,
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.deadlineRisk.scanAll, {
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});

/** Active Projects in a Workspace: its team Projects plus the Owner's solo Projects. */
async function workspaceProjects(
  ctx: MutationCtx,
  workspace: Doc<"teamWorkspaces">
) {
  // `lt("awaiting_payment")` reads only work in progress, plus rows the
  // lifecycle backfill has not reached yet; the filter below covers those.
  const [team, personal] = await Promise.all([
    ctx.db
      .query("projects")
      .withIndex("by_teamId_and_lifecycle_and_completedAt", (q) =>
        q.eq("teamId", workspace._id).lt("lifecycle", "awaiting_payment")
      )
      .take(MAX_PROJECTS_PER_SOURCE + 1),
    ctx.db
      .query("projects")
      .withIndex(
        "by_ownerUserId_and_teamId_and_lifecycle_and_completedAt",
        (q) =>
          q
            .eq("ownerUserId", workspace.ownerUserId)
            .eq("teamId", undefined)
            .lt("lifecycle", "awaiting_payment")
      )
      .take(MAX_PROJECTS_PER_SOURCE + 1),
  ]);
  const truncated =
    team.length > MAX_PROJECTS_PER_SOURCE ||
    personal.length > MAX_PROJECTS_PER_SOURCE;
  const active = [
    ...team.slice(0, MAX_PROJECTS_PER_SOURCE),
    ...personal.slice(0, MAX_PROJECTS_PER_SOURCE),
  ].filter(
    (project) =>
      !project.archived &&
      project.status !== "Delivered" &&
      project.status !== "Cancelled"
  );
  return { active, truncated };
}

/**
 * Re-evaluates deadline-risk rules for one Workspace and replaces its stored
 * findings, within the MAX_* read and write limits. Writes nothing when the
 * findings are unchanged, so subscribers only re-run when the radar actually
 * moves. Used by the cron's per-Workspace scan and by `riskDigest.generate`,
 * which re-checks deadlines before drafting.
 */
export async function scanWorkspaceNow(
  ctx: MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const workspace = await ctx.db.get("teamWorkspaces", workspaceId);
  if (!workspace) return;
  const evaluatedOn = workspaceToday(Date.now(), workspace.timeZone);
  const { active, truncated: projectsTruncated } = await workspaceProjects(
    ctx,
    workspace
  );
  let outputBudget = MAX_OUTPUTS_PER_SCAN;
  let truncated = projectsTruncated;
  const riskProjects: RiskProject[] = [];
  for (const project of active) {
    if (outputBudget <= 0) {
      truncated = true;
      break;
    }
    const outputs = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId_and_archived", (q) =>
        q.eq("projectId", project.id).eq("archived", false)
      )
      .take(Math.min(MAX_OUTPUTS_PER_PROJECT, outputBudget));
    outputBudget -= outputs.length;
    riskProjects.push({ ...project, outputs });
  }
  const evaluated = evaluateDeadlineRisks(riskProjects, evaluatedOn);
  if (evaluated.length > MAX_FINDINGS) truncated = true;
  const findings = evaluated
    .slice(0, MAX_FINDINGS)
    .map((finding) => ({ ...finding, workspaceId }));

  const [existing, scan] = await Promise.all([
    ctx.db
      .query("deadlineRiskFindings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .take(MAX_FINDINGS + 1),
    ctx.db
      .query("deadlineRiskScans")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .unique(),
  ]);
  const stored = existing.map(({ _id, _creationTime, ...finding }) => finding);
  if (
    scan?.evaluatedOn === evaluatedOn &&
    scan.truncated === truncated &&
    canonical(stored) === canonical(findings)
  ) {
    return;
  }
  for (const finding of existing) await ctx.db.delete(finding._id);
  for (const finding of findings)
    await ctx.db.insert("deadlineRiskFindings", finding);
  const scanFields = {
    workspaceId,
    evaluatedOn,
    updatedAt: Date.now(),
    findingCount: findings.length,
    truncated,
  };
  if (scan) await ctx.db.replace(scan._id, scanFields);
  else await ctx.db.insert("deadlineRiskScans", scanFields);
}

/** Scheduled per Workspace by `scanAll`; see `scanWorkspaceNow`. */
export const scanWorkspace = internalMutation({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.null(),
  handler: async (ctx, { workspaceId }) => {
    await scanWorkspaceNow(ctx, workspaceId);
    return null;
  },
});

/**
 * Current deadline-risk findings for a Workspace, limited to Projects the
 * caller can see. Owners and Editors only. This is the fact source for the
 * editor-triggered AI digest: it contains no AI text. Findings whose Project
 * has since been delivered, cancelled, archived or rescheduled are dropped
 * until the next scan.
 */
export const listFindings = query({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.object({
    evaluatedOn: v.union(v.string(), v.null()),
    updatedAt: v.union(v.number(), v.null()),
    truncated: v.boolean(),
    findings: v.array(schema.doc("deadlineRiskFindings")),
  }),
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return visibleFindings(ctx, workspaceId, identity.tokenIdentifier);
  },
});

/** Throws unless `userId` is an active Owner or Editor who can view Projects. */
export async function requireRiskViewer(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string
) {
  const [workspace, member] = await Promise.all([
    ctx.db.get("teamWorkspaces", workspaceId),
    ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", workspaceId).eq("userId", userId)
      )
      .unique(),
  ]);
  if (
    !workspace ||
    !member ||
    member.status !== "active" ||
    (member.role !== "Owner" && member.role !== "Editor") ||
    !member.permissions.viewProjects
  ) {
    throw new Error("Workspace Owner or Editor access required");
  }
  return { workspace, member };
}

/**
 * Stored findings `userId` may see, most urgent first. Shared by
 * `listFindings` and the AI digest so both read the same facts.
 */
export async function visibleFindings(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string
) {
  const { workspace, member } = await requireRiskViewer(
    ctx,
    workspaceId,
    userId
  );
  const [scan, stored] = await Promise.all([
    ctx.db
      .query("deadlineRiskScans")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .unique(),
    ctx.db
      .query("deadlineRiskFindings")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .take(MAX_FINDINGS),
  ]);
  const projects = new Map<string, Doc<"projects"> | null>();
  const findings: Doc<"deadlineRiskFindings">[] = [];
  for (const finding of stored) {
    if (!projects.has(finding.projectId)) {
      projects.set(
        finding.projectId,
        await ctx.db
          .query("projects")
          .withIndex("by_projectId", (q) => q.eq("id", finding.projectId))
          .unique()
      );
    }
    const project = projects.get(finding.projectId);
    if (
      project &&
      isVisible(project, member, workspace) &&
      isStillOpen(project, finding)
    ) {
      findings.push(finding);
    }
  }
  return {
    evaluatedOn: scan?.evaluatedOn ?? null,
    updatedAt: scan?.updatedAt ?? null,
    truncated: scan?.truncated ?? false,
    findings,
  };
}

/** Key-order-independent serialization for comparing stored and new findings. */
function canonical(findings: Array<Record<string, unknown>>) {
  return JSON.stringify(
    findings.map((finding) =>
      Object.fromEntries(
        Object.entries(finding).sort(([a], [b]) => a.localeCompare(b))
      )
    )
  );
}

function isVisible(
  project: Doc<"projects">,
  member: Doc<"teamMembers">,
  workspace: Doc<"teamWorkspaces">
) {
  if (project.teamId === undefined) {
    return (
      project.ownerUserId === workspace.ownerUserId &&
      member.userId === workspace.ownerUserId
    );
  }
  return (
    project.teamId === workspace._id &&
    canSeeTeamProject(project, member, workspace.allowAllTeamProjects ?? false)
  );
}

function isStillOpen(
  project: Doc<"projects">,
  finding: Doc<"deadlineRiskFindings">
) {
  return (
    !project.archived &&
    project.status !== "Delivered" &&
    project.status !== "Cancelled" &&
    (finding.subject !== "project" || project.dueDate === finding.dueDate)
  );
}

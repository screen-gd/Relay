import { v, type ObjectType } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  buildLedger,
  earningsFigureValidator,
  groupByClient,
  groupByPeriod,
  inRange,
  MAX_CITED_SOURCES,
  periodGranularityValidator,
  summarize,
  validateRange,
  type DateRange,
} from "./earningsLedger";
import { canSeeTeamProject } from "./projectAccess";

/**
 * Typed earnings queries (#80). Each has an internal `*ForRequester` twin that
 * `earningsQaActions.ts` exposes as a model tool. Every figure carries the
 * Project and Salary Batch IDs it came from. All maths lives in
 * `earningsLedger.ts`.
 *
 * Access: active Workspace members with Finance permission (`manageFinance`,
 * defaulting to Owners). Team Projects are limited to those the caller can
 * see. The Workspace Owner's solo Projects and Salary Batches are included
 * only for the Owner, matching who can see Salary Batches today.
 */

const MAX_PROJECTS_PER_SOURCE = 500;
const MAX_BATCHES = 500;
const DEFAULT_ROWS = 50;
const MAX_ROWS = 100;

const rangeArgs = {
  workspaceId: v.id("teamWorkspaces"),
  /** Inclusive start day (YYYY-MM-DD). Omit for no lower bound. */
  start: v.optional(v.string()),
  /** Inclusive end day (YYYY-MM-DD). Omit for no upper bound. */
  end: v.optional(v.string()),
};

const contextFields = {
  currencyCode: v.string(),
  period: v.object({
    start: v.union(v.string(), v.null()),
    end: v.union(v.string(), v.null()),
  }),
  /** Whether the Owner's solo Projects and Salary Batches are included. */
  includesSoloWork: v.boolean(),
  /** True when a Project or Salary Batch read limit was reached. */
  truncated: v.boolean(),
};

/** Throws unless `userId` is an active member with Finance permission. */
export async function requireFinanceMember(
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
  if (!workspace || !member || member.status !== "active")
    throw new Error("Workspace access required");
  if (!(member.permissions.manageFinance ?? member.role === "Owner"))
    throw new Error("Finance access required");
  return { workspace, member };
}

async function callerId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

/**
 * Loads the ledger as `userId` would see it. Public queries pass the caller's
 * identity; the `*ForRequester` internal queries pass the stored AI run
 * requester so model tools never gain wider access than that editor.
 */
async function loadEarnings(
  ctx: QueryCtx,
  userId: string,
  workspaceId: Id<"teamWorkspaces">,
  range: DateRange
) {
  validateRange(range);
  const { workspace, member } = await requireFinanceMember(
    ctx,
    workspaceId,
    userId
  );
  const includesSoloWork = workspace.ownerUserId === member.userId;
  const ownerUserId = workspace.ownerUserId;

  const [teamProjects, soloProjects, batches, settings] = await Promise.all([
    member.permissions.viewProjects
      ? ctx.db
          .query("projects")
          .withIndex("by_teamId", (q) => q.eq("teamId", workspaceId))
          .take(MAX_PROJECTS_PER_SOURCE + 1)
      : [],
    includesSoloWork
      ? ctx.db
          .query("projects")
          .withIndex("by_ownerUserId_and_teamId", (q) =>
            q.eq("ownerUserId", ownerUserId).eq("teamId", undefined)
          )
          .take(MAX_PROJECTS_PER_SOURCE + 1)
      : [],
    includesSoloWork
      ? ctx.db
          .query("projectSalaryBatches")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", ownerUserId))
          .take(MAX_BATCHES + 1)
      : [],
    ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
      .unique(),
  ]);
  const truncated =
    teamProjects.length > MAX_PROJECTS_PER_SOURCE ||
    soloProjects.length > MAX_PROJECTS_PER_SOURCE ||
    batches.length > MAX_BATCHES;
  const projects = [
    ...teamProjects
      .slice(0, MAX_PROJECTS_PER_SOURCE)
      .filter((project) =>
        canSeeTeamProject(
          project,
          member,
          workspace.allowAllTeamProjects ?? false
        )
      ),
    ...soloProjects.slice(0, MAX_PROJECTS_PER_SOURCE),
  ];
  const visibleBatches = batches.slice(0, MAX_BATCHES);
  const ledger = buildLedger({
    projects,
    batches: visibleBatches,
    salaryWorkType: settings?.salaryWorkType ?? "Job / Salary",
  });
  const clientNames = new Map<string, string>();
  return {
    projects: new Map(projects.map((project) => [project.id, project])),
    batches: new Map(visibleBatches.map((batch) => [batch.id, batch])),
    entries: ledger.entries.filter((entry) => inRange(entry.date, range)),
    salaryProjects: ledger.salaryProjects.filter((entry) =>
      inRange(entry.date, range)
    ),
    context: {
      currencyCode: workspace.currencyCode ?? settings?.currencyCode ?? "USD",
      period: { start: range.start ?? null, end: range.end ?? null },
      includesSoloWork,
      truncated,
    },
    /** Current Client name, falling back to legacy settings and batch snapshots. */
    clientName: async (clientId: string | null, fallback?: string) => {
      if (!clientId) return fallback ?? "No client";
      const cached = clientNames.get(clientId);
      if (cached) return cached;
      const record = await ctx.db
        .query("clients")
        .withIndex("by_ownerUserId_and_id", (q) =>
          q.eq("ownerUserId", ownerUserId).eq("id", clientId)
        )
        .unique();
      const name =
        record?.name ??
        settings?.clients?.find((client) => client.id === clientId)?.name ??
        fallback ??
        "Unknown client";
      clientNames.set(clientId, name);
      return name;
    },
  };
}

function rowLimit(limit: number | undefined) {
  if (limit === undefined) return DEFAULT_ROWS;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ROWS)
    throw new Error(`Limit must be a whole number from 1 to ${MAX_ROWS}`);
  return limit;
}

const requesterArg = {
  /** Stored `aiRuns.requestedBy`; never taken from a client or the model. */
  requestedBy: v.string(),
};

const totalsArgs = rangeArgs;
const totalsReturns = v.object({
  ...contextFields,
  total: earningsFigureValidator,
  projects: earningsFigureValidator,
  salaryBatches: earningsFigureValidator,
  /** Delivered salary Projects in the period; they earn via Salary Batches. */
  salaryProjectCount: v.number(),
});

async function totalsFor(
  ctx: QueryCtx,
  userId: string,
  { workspaceId, ...range }: ObjectType<typeof totalsArgs>
) {
  const data = await loadEarnings(ctx, userId, workspaceId, range);
  return {
    ...data.context,
    total: summarize(data.entries),
    projects: summarize(data.entries.filter((e) => e.kind === "project")),
    salaryBatches: summarize(
      data.entries.filter((e) => e.kind === "salary_batch")
    ),
    salaryProjectCount: data.salaryProjects.length,
  };
}

/** Earned, collected and outstanding totals for a period, split by source type. */
export const totals = query({
  args: totalsArgs,
  returns: totalsReturns,
  handler: async (ctx, args) => totalsFor(ctx, await callerId(ctx), args),
});

export const totalsForRequester = internalQuery({
  args: { ...totalsArgs, ...requesterArg },
  returns: totalsReturns,
  handler: (ctx, { requestedBy, ...args }) => totalsFor(ctx, requestedBy, args),
});

const byClientArgs = {
  ...rangeArgs,
  clientId: v.optional(v.string()),
  limit: v.optional(v.number()),
};
const byClientReturns = v.object({
  ...contextFields,
  clientCount: v.number(),
  clients: v.array(
    v.object({
      ...earningsFigureValidator.fields,
      clientId: v.union(v.string(), v.null()),
      clientName: v.string(),
    })
  ),
});

async function byClientFor(
  ctx: QueryCtx,
  userId: string,
  { workspaceId, clientId, limit, ...range }: ObjectType<typeof byClientArgs>
) {
  const data = await loadEarnings(ctx, userId, workspaceId, range);
  const groups = groupByClient(
    clientId === undefined
      ? data.entries
      : data.entries.filter((entry) => entry.clientId === clientId)
  );
  const clients = [];
  for (const group of groups.slice(0, rowLimit(limit))) {
    clients.push({
      ...group,
      clientName: await data.clientName(group.clientId),
    });
  }
  return { ...data.context, clientCount: groups.length, clients };
}

/** Earnings per Client for a period, highest first. */
export const byClient = query({
  args: byClientArgs,
  returns: byClientReturns,
  handler: async (ctx, args) => byClientFor(ctx, await callerId(ctx), args),
});

export const byClientForRequester = internalQuery({
  args: { ...byClientArgs, ...requesterArg },
  returns: byClientReturns,
  handler: (ctx, { requestedBy, ...args }) =>
    byClientFor(ctx, requestedBy, args),
});

const byPeriodArgs = {
  workspaceId: v.id("teamWorkspaces"),
  start: v.string(),
  end: v.string(),
  granularity: periodGranularityValidator,
};
const byPeriodReturns = v.object({
  ...contextFields,
  periods: v.array(
    v.object({
      ...earningsFigureValidator.fields,
      label: v.string(),
      periodStart: v.string(),
      periodEnd: v.string(),
    })
  ),
});

async function byPeriodFor(
  ctx: QueryCtx,
  userId: string,
  { workspaceId, granularity, start, end }: ObjectType<typeof byPeriodArgs>
) {
  const data = await loadEarnings(ctx, userId, workspaceId, { start, end });
  return {
    ...data.context,
    periods: groupByPeriod(data.entries, { start, end }, granularity),
  };
}

/** Earnings per calendar month, quarter or year across a bounded range. */
export const byPeriod = query({
  args: byPeriodArgs,
  returns: byPeriodReturns,
  handler: async (ctx, args) => byPeriodFor(ctx, await callerId(ctx), args),
});

export const byPeriodForRequester = internalQuery({
  args: { ...byPeriodArgs, ...requesterArg },
  returns: byPeriodReturns,
  handler: (ctx, { requestedBy, ...args }) =>
    byPeriodFor(ctx, requestedBy, args),
});

const byProjectArgs = byClientArgs;
const byProjectReturns = v.object({
  ...contextFields,
  projectCount: v.number(),
  projects: v.array(
    v.object({
      projectId: v.string(),
      title: v.string(),
      clientId: v.union(v.string(), v.null()),
      clientName: v.string(),
      date: v.string(),
      kind: v.union(v.literal("project"), v.literal("salary_project")),
      amount: v.number(),
      paid: v.boolean(),
      salaryBatchId: v.union(v.string(), v.null()),
    })
  ),
});

async function byProjectFor(
  ctx: QueryCtx,
  userId: string,
  { workspaceId, clientId, limit, ...range }: ObjectType<typeof byProjectArgs>
) {
  const data = await loadEarnings(ctx, userId, workspaceId, range);
  const rows = [
    ...data.entries
      .filter((entry) => entry.kind === "project")
      .map((entry) => ({
        projectId: entry.sourceId,
        clientId: entry.clientId,
        date: entry.date,
        kind: "project" as const,
        amount: entry.amount,
        paid: entry.paid,
        salaryBatchId: null,
      })),
    ...data.salaryProjects.map((entry) => ({
      projectId: entry.projectId,
      clientId: entry.clientId || null,
      date: entry.date,
      kind: "salary_project" as const,
      amount: 0,
      paid: entry.salaryBatchId
        ? (data.batches.get(entry.salaryBatchId)?.paid ?? false)
        : false,
      salaryBatchId: entry.salaryBatchId,
    })),
  ]
    .filter((row) => clientId === undefined || row.clientId === clientId)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.projectId.localeCompare(b.projectId)
    );
  const projects = [];
  for (const row of rows.slice(0, rowLimit(limit))) {
    projects.push({
      ...row,
      title: data.projects.get(row.projectId)?.title ?? row.projectId,
      clientName: await data.clientName(row.clientId),
    });
  }
  return { ...data.context, projectCount: rows.length, projects };
}

/**
 * Delivered Projects in a period, newest first. Salary Projects show amount 0
 * and the Salary Batch that pays for them, if it has completed.
 */
export const byProject = query({
  args: byProjectArgs,
  returns: byProjectReturns,
  handler: async (ctx, args) => byProjectFor(ctx, await callerId(ctx), args),
});

export const byProjectForRequester = internalQuery({
  args: { ...byProjectArgs, ...requesterArg },
  returns: byProjectReturns,
  handler: (ctx, { requestedBy, ...args }) =>
    byProjectFor(ctx, requestedBy, args),
});

const bySalaryBatchArgs = byClientArgs;
const bySalaryBatchReturns = v.object({
  ...contextFields,
  salaryBatchCount: v.number(),
  salaryBatches: v.array(
    v.object({
      salaryBatchId: v.string(),
      number: v.number(),
      date: v.string(),
      amount: v.number(),
      paid: v.boolean(),
      clientId: v.union(v.string(), v.null()),
      clientName: v.string(),
      projectCount: v.number(),
      /** First `MAX_CITED_SOURCES` Projects that completed the batch. */
      projectIds: v.array(v.string()),
    })
  ),
});

async function bySalaryBatchFor(
  ctx: QueryCtx,
  userId: string,
  {
    workspaceId,
    clientId,
    limit,
    ...range
  }: ObjectType<typeof bySalaryBatchArgs>
) {
  const data = await loadEarnings(ctx, userId, workspaceId, range);
  const rows = data.entries
    .filter(
      (entry) =>
        entry.kind === "salary_batch" &&
        (clientId === undefined || entry.clientId === clientId)
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.sourceId.localeCompare(a.sourceId)
    );
  const salaryBatches = [];
  for (const entry of rows.slice(0, rowLimit(limit))) {
    const batch = data.batches.get(entry.sourceId);
    const projectIds = batch?.projectIds ?? [];
    salaryBatches.push({
      salaryBatchId: entry.sourceId,
      number: batch?.number ?? 0,
      date: entry.date,
      amount: entry.amount,
      paid: entry.paid,
      clientId: entry.clientId,
      clientName: await data.clientName(entry.clientId, batch?.clientName),
      projectCount: projectIds.length,
      projectIds: projectIds.slice(0, MAX_CITED_SOURCES),
    });
  }
  return { ...data.context, salaryBatchCount: rows.length, salaryBatches };
}

/** Completed Salary Batches in a period, newest first. Owner only in practice. */
export const bySalaryBatch = query({
  args: bySalaryBatchArgs,
  returns: bySalaryBatchReturns,
  handler: async (ctx, args) =>
    bySalaryBatchFor(ctx, await callerId(ctx), args),
});

export const bySalaryBatchForRequester = internalQuery({
  args: { ...bySalaryBatchArgs, ...requesterArg },
  returns: bySalaryBatchReturns,
  handler: (ctx, { requestedBy, ...args }) =>
    bySalaryBatchFor(ctx, requestedBy, args),
});

import { calculateRateLimit, RateLimiter } from "@convex-dev/rate-limiter";
import type { FunctionReference } from "convex/server";
import { v, type Infer } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { aiCompletionValidator, aiFailureCodeValidator } from "./aiValidators";
import { requireProjectVisibility } from "./projectAccess";
import schema from "./schema";
import { resolveWorkspaceEntitlements } from "./workspaceSubscriptions";

const rateLimiter = new RateLimiter(components.rateLimiter);
const MONTHLY_METER_CAPACITY = 1_000_000;
const MAX_JSON_BYTES = 64_000;
const RUN_TIMEOUT_MS = 10 * 60_000;

function monthWindow(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Month must use YYYY-MM format");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  if (year < 2000 || year > 9999) throw new Error("Invalid AI usage month");
  return {
    start: Date.UTC(year, monthNumber - 1, 1),
    end: Date.UTC(year, monthNumber, 1),
  };
}

async function workspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string
) {
  const workspace = await ctx.db.get(workspaceId);
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", workspaceId).eq("userId", userId)
    )
    .unique();
  if (!workspace || !member || member.status !== "active") {
    throw new Error("Workspace access required");
  }
  return { workspace, member };
}

async function authenticatedMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return {
    ...(await workspaceMember(ctx, workspaceId, identity.tokenIdentifier)),
    userId: identity.tokenIdentifier,
  };
}

export async function requireAiEditor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string,
  projectId?: string
) {
  const { workspace, member } = await workspaceMember(ctx, workspaceId, userId);
  if (member.role !== "Owner" && member.role !== "Editor") {
    throw new Error("Only Workspace Owners and Editors can run AI");
  }
  if (projectId) {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", projectId))
      .unique();
    if (
      !project ||
      (project.teamId
        ? project.teamId !== workspaceId
        : project.ownerUserId !== workspace.ownerUserId ||
          member.role !== "Owner") ||
      !member.permissions.editProjects
    ) {
      throw new Error("Project access required");
    }
    await requireProjectVisibility(ctx, project, member);
  }
  return workspace;
}

async function monthlyUsage(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  month: string
) {
  const { start, end } = monthWindow(month);
  const options = {
    key: `${workspaceId}:${month}`,
    config: {
      kind: "fixed window" as const,
      rate: MONTHLY_METER_CAPACITY,
      capacity: MONTHLY_METER_CAPACITY,
      period: end - start,
      start,
    },
  };
  const state = await rateLimiter.getValue(ctx, "monthlyAiRuns", options);
  const { value } = calculateRateLimit(state, options.config, start, 0);
  const entitlement = await resolveWorkspaceEntitlements(ctx, workspaceId);
  const limit =
    entitlement.plan === "free"
      ? 10
      : entitlement.plan === "creator"
        ? 300
        : Math.min(
            MONTHLY_METER_CAPACITY,
            300 * entitlement.editorSeatAllowance
          );
  const used = MONTHLY_METER_CAPACITY - value;
  return { options, limit, used, remaining: Math.max(0, limit - used), end };
}

export const getSummary = query({
  args: { workspaceId: v.id("teamWorkspaces"), month: v.string() },
  returns: v.object({
    enabled: v.boolean(),
    canManage: v.boolean(),
    month: v.string(),
    limit: v.number(),
    used: v.number(),
    remaining: v.number(),
    resetsAt: v.number(),
  }),
  handler: async (ctx, { workspaceId, month }) => {
    const { workspace, member, userId } = await authenticatedMember(
      ctx,
      workspaceId
    );
    const usage = await monthlyUsage(ctx, workspaceId, month);
    return {
      enabled: workspace.aiEnabled ?? false,
      canManage: member.role === "Owner" && workspace.ownerUserId === userId,
      month,
      limit: usage.limit,
      used: usage.used,
      remaining: usage.remaining,
      resetsAt: usage.end,
    };
  },
});

export const setEnabled = mutation({
  args: { workspaceId: v.id("teamWorkspaces"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { workspaceId, enabled }) => {
    const { workspace, member, userId } = await authenticatedMember(
      ctx,
      workspaceId
    );
    if (member.role !== "Owner" || workspace.ownerUserId !== userId) {
      throw new Error("Only the Workspace Owner can change AI consent");
    }
    await ctx.db.patch(workspaceId, { aiEnabled: enabled });
    return null;
  },
});

type AiRunRequest = {
  workspaceId: Id<"teamWorkspaces">;
  projectId?: string;
  feature: string;
  promptVersion: string;
  modelTier: Doc<"aiRuns">["modelTier"];
  inputJson: string;
  sourceIds: string[];
  // Stable content identity when input holds a temporary storage reference.
  dedupeInputJson?: string;
};

export async function enqueueAiRun(
  ctx: MutationCtx,
  request: AiRunRequest,
  worker: FunctionReference<
    "action",
    "internal",
    { runId: Id<"aiRuns">; inputJson: string }
  >
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const workspace = await requireAiEditor(
    ctx,
    request.workspaceId,
    identity.tokenIdentifier,
    request.projectId
  );
  if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
  if (
    !request.feature.trim() ||
    request.feature.length > 80 ||
    !request.promptVersion.trim() ||
    request.promptVersion.length > 80 ||
    request.sourceIds.length > 100 ||
    request.sourceIds.some((source) => !source || source.length > 200) ||
    new TextEncoder().encode(request.inputJson).byteLength > MAX_JSON_BYTES ||
    (request.dedupeInputJson !== undefined &&
      new TextEncoder().encode(request.dedupeInputJson).byteLength >
        MAX_JSON_BYTES)
  ) {
    throw new Error("Invalid AI request");
  }
  JSON.parse(request.inputJson);
  const hashInput = JSON.stringify([
    request.feature,
    request.promptVersion,
    request.modelTier,
    request.projectId ?? null,
    request.sourceIds,
    request.dedupeInputJson ?? request.inputJson,
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(hashInput)
  );
  const requestHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const existing = await ctx.db
    .query("aiRuns")
    .withIndex("by_workspaceId_and_requestedBy_and_requestHash", (q) =>
      q
        .eq("workspaceId", request.workspaceId)
        .eq("requestedBy", identity.tokenIdentifier)
        .eq("requestHash", requestHash)
    )
    .order("desc")
    .first();
  if (existing && existing.status !== "failed") {
    return { runId: existing._id, reused: true };
  }
  const month = new Date().toISOString().slice(0, 7);
  const usage = await monthlyUsage(ctx, request.workspaceId, month);
  if (!usage.remaining) throw new Error("Monthly AI run quota reached");
  await rateLimiter.limit(ctx, "monthlyAiRuns", {
    ...usage.options,
    throws: true,
  });
  const runId = await ctx.db.insert("aiRuns", {
    workspaceId: request.workspaceId,
    requestedBy: identity.tokenIdentifier,
    ...(request.projectId ? { projectId: request.projectId } : {}),
    feature: request.feature,
    promptVersion: request.promptVersion,
    modelTier: request.modelTier,
    requestHash,
    sourceIds: request.sourceIds,
    month,
    status: "queued",
  });
  await ctx.scheduler.runAfter(0, worker, {
    runId,
    inputJson: request.inputJson,
  });
  await ctx.scheduler.runAfter(RUN_TIMEOUT_MS, internal.aiRuns.expire, {
    runId,
  });
  return { runId, reused: false };
}

export const claim = internalMutation({
  args: { runId: v.id("aiRuns") },
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "queued") return false;
    let failureCode: "disabled" | "access_revoked" | undefined;
    try {
      const workspace = await requireAiEditor(
        ctx,
        run.workspaceId,
        run.requestedBy,
        run.projectId
      );
      if (!workspace.aiEnabled) failureCode = "disabled";
    } catch {
      failureCode = "access_revoked";
    }
    if (failureCode) {
      await ctx.db.patch(runId, {
        status: "failed",
        failureCode,
        completedAt: Date.now(),
      });
      return false;
    }
    await ctx.db.patch(runId, { status: "running", startedAt: Date.now() });
    return true;
  },
});

export async function completeAiRun(
  ctx: MutationCtx,
  { runId, ...result }: Infer<typeof aiCompletionValidator>
) {
  const run = await ctx.db.get(runId);
  if (!run || run.status !== "running") return false;
  if (
    !Number.isSafeInteger(result.inputTokens) ||
    result.inputTokens < 0 ||
    !Number.isSafeInteger(result.outputTokens) ||
    result.outputTokens < 0 ||
    (result.costUsd !== undefined &&
      (!Number.isFinite(result.costUsd) || result.costUsd < 0)) ||
    !result.modelId.trim() ||
    result.modelId.length > 120 ||
    new TextEncoder().encode(result.outputJson).byteLength > MAX_JSON_BYTES
  ) {
    throw new Error("Invalid AI result metadata");
  }
  JSON.parse(result.outputJson);
  await ctx.db.patch(runId, {
    ...result,
    status: "succeeded",
    completedAt: Date.now(),
  });
  return true;
}

export const complete = internalMutation({
  args: aiCompletionValidator.fields,
  returns: v.boolean(),
  handler: completeAiRun,
});

export const fail = internalMutation({
  args: { runId: v.id("aiRuns"), failureCode: aiFailureCodeValidator },
  returns: v.boolean(),
  handler: async (ctx, { runId, failureCode }) => {
    const run = await ctx.db.get(runId);
    if (!run || (run.status !== "queued" && run.status !== "running"))
      return false;
    await ctx.db.patch(runId, {
      status: "failed",
      failureCode,
      completedAt: Date.now(),
    });
    return true;
  },
});

export const expire = internalMutation({
  args: { runId: v.id("aiRuns") },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (
      run &&
      (run.status === "queued" || run.status === "running") &&
      Date.now() >= run._creationTime + RUN_TIMEOUT_MS
    ) {
      await ctx.db.patch(runId, {
        status: "failed",
        failureCode: "timed_out",
        completedAt: Date.now(),
      });
    }
    return null;
  },
});

export const getRun = query({
  args: { runId: v.id("aiRuns") },
  returns: v.union(v.null(), schema.doc("aiRuns")),
  handler: async (ctx, { runId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const run = await ctx.db.get(runId);
    if (!run) return null;
    if (run.requestedBy !== identity.tokenIdentifier)
      throw new Error("AI run access required");
    await requireAiEditor(
      ctx,
      run.workspaceId,
      identity.tokenIdentifier,
      run.projectId
    );
    return run;
  },
});

export const getExecution = internalQuery({
  args: { runId: v.id("aiRuns") },
  returns: v.union(v.null(), schema.doc("aiRuns")),
  handler: async (ctx, { runId }) => ctx.db.get(runId),
});

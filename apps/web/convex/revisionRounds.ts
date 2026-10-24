import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireProjectAccess } from "./projectAccess";
import {
  adjustmentFor,
  checkIncludedRounds,
  checkRate,
  correctedRounds,
  countOutputRounds,
  resolveIncludedRounds,
  resolveRoundBasis,
  scopeExtraRounds,
} from "./revisionRoundsRules";
import { roundBasisValidator } from "./changeOrdersValidators";

/** Outputs counted per Project; more are reported as truncated. */
export const MAX_COUNTED_OUTPUTS = 20;
const MAX_TEMPLATE_LIMITS = 100;

const nullableNumber = v.union(v.number(), v.null());

/**
 * Active Workspace membership, and whether the caller is the Workspace Owner
 * (same check as AI consent). Only the Owner sets defaults and rates.
 */
async function workspaceRole(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string
) {
  const [workspace, member] = await Promise.all([
    ctx.db.get(workspaceId),
    ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", workspaceId).eq("userId", userId)
      )
      .unique(),
  ]);
  const active = workspace && member?.status === "active" ? member : null;
  return {
    member: active,
    isOwner: active?.role === "Owner" && workspace?.ownerUserId === userId,
  };
}

/** Workspace whose scope settings apply to a Project. */
async function projectWorkspace(
  ctx: QueryCtx | MutationCtx,
  project: Doc<"projects">
) {
  if (project.teamId) {
    const id = ctx.db.normalizeId("teamWorkspaces", project.teamId);
    return id ? ctx.db.get(id) : null;
  }
  return ctx.db
    .query("teamWorkspaces")
    .withIndex("by_ownerUserId", (q) =>
      q.eq("ownerUserId", project.ownerUserId)
    )
    .unique();
}

/**
 * Project access for revision scope. Anyone who can view the Project sees
 * round counts; only Owners and Editors with edit permission change them.
 */
export async function revisionScopeAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: string,
  edit = false
) {
  const access = await requireProjectAccess(
    ctx,
    projectId,
    edit ? "editProjects" : "viewProjects"
  );
  const canEdit =
    !access.membership ||
    (access.membership.permissions.editProjects === true &&
      ["Owner", "Editor"].includes(access.membership.role));
  if (edit && !canEdit)
    throw new Error("Only Owners and Editors can change revision scope");
  return {
    ...access,
    canEdit,
    workspace: await projectWorkspace(ctx, access.project),
  };
}

async function scopeSettings(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces"> | undefined
) {
  return workspaceId
    ? ctx.db
        .query("revisionScopeSettings")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
        .unique()
    : null;
}

/**
 * Computes round counts, the included-rounds limit and saved rates for a
 * Project from stored versions, client comments and editor corrections.
 */
export async function loadRoundSummary(
  ctx: QueryCtx | MutationCtx,
  project: Doc<"projects">,
  workspace: Doc<"teamWorkspaces"> | null
) {
  const [projectScope, templateLimit, settings, corrections, outputs, owner] =
    await Promise.all([
      ctx.db
        .query("projectRevisionScopes")
        .withIndex("by_projectId", (q) => q.eq("projectId", project.id))
        .unique(),
      workspace && project.templateId
        ? ctx.db
            .query("revisionTemplateLimits")
            .withIndex("by_workspaceId_and_templateId", (q) =>
              q
                .eq("workspaceId", workspace._id)
                .eq("templateId", project.templateId ?? "")
            )
            .unique()
        : null,
      scopeSettings(ctx, workspace?._id),
      ctx.db
        .query("revisionRoundCorrections")
        .withIndex("by_projectId", (q) => q.eq("projectId", project.id))
        .take(200),
      ctx.db
        .query("projectOutputs")
        .withIndex("by_projectId_and_archived", (q) =>
          q.eq("projectId", project.id).eq("archived", false)
        )
        .take(MAX_COUNTED_OUTPUTS + 1),
      workspace?.currencyCode
        ? null
        : ctx.db
            .query("settings")
            .withIndex("by_userId", (q) => q.eq("userId", project.ownerUserId))
            .unique(),
    ]);
  const limit = resolveIncludedRounds({
    project: projectScope?.includedRounds,
    template: templateLimit?.includedRounds,
    workspace: settings?.defaultIncludedRounds,
  });
  const basis = resolveRoundBasis({
    project: projectScope?.roundBasis,
    workspace: settings?.roundBasis,
  });
  const adjustments = new Map(
    corrections.map((row) => [row.outputId, row.adjustment])
  );
  const counted = await Promise.all(
    outputs.slice(0, MAX_COUNTED_OUTPUTS).map(async (output) => {
      const versions = await ctx.db
        .query("projectMediaVersions")
        .withIndex("by_outputId_and_versionNumber", (q) =>
          q.eq("outputId", output._id)
        )
        .take(100);
      const roundVersions = await Promise.all(
        versions.map(async (version) => {
          const first = await ctx.db
            .query("mediaVersionComments")
            .withIndex("by_mediaVersionId", (q) =>
              q.eq("mediaVersionId", version._id)
            )
            .first();
          return {
            versionNumber: version.versionNumber,
            createdAt: version.createdAt,
            firstFeedbackAt: first?.createdAt ?? null,
          };
        })
      );
      const rounds = countOutputRounds(roundVersions);
      const adjustment = adjustments.get(output._id) ?? 0;
      const roundsUsed = correctedRounds(rounds.computed, adjustment);
      return {
        outputDocId: output._id,
        outputId: output.id,
        title: output.title,
        computed: rounds.computed,
        closingVersions: rounds.closingVersions,
        openRound: rounds.openRound,
        adjustment,
        roundsUsed,
        /** Newest two versions, whose revision items are change-order context. */
        recentVersionIds: versions.slice(-2).map((version) => version._id),
      };
    })
  );
  const extra = scopeExtraRounds(
    basis.roundBasis,
    counted.map((output) => output.roundsUsed),
    limit.includedRounds
  );
  return {
    ...limit,
    roundBasis: basis.roundBasis,
    basisSource: basis.source,
    outputs: counted.map((output, index) => ({
      ...output,
      /** Always 0 per project, where only the Project total is billable. */
      extraRounds: extra.perOutput[index],
    })),
    roundsUsed: counted.reduce((sum, output) => sum + output.roundsUsed, 0),
    extraRounds: extra.total,
    truncated: outputs.length > MAX_COUNTED_OUTPUTS,
    currencyCode: workspace?.currencyCode ?? owner?.currencyCode ?? "USD",
    extraRoundRate: settings?.extraRoundRate ?? null,
    extraHourRate: settings?.extraHourRate ?? null,
  };
}

/**
 * Round counts and scope for the Project overview. Rates only for editors.
 * Null when the Project is not stored in Convex or not visible to the caller.
 */
export const getSummary = query({
  args: { projectId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      canEdit: v.boolean(),
      aiEnabled: v.boolean(),
      includedRounds: nullableNumber,
      limitSource: v.union(
        v.literal("project"),
        v.literal("template"),
        v.literal("workspace"),
        v.null()
      ),
      roundBasis: roundBasisValidator,
      basisSource: v.union(
        v.literal("project"),
        v.literal("workspace"),
        v.literal("default")
      ),
      roundsUsed: v.number(),
      extraRounds: v.number(),
      truncated: v.boolean(),
      currencyCode: v.string(),
      extraRoundRate: nullableNumber,
      extraHourRate: nullableNumber,
      outputs: v.array(
        v.object({
          outputId: v.string(),
          title: v.string(),
          computed: v.number(),
          adjustment: v.number(),
          roundsUsed: v.number(),
          extraRounds: v.number(),
          openRound: v.boolean(),
          closingVersions: v.array(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, { projectId }) => {
    const access = await revisionScopeAccess(ctx, projectId).catch(() => null);
    if (!access) return null;
    const { project, workspace, canEdit } = access;
    const summary = await loadRoundSummary(ctx, project, workspace);
    return {
      canEdit,
      aiEnabled: workspace?.aiEnabled ?? false,
      includedRounds: summary.includedRounds,
      limitSource: summary.source,
      roundBasis: summary.roundBasis,
      basisSource: summary.basisSource,
      roundsUsed: summary.roundsUsed,
      extraRounds: summary.extraRounds,
      truncated: summary.truncated,
      currencyCode: summary.currencyCode,
      extraRoundRate: canEdit ? summary.extraRoundRate : null,
      extraHourRate: canEdit ? summary.extraHourRate : null,
      outputs: summary.outputs.map((output) => ({
        outputId: output.outputId,
        title: output.title,
        computed: output.computed,
        adjustment: output.adjustment,
        roundsUsed: output.roundsUsed,
        extraRounds: output.extraRounds,
        openRound: output.openRound,
        closingVersions: output.closingVersions,
      })),
    };
  },
});

/**
 * Sets or clears (null) the Project's included rounds and, when given, its
 * round basis. Omitting `roundBasis` keeps the current choice; null falls
 * back to the Workspace default.
 */
export const setProjectLimit = mutation({
  args: {
    projectId: v.string(),
    includedRounds: nullableNumber,
    roundBasis: v.optional(v.union(roundBasisValidator, v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, includedRounds, roundBasis }) => {
    const { identity } = await revisionScopeAccess(ctx, projectId, true);
    const existing = await ctx.db
      .query("projectRevisionScopes")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .unique();
    const fields = {
      projectId,
      includedRounds:
        includedRounds === null
          ? undefined
          : checkIncludedRounds(includedRounds),
      roundBasis:
        roundBasis === undefined
          ? existing?.roundBasis
          : (roundBasis ?? undefined),
      updatedBy: identity.tokenIdentifier,
      updatedAt: Date.now(),
    };
    if (
      fields.includedRounds === undefined &&
      fields.roundBasis === undefined
    ) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) await ctx.db.replace(existing._id, fields);
    else await ctx.db.insert("projectRevisionScopes", fields);
    return null;
  },
});

/**
 * Corrects one output's round count to `rounds`, stored as an adjustment so
 * later rounds still add to it. Null removes the correction.
 */
export const correctRounds = mutation({
  args: { projectId: v.string(), outputId: v.string(), rounds: nullableNumber },
  returns: v.null(),
  handler: async (ctx, { projectId, outputId, rounds }) => {
    const { identity, project, workspace } = await revisionScopeAccess(
      ctx,
      projectId,
      true
    );
    const summary = await loadRoundSummary(ctx, project, workspace);
    const output = summary.outputs.find((row) => row.outputId === outputId);
    if (!output) throw new Error("Project Output not found");
    const existing = await ctx.db
      .query("revisionRoundCorrections")
      .withIndex("by_outputId", (q) => q.eq("outputId", output.outputDocId))
      .unique();
    const adjustment =
      rounds === null ? 0 : adjustmentFor(output.computed, rounds);
    if (adjustment === 0) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    const fields = {
      projectId,
      outputId: output.outputDocId,
      adjustment,
      updatedBy: identity.tokenIdentifier,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("revisionRoundCorrections", fields);
    return null;
  },
});

const templateLimit = v.object({
  templateId: v.string(),
  includedRounds: v.number(),
});

/**
 * Workspace defaults and saved rates; null for anyone but Owners and Editors.
 * `canManage` is true only for the Workspace Owner.
 */
export const getWorkspaceSettings = query({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.union(
    v.null(),
    v.object({
      canManage: v.boolean(),
      defaultIncludedRounds: nullableNumber,
      roundBasis: roundBasisValidator,
      extraRoundRate: nullableNumber,
      extraHourRate: nullableNumber,
      templateLimits: v.array(templateLimit),
    })
  ),
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { member, isOwner } = await workspaceRole(
      ctx,
      workspaceId,
      identity.tokenIdentifier
    );
    if (!member || !["Owner", "Editor"].includes(member.role)) return null;
    const [settings, limits] = await Promise.all([
      scopeSettings(ctx, workspaceId),
      ctx.db
        .query("revisionTemplateLimits")
        .withIndex("by_workspaceId_and_templateId", (q) =>
          q.eq("workspaceId", workspaceId)
        )
        .take(MAX_TEMPLATE_LIMITS),
    ]);
    return {
      canManage: isOwner,
      defaultIncludedRounds: settings?.defaultIncludedRounds ?? null,
      roundBasis: settings?.roundBasis ?? "per_output",
      extraRoundRate: settings?.extraRoundRate ?? null,
      extraHourRate: settings?.extraHourRate ?? null,
      templateLimits: limits.map(({ templateId, includedRounds }) => ({
        templateId,
        includedRounds,
      })),
    };
  },
});

/**
 * Saves Workspace defaults, round basis, rates and per-template limits. Only
 * the Workspace Owner may, because the rates are billed amounts. Null clears
 * a value; a null round basis means per output.
 */
export const saveWorkspaceSettings = mutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    defaultIncludedRounds: nullableNumber,
    roundBasis: v.union(roundBasisValidator, v.null()),
    extraRoundRate: nullableNumber,
    extraHourRate: nullableNumber,
    templateLimits: v.array(
      v.object({ templateId: v.string(), includedRounds: nullableNumber })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { isOwner } = await workspaceRole(
      ctx,
      args.workspaceId,
      identity.tokenIdentifier
    );
    if (!isOwner)
      throw new Error(
        "Only the Workspace Owner can change revision defaults and rates"
      );
    if (args.templateLimits.length > MAX_TEMPLATE_LIMITS)
      throw new Error(`Up to ${MAX_TEMPLATE_LIMITS} template limits`);
    const optional = <T>(value: T | null, check: (value: T) => T) =>
      value === null ? undefined : check(value);
    const fields = {
      workspaceId: args.workspaceId,
      defaultIncludedRounds: optional(
        args.defaultIncludedRounds,
        checkIncludedRounds
      ),
      roundBasis: args.roundBasis ?? undefined,
      extraRoundRate: optional(args.extraRoundRate, checkRate),
      extraHourRate: optional(args.extraHourRate, checkRate),
      updatedBy: identity.tokenIdentifier,
      updatedAt: Date.now(),
    };
    const existing = await scopeSettings(ctx, args.workspaceId);
    if (existing) await ctx.db.replace(existing._id, fields);
    else await ctx.db.insert("revisionScopeSettings", fields);
    for (const { templateId, includedRounds } of args.templateLimits) {
      const id = templateId.trim();
      if (!id || id.length > 120) throw new Error("Invalid template");
      const row = await ctx.db
        .query("revisionTemplateLimits")
        .withIndex("by_workspaceId_and_templateId", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("templateId", id)
        )
        .unique();
      if (includedRounds === null) {
        if (row) await ctx.db.delete(row._id);
      } else if (row) {
        await ctx.db.patch(row._id, {
          includedRounds: checkIncludedRounds(includedRounds),
        });
      } else {
        await ctx.db.insert("revisionTemplateLimits", {
          workspaceId: args.workspaceId,
          templateId: id,
          includedRounds: checkIncludedRounds(includedRounds),
        });
      }
    }
    return null;
  },
});

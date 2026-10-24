import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import {
  aiCompletionValidator,
  aiFailureCodeValidator,
  aiModelTierValidator,
} from "./aiValidators";
import {
  changeOrderInputSchema,
  changeOrderOutputSchema,
  MAX_CHANGE_ORDER_ITEMS,
  verifyChangeOrder,
} from "./changeOrdersPrompt";
import { revisionStatus } from "./revisionItemsValidators";
import {
  loadRoundSummary,
  MAX_COUNTED_OUTPUTS,
  revisionScopeAccess,
} from "./revisionRounds";
import { checkExtraHours, extraCharges } from "./revisionRoundsRules";
import schema from "./schema";

export const CHANGE_ORDER_FEATURE = "change_order_draft";

/** Owner/Editor with Project edit access, resolved to the AI Workspace. */
async function draftAccess(ctx: QueryCtx | MutationCtx, projectId: string) {
  const access = await revisionScopeAccess(ctx, projectId, true);
  if (!access.workspace) throw new Error("Workspace required");
  await requireAiEditor(
    ctx,
    access.workspace._id,
    access.identity.tokenIdentifier,
    projectId
  );
  return { ...access, workspace: access.workspace };
}

/**
 * Revision items from each output's newest two versions that the editor may
 * add to a change order. Possible new scope is listed first; the editor
 * decides what to include.
 */
export const revisionItemOptions = query({
  args: { projectId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("revisionItems"),
      outputTitle: v.string(),
      theme: v.string(),
      text: v.string(),
      status: revisionStatus,
      possibleNewScope: v.boolean(),
    })
  ),
  handler: async (ctx, { projectId }) => {
    const { project, workspace } = await revisionScopeAccess(
      ctx,
      projectId,
      true
    );
    const summary = await loadRoundSummary(ctx, project, workspace);
    const options = [];
    for (const output of summary.outputs) {
      for (const mediaVersionId of output.recentVersionIds) {
        const items = await ctx.db
          .query("revisionItems")
          .withIndex("by_mediaVersionId", (q) =>
            q.eq("mediaVersionId", mediaVersionId)
          )
          .take(50);
        options.push(
          ...items.map((item) => ({
            _id: item._id,
            outputTitle: output.title,
            theme: item.theme,
            text: item.text,
            status: item.status,
            possibleNewScope: item.possibleNewScope,
          }))
        );
      }
    }
    return options
      .sort((a, b) => Number(b.possibleNewScope) - Number(a.possibleNewScope))
      .slice(0, 100);
  },
});

/**
 * Enqueues a change-order draft when rounds exceed the included limit or the
 * editor adds extra hours. Counts and amounts come from stored data and saved
 * rates; nothing is sent to the client.
 */
export const generate = mutation({
  args: {
    projectId: v.string(),
    revisionItemIds: v.array(v.id("revisionItems")),
    extraHours: v.number(),
    modelTier: aiModelTierValidator,
  },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const { project, workspace, identity } = await draftAccess(
      ctx,
      args.projectId
    );
    const itemIds = [...new Set(args.revisionItemIds)];
    if (itemIds.length > MAX_CHANGE_ORDER_ITEMS)
      throw new Error(
        `Choose up to ${MAX_CHANGE_ORDER_ITEMS} revision items for a change order`
      );
    const extraHours = checkExtraHours(args.extraHours);
    const summary = await loadRoundSummary(ctx, project, workspace);
    if (summary.truncated)
      throw new Error(
        `Change orders support up to ${MAX_COUNTED_OUTPUTS} active outputs`
      );
    if (!summary.extraRounds && !extraHours)
      throw new Error("Revision rounds are within the included limit");
    const items = await Promise.all(
      itemIds.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        if (!item || item.projectId !== project.id)
          throw new Error("Revision item not found");
        return item;
      })
    );
    const billed = summary.outputs.filter((output) => output.roundsUsed > 0);
    const facts = changeOrderInputSchema.parse({
      projectTitle: project.title.slice(0, 160),
      currencyCode: summary.currencyCode,
      includedRounds: summary.includedRounds,
      roundBasis: summary.roundBasis,
      roundsUsed: summary.roundsUsed,
      outputs: billed.map((output) => ({
        title: output.title.slice(0, 160),
        roundsUsed: output.roundsUsed,
        extraRounds:
          summary.roundBasis === "per_project" ? null : output.extraRounds,
      })),
      extraRounds: summary.extraRounds,
      extraHours,
      rates: {
        extraRound: summary.extraRoundRate,
        extraHour: summary.extraHourRate,
      },
      amounts: extraCharges({
        extraRounds: summary.extraRounds,
        extraHours,
        extraRoundRate: summary.extraRoundRate,
        extraHourRate: summary.extraHourRate,
      }),
      revisionItems: items.map((item) => ({
        theme: item.theme.slice(0, 80),
        text: item.text.slice(0, 300),
        possibleNewScope: item.possibleNewScope,
      })),
    });
    const result = await enqueueAiRun(
      ctx,
      {
        workspaceId: workspace._id,
        projectId: project.id,
        feature: CHANGE_ORDER_FEATURE,
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: [
          project._id,
          ...billed.map((output) => output.outputDocId),
          ...items.map((item) => item._id),
        ],
        inputJson: JSON.stringify(facts),
      },
      internal.changeOrdersActions.run
    );
    const existing = await ctx.db
      .query("changeOrderDrafts")
      .withIndex("by_runId", (q) => q.eq("runId", result.runId))
      .unique();
    if (!existing)
      await ctx.db.insert("changeOrderDrafts", {
        projectId: project.id,
        runId: result.runId,
        requestedBy: identity.tokenIdentifier,
        facts,
        sourceOutputIds: billed.map((output) => output.outputId),
        sourceRevisionItemIds: items.map((item) => item._id),
      });
    return result;
  },
});

/** The caller's latest (or chosen) change-order draft with live run state. */
export const latest = query({
  args: { projectId: v.string(), runId: v.optional(v.id("aiRuns")) },
  returns: v.union(
    v.null(),
    v.object({
      draft: schema.doc("changeOrderDrafts"),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed")
      ),
      failureCode: v.optional(aiFailureCodeValidator),
      modelTier: aiModelTierValidator,
    })
  ),
  handler: async (ctx, { projectId, runId }) => {
    const { identity } = await revisionScopeAccess(ctx, projectId, true);
    const draft = runId
      ? await ctx.db
          .query("changeOrderDrafts")
          .withIndex("by_runId", (q) => q.eq("runId", runId))
          .unique()
      : await ctx.db
          .query("changeOrderDrafts")
          .withIndex("by_projectId_and_requestedBy", (q) =>
            q
              .eq("projectId", projectId)
              .eq("requestedBy", identity.tokenIdentifier)
          )
          .order("desc")
          .first();
    if (
      !draft ||
      draft.projectId !== projectId ||
      draft.requestedBy !== identity.tokenIdentifier
    )
      return null;
    const run = await ctx.db.get(draft.runId);
    if (!run) return null;
    return {
      draft,
      status: run.status,
      ...(run.status === "failed" ? { failureCode: run.failureCode } : {}),
      modelTier: run.modelTier,
    };
  },
});

/**
 * Verifies the draft against the stored facts, rechecks consent and access,
 * then completes the run and stores the text atomically.
 */
export const save = internalMutation({
  args: { completion: aiCompletionValidator },
  returns: v.boolean(),
  handler: async (ctx, { completion }) => {
    const run = await ctx.db.get(completion.runId);
    if (
      !run ||
      run.status !== "running" ||
      run.feature !== CHANGE_ORDER_FEATURE ||
      !run.projectId
    )
      return false;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy,
      run.projectId
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    const draft = await ctx.db
      .query("changeOrderDrafts")
      .withIndex("by_runId", (q) => q.eq("runId", run._id))
      .unique();
    if (!draft || draft.requestedBy !== run.requestedBy)
      throw new Error("Change order unavailable");
    const output = changeOrderOutputSchema.parse(
      JSON.parse(completion.outputJson)
    );
    verifyChangeOrder(changeOrderInputSchema.parse(draft.facts), output);
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    await ctx.db.patch(draft._id, output);
    return true;
  },
});

/** Saves the editor's reviewed text. Sending stays manual. */
export const update = mutation({
  args: {
    draftId: v.id("changeOrderDrafts"),
    subject: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { draftId, subject, message }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) throw new Error("Draft not found");
    const { identity } = await revisionScopeAccess(ctx, draft.projectId, true);
    if (identity.tokenIdentifier !== draft.requestedBy)
      throw new Error("Draft access required");
    if (draft.message === undefined) throw new Error("Draft is not ready");
    await ctx.db.patch(
      draftId,
      changeOrderOutputSchema.parse({ subject, message })
    );
    return null;
  },
});

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, internalMutation } from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";
import { safeCommentTimestampSeconds } from "./commentTimestamps";
import { statusDraftAccess } from "./statusDraftsAccess";
import { statusChannel } from "./statusDraftsValidators";
import {
  statusInputSchema,
  statusOutputSchema,
  channelLimits,
} from "./statusDraftsPrompt";
import schema from "./schema";

/** Enqueues a bounded client update without sending or publishing it. */
export const generate = mutation({
  args: {
    projectId: v.string(),
    channel: statusChannel,
    modelTier: aiModelTierValidator,
  },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const { project, workspaceId } = await statusDraftAccess(
      ctx,
      args.projectId
    );
    const outputs = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId_and_archived", (q) =>
        q.eq("projectId", project.id).eq("archived", false)
      )
      .take(21);
    if (outputs.length > 20)
      throw new Error("Status drafts support up to 20 active outputs");
    const comments = [];
    for (const output of outputs) {
      if (!output.currentMediaVersionId) continue;
      const mediaVersionId = output.currentMediaVersionId;
      const rows = await ctx.db
        .query("mediaVersionComments")
        .withIndex("by_mediaVersionId", (q) =>
          q.eq("mediaVersionId", mediaVersionId)
        )
        .order("desc")
        .take(41 - comments.length);
      comments.push(...rows);
      if (comments.length > 40)
        throw new Error(
          "Status drafts support up to 40 current-version comments"
        );
    }
    const input = statusInputSchema.parse({
      channel: args.channel,
      project: {
        title: project.title.slice(0, 160),
        status: project.status.slice(0, 80),
        dueDate: project.dueDate.slice(0, 40),
      },
      outputs: outputs.map((o) => ({
        title: o.title.slice(0, 160),
        status: o.reviewState,
        dueDate: o.dueDate?.slice(0, 40) ?? null,
      })),
      comments: comments.map((c) => ({
        text: c.body.slice(0, 1000),
        createdAt: c.createdAt.slice(0, 40),
        timestamp: safeCommentTimestampSeconds(c.timestampSeconds),
      })),
    });
    return enqueueAiRun(
      ctx,
      {
        workspaceId,
        projectId: project.id,
        feature: "client_status_draft",
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: [
          project._id,
          ...outputs.map((o) => o._id),
          ...comments.map((c) => c._id),
        ],
        inputJson: JSON.stringify(input),
      },
      internal.statusDraftsActions.run
    );
  },
});

/** Lists only the requesting editor's saved drafts. */
export const list = query({
  args: { projectId: v.string(), runId: v.optional(v.id("aiRuns")) },
  returns: v.array(schema.doc("statusDrafts")),
  handler: async (ctx, { projectId, runId }) => {
    const { identity } = await statusDraftAccess(ctx, projectId);
    const recent = await ctx.db
      .query("statusDrafts")
      .withIndex("by_projectId_and_requestedBy", (q) =>
        q.eq("projectId", projectId).eq("requestedBy", identity.tokenIdentifier)
      )
      .order("desc")
      .take(20);
    if (!runId || recent.some((draft) => draft.runId === runId)) return recent;
    const cached = await ctx.db
      .query("statusDrafts")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .unique();
    return cached?.projectId === projectId &&
      cached.requestedBy === identity.tokenIdentifier
      ? [cached, ...recent]
      : recent;
  },
});

/** Saves validated output and run completion in one transaction. */
export const save = internalMutation({
  args: {
    completion: aiCompletionValidator,
    channel: statusChannel,
    text: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { completion, channel, text }) => {
    const run = await ctx.db.get(completion.runId);
    if (
      !run ||
      run.status !== "running" ||
      run.feature !== "client_status_draft" ||
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
    const parsed = statusOutputSchema.parse({ text });
    if (
      parsed.text.length > channelLimits[channel] ||
      JSON.stringify(parsed) !== completion.outputJson
    )
      throw new Error("Invalid status draft");
    const projectId = ctx.db.normalizeId("projects", run.sourceIds[0]);
    const project = projectId ? await ctx.db.get(projectId) : null;
    if (!project || project.id !== run.projectId)
      throw new Error("Status project unavailable");
    const sourceOutputIds: string[] = [];
    const sourceCommentIds: Id<"mediaVersionComments">[] = [];
    for (const source of run.sourceIds.slice(1)) {
      const outputId = ctx.db.normalizeId("projectOutputs", source);
      const commentId = ctx.db.normalizeId("mediaVersionComments", source);
      const output = outputId ? await ctx.db.get(outputId) : null;
      const comment = commentId ? await ctx.db.get(commentId) : null;
      if (output?.projectId === run.projectId) sourceOutputIds.push(output.id);
      else if (comment?.projectId === run.projectId)
        sourceCommentIds.push(comment._id);
      else throw new Error("Status sources unavailable");
    }
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    await ctx.db.insert("statusDrafts", {
      projectId: run.projectId,
      runId: run._id,
      requestedBy: run.requestedBy,
      channel,
      text: parsed.text,
      sourceOutputIds,
      sourceCommentIds,
    });
    return true;
  },
});

/** Persists reviewed text; publishing remains the portal settings operation. */
export const update = mutation({
  args: { draftId: v.id("statusDrafts"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { draftId, text }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) throw new Error("Draft not found");
    const { identity } = await statusDraftAccess(ctx, draft.projectId);
    if (identity.tokenIdentifier !== draft.requestedBy)
      throw new Error("Draft access required");
    const parsed = statusOutputSchema.parse({ text });
    if (parsed.text.length > channelLimits[draft.channel])
      throw new Error("Draft is too long for this channel");
    await ctx.db.patch(draftId, parsed);
    return null;
  },
});

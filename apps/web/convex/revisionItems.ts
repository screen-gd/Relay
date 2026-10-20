import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";
import { safeCommentTimestampSeconds } from "./commentTimestamps";
import { requireProjectAccess } from "./projectAccess";
import { revisionDraft, revisionStatus } from "./revisionItemsValidators";
import {
  revisionInputSchema,
  revisionOutputSchema,
} from "./revisionItemsPrompt";
import schema from "./schema";

async function versionAccess(
  ctx: QueryCtx | MutationCtx,
  mediaVersionId: string,
  edit = false
) {
  const version = await ctx.db
    .query("projectMediaVersions")
    .withIndex("by_versionId", (q) => q.eq("id", mediaVersionId))
    .unique();
  if (!version) throw new Error("Media Version not found");
  const access = await requireProjectAccess(
    ctx,
    version.projectId,
    edit ? "editProjects" : "viewProjects"
  );
  if (
    edit &&
    access.membership &&
    !["Owner", "Editor"].includes(access.membership.role)
  )
    throw new Error("Only Owners and Editors can edit revisions");
  return { version, ...access };
}

export const generate = mutation({
  args: { mediaVersionId: v.string(), modelTier: aiModelTierValidator },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const { version, project, identity } = await versionAccess(
      ctx,
      args.mediaVersionId,
      true
    );
    const workspaceId = project.teamId
      ? ctx.db.normalizeId("teamWorkspaces", project.teamId)
      : (
          await ctx.db
            .query("teamWorkspaces")
            .withIndex("by_ownerUserId", (q) =>
              q.eq("ownerUserId", identity.tokenIdentifier)
            )
            .unique()
        )?._id;
    if (!workspaceId) throw new Error("Workspace required");
    const existing = await ctx.db
      .query("revisionItems")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", version._id)
      )
      .take(161);
    if (existing.length > 160)
      throw new Error("Delete unused revision items before generating more");
    const comments = await ctx.db
      .query("mediaVersionComments")
      .withIndex("by_mediaVersionId_and_resolved", (q) =>
        q.eq("mediaVersionId", version._id).eq("resolved", false)
      )
      .take(41);
    if (!comments.length) throw new Error("No unresolved comments");
    if (comments.length > 40)
      throw new Error("Resolve comments until 40 or fewer remain");
    const output = await ctx.db.get(version.outputId);
    const input = revisionInputSchema.parse({
      titles: [project.title, output?.title ?? "", version.title].map((title) =>
        title.slice(0, 160)
      ),
      comments: comments.map((comment) => ({
        text: comment.body.slice(0, 1000),
        timestamp: safeCommentTimestampSeconds(comment.timestampSeconds),
      })),
    });
    return enqueueAiRun(
      ctx,
      {
        workspaceId,
        projectId: project.id,
        feature: "feedback_revision_list",
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: comments.map((comment) => comment._id),
        inputJson: JSON.stringify(input),
      },
      internal.revisionItemsActions.run
    );
  },
});

export const list = query({
  args: { mediaVersionId: v.string() },
  returns: v.array(schema.doc("revisionItems")),
  handler: async (ctx, args) => {
    const { version } = await versionAccess(ctx, args.mediaVersionId);
    return ctx.db
      .query("revisionItems")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", version._id)
      )
      .take(200);
  },
});

export const save = internalMutation({
  args: { completion: aiCompletionValidator, items: v.array(revisionDraft) },
  returns: v.boolean(),
  handler: async (ctx, { completion, items }) => {
    const run = await ctx.db.get(completion.runId);
    if (
      !run ||
      run.status !== "running" ||
      run.feature !== "feedback_revision_list"
    )
      return false;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy,
      run.projectId
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    const parsed = revisionOutputSchema.parse({ items });
    if (JSON.stringify(parsed) !== completion.outputJson)
      throw new Error("Revision output mismatch");
    const comments = await Promise.all(
      run.sourceIds.map(async (source) => {
        const id = ctx.db.normalizeId("mediaVersionComments", source);
        return id ? ctx.db.get(id) : null;
      })
    );
    const first = comments[0];
    if (
      !first ||
      comments.some(
        (comment) =>
          !comment ||
          comment.projectId !== run.projectId ||
          comment.mediaVersionId !== first.mediaVersionId
      )
    )
      throw new Error("Revision sources unavailable");
    const version = await ctx.db.get(first.mediaVersionId);
    if (!version || version.projectId !== run.projectId)
      throw new Error("Media Version unavailable");
    const covered = new Set<number>();
    const drafts = parsed.items.map((item) => {
      const sources = [...new Set(item.sources)];
      const sourceComments = sources.map((index) => {
        const comment = comments[index];
        if (!comment) throw new Error("Invalid revision source");
        covered.add(index);
        return comment;
      });
      if (item.vague && !item.clarifyingQuestion)
        throw new Error("Missing clarifying question");
      return {
        projectId: first.projectId,
        mediaVersionId: first.mediaVersionId,
        runId: run._id,
        sourceCommentIds: sourceComments.map((comment) => comment._id),
        timestamps: [
          ...new Set(
            sourceComments.flatMap((comment) => {
              const timestamp = safeCommentTimestampSeconds(
                comment.timestampSeconds
              );
              return timestamp === null ? [] : [timestamp];
            })
          ),
        ].sort((a, b) => a - b),
        theme: item.theme,
        text: item.text,
        vague: item.vague,
        clarifyingQuestion: item.clarifyingQuestion,
        possibleNewScope: item.possibleNewScope,
        status: "draft" as const,
      };
    });
    if (covered.size !== comments.length)
      throw new Error("Incomplete revision sources");
    const existing = await ctx.db
      .query("revisionItems")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", first.mediaVersionId)
      )
      .take(200);
    if (existing.length + drafts.length > 200)
      throw new Error("Revision item limit reached");
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    for (const draft of drafts) await ctx.db.insert("revisionItems", draft);
    return true;
  },
});

async function editableItem(ctx: MutationCtx, itemId: Id<"revisionItems">) {
  const item = await ctx.db.get(itemId);
  if (!item) throw new Error("Revision item not found");
  const version = await ctx.db.get(item.mediaVersionId);
  if (!version) throw new Error("Media Version not found");
  await versionAccess(ctx, version.id, true);
  return item;
}

export const update = mutation({
  args: {
    itemId: v.id("revisionItems"),
    text: v.optional(v.string()),
    status: v.optional(revisionStatus),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await editableItem(ctx, args.itemId);
    const text = args.text?.trim();
    if (text !== undefined && (!text || text.length > 1200))
      throw new Error("Revision text must contain 1–1200 characters");
    await ctx.db.patch(args.itemId, {
      ...(text === undefined ? {} : { text, status: "accepted" as const }),
      ...(args.status === undefined ? {} : { status: args.status }),
    });
    return null;
  },
});

export const remove = mutation({
  args: { itemId: v.id("revisionItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    await editableItem(ctx, itemId);
    await ctx.db.delete(itemId);
    return null;
  },
});

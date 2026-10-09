import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";
import { statusDraftAccess } from "./statusDraftsAccess";
import {
  changelogInputSchema,
  changelogOutputSchema,
} from "./versionChangelogPrompt";
import schema from "./schema";

async function versionAccess(
  ctx: QueryCtx | MutationCtx,
  mediaVersionId: string
) {
  const version = await ctx.db
    .query("projectMediaVersions")
    .withIndex("by_versionId", (q) => q.eq("id", mediaVersionId))
    .unique();
  if (!version) throw new Error("Media Version not found");
  return { version, ...(await statusDraftAccess(ctx, version.projectId)) };
}

/** Enqueues resolved revision text without internal flags or questions. */
export const generate = mutation({
  args: { mediaVersionId: v.string(), modelTier: aiModelTierValidator },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const { version, project, workspaceId } = await versionAccess(
      ctx,
      args.mediaVersionId
    );
    const rows = await ctx.db
      .query("revisionItems")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", version._id)
      )
      .take(200);
    const items = rows.filter((item) => item.status === "resolved");
    if (!items.length) throw new Error("No resolved revisions");
    if (items.length > 40)
      throw new Error("Changelogs support up to 40 resolved revisions");
    const output = await ctx.db.get(version.outputId);
    const input = changelogInputSchema.parse({
      titles: [project.title, output?.title ?? "", version.title].map((t) =>
        t.slice(0, 160)
      ),
      items: items.map((item) => ({
        text: item.text.slice(0, 1200),
        timestamps: item.timestamps,
      })),
    });
    return enqueueAiRun(
      ctx,
      {
        workspaceId,
        projectId: project.id,
        feature: "media_version_changelog",
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: [version._id, ...items.map((item) => item._id)],
        inputJson: JSON.stringify(input),
      },
      internal.versionChangelogActions.run
    );
  },
});

/** Drafts are available only to project editors, never portal viewers. */
export const list = query({
  args: { mediaVersionId: v.string(), runId: v.optional(v.id("aiRuns")) },
  returns: v.array(schema.doc("versionChangelogs")),
  handler: async (ctx, args) => {
    const { version } = await versionAccess(ctx, args.mediaVersionId);
    const recent = await ctx.db
      .query("versionChangelogs")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", version._id)
      )
      .order("desc")
      .take(20);
    const runId = args.runId;
    if (!runId || recent.some((row) => row.runId === runId)) return recent;
    const cached = await ctx.db
      .query("versionChangelogs")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .unique();
    return cached?.mediaVersionId === version._id
      ? [cached, ...recent]
      : recent;
  },
});

/** Completes once and persists a private draft while preserving approvals. */
export const save = internalMutation({
  args: { completion: aiCompletionValidator, text: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { completion, text }) => {
    const run = await ctx.db.get(completion.runId);
    if (
      !run ||
      run.status !== "running" ||
      run.feature !== "media_version_changelog" ||
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
    const parsed = changelogOutputSchema.parse({ text });
    if (JSON.stringify(parsed) !== completion.outputJson)
      throw new Error("Changelog output mismatch");
    const versionId = ctx.db.normalizeId(
      "projectMediaVersions",
      run.sourceIds[0]
    );
    const version = versionId ? await ctx.db.get(versionId) : null;
    if (!version || version.projectId !== run.projectId)
      throw new Error("Media Version unavailable");
    const sourceRevisionIds: Id<"revisionItems">[] = [];
    for (const source of run.sourceIds.slice(1)) {
      const id = ctx.db.normalizeId("revisionItems", source);
      const item = id ? await ctx.db.get(id) : null;
      if (
        !item ||
        item.mediaVersionId !== version._id ||
        item.projectId !== run.projectId ||
        item.status !== "resolved"
      )
        throw new Error("Changelog sources unavailable");
      sourceRevisionIds.push(item._id);
    }
    if (!sourceRevisionIds.length)
      throw new Error("Changelog sources unavailable");
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    await ctx.db.insert("versionChangelogs", {
      projectId: run.projectId,
      mediaVersionId: version._id,
      runId: run._id,
      text: parsed.text,
      sourceRevisionIds,
    });
    return true;
  },
});

/** Approval snapshots the reviewed text; later edits stay private until approved. */
export const update = mutation({
  args: {
    changelogId: v.id("versionChangelogs"),
    text: v.string(),
    approve: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { changelogId, text, approve }) => {
    const row = await ctx.db.get(changelogId);
    if (!row) throw new Error("Changelog not found");
    const { identity } = await statusDraftAccess(ctx, row.projectId);
    const parsed = changelogOutputSchema.parse({ text });
    await ctx.db.patch(changelogId, { text: parsed.text });
    if (approve) {
      const previous = await ctx.db
        .query("versionChangelogs")
        .withIndex("by_mediaVersionId_and_approvedAt", (q) =>
          q.eq("mediaVersionId", row.mediaVersionId).gt("approvedAt", 0)
        )
        .first();
      if (previous && previous._id !== changelogId)
        await ctx.db.patch(previous._id, {
          approvedText: undefined,
          approvedBy: undefined,
          approvedAt: undefined,
        });
      await ctx.db.patch(changelogId, {
        approvedText: parsed.text,
        approvedBy: identity.tokenIdentifier,
        approvedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Returns only the explicitly approved snapshot for a portal-selected version. */
export async function approvedVersionChangelog(
  ctx: QueryCtx,
  mediaVersionId: Id<"projectMediaVersions">
) {
  const row = await ctx.db
    .query("versionChangelogs")
    .withIndex("by_mediaVersionId_and_approvedAt", (q) =>
      q.eq("mediaVersionId", mediaVersionId).gt("approvedAt", 0)
    )
    .order("desc")
    .first();
  return row?.approvedText ?? null;
}

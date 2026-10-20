import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";
import { requireProjectAccess } from "./projectAccess";
import {
  matchTranscriptTimestamp,
  MAX_TRANSCRIPT_CUES,
  parseTranscript,
} from "../src/features/media-version-comments/transcript-parser";
import {
  transcriptInputSchema,
  transcriptMatchDraft,
  transcriptOutputSchema,
  validateTranscriptMatches,
} from "./transcriptsValidators";
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
    throw new Error("Only Owners and Editors can upload or match transcripts");
  return { version, ...access };
}
async function readTranscript(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"projectMediaVersions">
) {
  const transcript = await ctx.db
    .query("transcripts")
    .withIndex("by_mediaVersionId", (q) => q.eq("mediaVersionId", versionId))
    .unique();
  const segments = transcript
    ? await ctx.db
        .query("transcriptSegments")
        .withIndex("by_transcriptId", (q) =>
          q.eq("transcriptId", transcript._id)
        )
        .take(MAX_TRANSCRIPT_CUES)
    : [];
  return { transcript, segments };
}

/** Saved AI matches per transcript; AI only ever sees the first 100 comments. */
const MAX_TRANSCRIPT_MATCHES = 200;

/**
 * Attaches a parsed SRT/VTT transcript to a Media Version. An existing
 * transcript is replaced: its segments and saved AI matches are deleted in
 * the same transaction. An in-flight AI match run for the old transcript then
 * fails at save because its source transcript no longer exists.
 */
export const upload = mutation({
  args: {
    mediaVersionId: v.string(),
    sourceName: v.string(),
    text: v.string(),
  },
  returns: v.id("transcripts"),
  handler: async (ctx, args) => {
    const { version, identity } = await versionAccess(
      ctx,
      args.mediaVersionId,
      true
    );
    if (!/\.(srt|vtt)$/i.test(args.sourceName) || args.sourceName.length > 160)
      throw new Error("Upload an SRT or VTT file");
    const cues = parseTranscript(args.text);
    const { transcript, segments } = await readTranscript(ctx, version._id);
    if (transcript) {
      const matches = await ctx.db
        .query("transcriptMatches")
        .withIndex("by_transcriptId", (q) =>
          q.eq("transcriptId", transcript._id)
        )
        .take(MAX_TRANSCRIPT_MATCHES);
      for (const row of [...segments, ...matches]) await ctx.db.delete(row._id);
      await ctx.db.delete(transcript._id);
    }
    const transcriptId = await ctx.db.insert("transcripts", {
      mediaVersionId: version._id,
      uploadedBy: identity.tokenIdentifier,
      sourceName: args.sourceName,
    });
    for (const cue of cues)
      await ctx.db.insert("transcriptSegments", { transcriptId, ...cue });
    return transcriptId;
  },
});

export const get = query({
  args: { mediaVersionId: v.string() },
  returns: v.object({
    transcript: v.union(v.null(), schema.doc("transcripts")),
    segments: v.array(schema.doc("transcriptSegments")),
    matches: v.array(
      v.object({
        commentId: v.id("mediaVersionComments"),
        segmentId: v.id("transcriptSegments"),
        text: v.string(),
        startSeconds: v.number(),
        aiDrafted: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const { version } = await versionAccess(ctx, args.mediaVersionId);
    const { transcript, segments } = await readTranscript(ctx, version._id);
    if (!transcript) return { transcript: null, segments: [], matches: [] };
    const comments = await ctx.db
      .query("mediaVersionComments")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", version._id)
      )
      .take(100);
    const saved = await ctx.db
      .query("transcriptMatches")
      .withIndex("by_transcriptId", (q) => q.eq("transcriptId", transcript._id))
      .take(100);
    const matches = comments.flatMap((comment) => {
      const direct = matchTranscriptTimestamp(
        segments,
        comment.timestampSeconds
      );
      const ai = saved.find((match) => match.commentId === comment._id);
      const segment =
        direct ?? segments.find((segment) => segment._id === ai?.segmentId);
      return segment
        ? [
            {
              commentId: comment._id,
              segmentId: segment._id,
              text: segment.text,
              startSeconds: segment.startSeconds,
              aiDrafted: !direct,
            },
          ]
        : [];
    });
    return { transcript, segments, matches };
  },
});

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
    const { transcript, segments } = await readTranscript(ctx, version._id);
    if (!transcript) throw new Error("Upload a transcript first");
    const comments = (
      await ctx.db
        .query("mediaVersionComments")
        .withIndex("by_mediaVersionId", (q) =>
          q.eq("mediaVersionId", version._id)
        )
        .take(100)
    ).filter(
      (comment) => !matchTranscriptTimestamp(segments, comment.timestampSeconds)
    );
    if (!comments.length) throw new Error("All comments match by timestamp");
    if (comments.length > 20)
      throw new Error(
        "AI matching supports up to 20 ambiguous comments per version"
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
    const input = transcriptInputSchema.parse({
      segments: segments.map((segment) => ({
        id: segment._id,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
      })),
      comments: comments.map((comment) => ({
        text: comment.body.slice(0, 1000),
        timestamp: comment.timestampSeconds ?? null,
      })),
    });
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 64_000)
      throw new Error("Transcript and comments exceed the AI input limit");
    return enqueueAiRun(
      ctx,
      {
        workspaceId,
        projectId: project.id,
        feature: "transcript_feedback",
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: [transcript._id, ...comments.map((comment) => comment._id)],
        inputJson: JSON.stringify(input),
      },
      internal.transcriptsActions.run
    );
  },
});

export const save = internalMutation({
  args: {
    completion: aiCompletionValidator,
    matches: v.array(transcriptMatchDraft),
  },
  returns: v.boolean(),
  handler: async (ctx, { completion, matches }): Promise<boolean> => {
    const run = await ctx.db.get(completion.runId);
    if (
      !run ||
      run.status !== "running" ||
      run.feature !== "transcript_feedback"
    )
      return false;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy,
      run.projectId
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    const transcriptId = ctx.db.normalizeId("transcripts", run.sourceIds[0]);
    const transcript = transcriptId ? await ctx.db.get(transcriptId) : null;
    const version = transcript
      ? await ctx.db.get(transcript.mediaVersionId)
      : null;
    if (!transcript || !version || version.projectId !== run.projectId)
      throw new Error("Transcript source mismatch");
    const { segments } = await readTranscript(ctx, version._id);
    const output = transcriptOutputSchema.parse({ matches });
    if (JSON.stringify(output) !== completion.outputJson)
      throw new Error("Transcript output mismatch");
    validateTranscriptMatches(
      output,
      new Set(segments.map((segment) => segment._id)),
      run.sourceIds.length - 1
    );
    const comments = await Promise.all(
      run.sourceIds.slice(1).map(async (source) => {
        const id = ctx.db.normalizeId("mediaVersionComments", source);
        return id ? ctx.db.get(id) : null;
      })
    );
    if (
      comments.some(
        (comment) =>
          !comment ||
          comment.mediaVersionId !== version._id ||
          matchTranscriptTimestamp(segments, comment.timestampSeconds)
      )
    )
      throw new Error("Comment source mismatch");
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    for (const match of output.matches) {
      const comment = comments[match.comment]!;
      const segmentId = match.segmentId
        ? ctx.db.normalizeId("transcriptSegments", match.segmentId)
        : null;
      const previous = await ctx.db
        .query("transcriptMatches")
        .withIndex("by_transcriptId_and_commentId", (q) =>
          q.eq("transcriptId", transcript._id).eq("commentId", comment._id)
        )
        .unique();
      const fields = {
        transcriptId: transcript._id,
        commentId: comment._id,
        segmentId,
        runId: run._id,
      };
      if (previous) await ctx.db.patch(previous._id, fields);
      else await ctx.db.insert("transcriptMatches", fields);
    }
    return true;
  },
});

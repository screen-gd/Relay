import { requireProjectVisibility } from "./projectAccess";
import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  assertMediaVersionUnlocked,
  getPublicPortalAccess,
  getSharedPortalVersion,
  publicPortalAccessValidator,
} from "./projectPortals";
import {
  annotationShapeValidator,
  normalizeAnnotations,
} from "./mediaVersionAnnotations";

type FunctionCtx = QueryCtx | MutationCtx;
type ProjectPermission = "viewProjects" | "reviewProjects";

const MAX_COMMENTS = 50;
const MAX_PUBLIC_COMMENTS_PER_MINUTE = 10;
const MAX_COMMENT_BODY = 2_000;
const MAX_AUTHOR_NAME = 120;

const publicCommentValidator = v.object({
  id: v.id("mediaVersionComments"),
  outputId: v.string(),
  mediaVersionId: v.string(),
  authorName: v.string(),
  body: v.string(),
  timestampSeconds: v.optional(v.number()),
  annotations: v.optional(v.array(annotationShapeValidator)),
  resolved: v.boolean(),
  createdAt: v.string(),
  resolvedAt: v.union(v.string(), v.null()),
});

async function identity(ctx: FunctionCtx) {
  const value = await ctx.auth.getUserIdentity();
  if (!value) throw new Error("Not authenticated");
  return value;
}

async function projectById(ctx: FunctionCtx, projectId: string) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("id", projectId))
    .unique();
  if (!project) throw new Error("Project not found");
  return project;
}

async function requireProjectAccess(
  ctx: FunctionCtx,
  projectId: string,
  permission: ProjectPermission
) {
  const currentIdentity = await identity(ctx);
  const project = await projectById(ctx, projectId);
  if (!project.teamId) {
    if (project.ownerUserId !== currentIdentity.tokenIdentifier)
      throw new Error("Project access required");
    return { identity: currentIdentity, project };
  }

  const teamId = project.teamId;
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", currentIdentity.tokenIdentifier)
    )
    .unique();
  const permitted =
    member?.permissions[permission] ??
    (permission === "reviewProjects"
      ? member?.permissions.commentProjects
      : false);
  if (!member || member.status !== "active" || !permitted) {
    throw new Error("Permission denied");
  }
  await requireProjectVisibility(ctx, project, member);
  return { identity: currentIdentity, project };
}

/** Mutating client paths require a current shared version that has not been approved. */
async function sharedVersion(
  ctx: FunctionCtx,
  portal: Doc<"projectPortals">,
  outputId: string,
  mediaVersionId: string
) {
  const shared = await getSharedPortalVersion(
    ctx,
    portal,
    outputId,
    mediaVersionId
  );
  if (!shared) return null;
  assertMediaVersionUnlocked(shared.version);
  return shared.output.currentMediaVersionId === shared.version._id
    ? shared
    : null;
}

function publicComment(
  comment: Doc<"mediaVersionComments">,
  outputId: string,
  mediaVersionId: string
) {
  return {
    id: comment._id,
    outputId,
    mediaVersionId,
    authorName: comment.authorName,
    body: comment.body,
    ...(comment.timestampSeconds === undefined
      ? {}
      : { timestampSeconds: comment.timestampSeconds }),
    ...(comment.annotations === undefined
      ? {}
      : { annotations: comment.annotations }),
    resolved: comment.resolved,
    createdAt: comment.createdAt,
    resolvedAt: comment.resolvedAt ?? null,
  };
}

async function currentComments(ctx: QueryCtx, portal: Doc<"projectPortals">) {
  const comments: Array<ReturnType<typeof publicComment>> = [];
  const streams = [];
  for (const outputId of portal.selectedOutputIds.slice(0, 20)) {
    const output = await ctx.db
      .query("projectOutputs")
      .withIndex("by_outputId", (q) => q.eq("id", outputId))
      .unique();
    if (
      !output ||
      output.projectId !== portal.projectId ||
      output.ownerUserId !== portal.ownerUserId ||
      output.archived ||
      !output.currentMediaVersionId
    )
      continue;
    const current = await ctx.db.get(output.currentMediaVersionId);
    if (
      !current ||
      current.outputId !== output._id ||
      current.projectId !== portal.projectId ||
      current.ownerUserId !== portal.ownerUserId
    )
      continue;
    const iterator = ctx.db
      .query("mediaVersionComments")
      .withIndex("by_mediaVersionId_and_createdAt", (q) =>
        q.eq("mediaVersionId", current._id)
      )
      .order("desc")
      [Symbol.asyncIterator]();
    streams.push({ iterator, head: await iterator.next(), output, current });
  }
  // Merge version indexes: at most 50 rows plus one lookahead per output.
  try {
    for (let read = 0; read < MAX_COMMENTS; read++) {
      let newest;
      for (const stream of streams) {
        if (stream.head.done) continue;
        if (
          !newest ||
          stream.head.value.createdAt > newest.head.value.createdAt ||
          (stream.head.value.createdAt === newest.head.value.createdAt &&
            stream.head.value._creationTime > newest.head.value._creationTime)
        )
          newest = stream;
      }
      if (!newest || newest.head.done) break;
      const comment = newest.head.value;
      if (
        comment.projectId === portal.projectId &&
        comment.ownerUserId === portal.ownerUserId &&
        comment.outputId === newest.output._id
      )
        comments.push(
          publicComment(comment, newest.output.id, newest.current.id)
        );
      if (read + 1 < MAX_COMMENTS) newest.head = await newest.iterator.next();
    }
    return comments;
  } finally {
    for (const stream of streams) await stream.iterator.return?.();
  }
}

/** Returns up to 50 recent comments, optionally from a selected shared version. */
export const listForPortal = query({
  args: {
    token: v.string(),
    pin: v.optional(v.string()),
    outputId: v.optional(v.string()),
    mediaVersionId: v.optional(v.string()),
  },
  returns: v.object({
    access: publicPortalAccessValidator,
    comments: v.array(publicCommentValidator),
  }),
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) return { access: result.access, comments: [] };
    if (args.outputId !== undefined || args.mediaVersionId !== undefined) {
      if (args.outputId === undefined || args.mediaVersionId === undefined)
        throw new Error("Choose both a Project Output and Media Version");
      const shared = await getSharedPortalVersion(
        ctx,
        result.portal,
        args.outputId,
        args.mediaVersionId
      );
      if (!shared) throw new Error("Shared Media Version not found");
      const rows = await ctx.db
        .query("mediaVersionComments")
        .withIndex("by_mediaVersionId_and_createdAt", (q) =>
          q.eq("mediaVersionId", shared.version._id)
        )
        .order("desc")
        .take(MAX_COMMENTS);
      return {
        access: "active" as const,
        comments: rows
          .filter(
            (comment) =>
              comment.projectId === result.portal.projectId &&
              comment.outputId === shared.output._id &&
              comment.ownerUserId === result.portal.ownerUserId
          )
          .map((comment) =>
            publicComment(comment, shared.output.id, shared.version.id)
          ),
      };
    }
    return {
      access: "active" as const,
      comments: await currentComments(ctx, result.portal),
    };
  },
});

/** Accepts at most ten comments per portal in a sliding one-minute window. */
export const addPublicComment = mutation({
  args: {
    token: v.string(),
    pin: v.optional(v.string()),
    outputId: v.string(),
    mediaVersionId: v.string(),
    authorName: v.string(),
    body: v.string(),
    timestampSeconds: v.optional(v.number()),
    annotations: v.optional(v.array(annotationShapeValidator)),
  },
  returns: publicCommentValidator,
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) throw new Error(`Portal access ${result.access}`);
    const authorName = args.authorName.trim().slice(0, MAX_AUTHOR_NAME);
    const body = args.body.trim().slice(0, MAX_COMMENT_BODY);
    if (!authorName) throw new Error("Display name is required");
    if (!body) throw new Error("Comment cannot be empty");
    const annotations = args.annotations
      ? normalizeAnnotations(args.annotations)
      : undefined;
    if (
      args.timestampSeconds !== undefined &&
      (!Number.isSafeInteger(args.timestampSeconds) ||
        args.timestampSeconds < 0 ||
        args.timestampSeconds > 604_800)
    )
      throw new Error(
        "Timestamp must be a whole number of seconds between 0 and 604800"
      );
    const shared = await sharedVersion(
      ctx,
      result.portal,
      args.outputId,
      args.mediaVersionId
    );
    if (!shared)
      throw new Error(
        "Comments can only be added to the current shared Media Version"
      );
    // A sliding portal-wide window bounds public writes without scanning history.
    const recent = await ctx.db
      .query("mediaVersionComments")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q
          .eq("portalId", result.portal._id)
          .gte("createdAt", new Date(Date.now() - 60_000).toISOString())
      )
      .take(MAX_PUBLIC_COMMENTS_PER_MINUTE);
    if (recent.length >= MAX_PUBLIC_COMMENTS_PER_MINUTE)
      throw new Error("This portal accepts at most 10 comments per minute");
    const commentId = await ctx.db.insert("mediaVersionComments", {
      portalId: result.portal._id,
      ownerUserId: result.portal.ownerUserId,
      projectId: result.portal.projectId,
      outputId: shared.output._id,
      mediaVersionId: shared.version._id,
      authorName,
      body,
      ...(args.timestampSeconds === undefined
        ? {}
        : { timestampSeconds: args.timestampSeconds }),
      ...(annotations === undefined || annotations.length === 0
        ? {}
        : { annotations }),
      resolved: false,
      createdAt: new Date().toISOString(),
    });
    const comment = await ctx.db.get("mediaVersionComments", commentId);
    if (!comment) throw new Error("Comment could not be stored");
    return publicComment(comment, shared.output.id, shared.version.id);
  },
});

export const reopenPublicComment = mutation({
  args: {
    token: v.string(),
    pin: v.optional(v.string()),
    commentId: v.id("mediaVersionComments"),
  },
  returns: publicCommentValidator,
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) throw new Error(`Portal access ${result.access}`);
    const comment = await ctx.db.get("mediaVersionComments", args.commentId);
    if (!comment || comment.projectId !== result.portal.projectId)
      throw new Error("Comment not found");
    const output = await ctx.db.get("projectOutputs", comment.outputId);
    if (!output) throw new Error("Comment Output not found");
    const version = await ctx.db.get(
      "projectMediaVersions",
      comment.mediaVersionId
    );
    if (!version) throw new Error("Comment Media Version not found");
    const shared = await sharedVersion(
      ctx,
      result.portal,
      output.id,
      version.id
    );
    if (!shared)
      throw new Error(
        "Only comments on the current shared Media Version can be reopened"
      );
    await ctx.db.patch(comment._id, { resolved: false, resolvedAt: undefined });
    const updated = await ctx.db.get("mediaVersionComments", comment._id);
    if (!updated) throw new Error("Comment could not be reopened");
    return publicComment(updated, output.id, version.id);
  },
});

/** Reads the 50 newest project comments across current and historical versions. */
export const listForProject = query({
  args: { projectId: v.string() },
  returns: v.array(publicCommentValidator),
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewProjects");
    const rows = await ctx.db
      .query("mediaVersionComments")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("desc")
      .take(MAX_COMMENTS);
    return Promise.all(
      rows.map(async (comment) => {
        const [output, version] = await Promise.all([
          ctx.db.get(comment.outputId),
          ctx.db.get(comment.mediaVersionId),
        ]);
        return publicComment(
          comment,
          output?.id ?? comment.outputId,
          version?.id ?? comment.mediaVersionId
        );
      })
    );
  },
});

export const setResolved = mutation({
  args: { commentId: v.id("mediaVersionComments"), resolved: v.boolean() },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get("mediaVersionComments", args.commentId);
    if (!comment) throw new Error("Comment not found");
    await requireProjectAccess(ctx, comment.projectId, "reviewProjects");
    const resolvedAt = args.resolved ? new Date().toISOString() : undefined;
    await ctx.db.patch(comment._id, { resolved: args.resolved, resolvedAt });
    const updated = await ctx.db.get("mediaVersionComments", comment._id);
    if (!updated) throw new Error("Comment could not be updated");
    const [output, version] = await Promise.all([
      ctx.db.get("projectOutputs", updated.outputId),
      ctx.db.get("projectMediaVersions", updated.mediaVersionId),
    ]);
    return publicComment(
      updated,
      output?.id ?? updated.outputId,
      version?.id ?? updated.mediaVersionId
    );
  },
});

import {
  parseMediaVersionComments,
  type MediaVersionComment,
} from "./media-version-comments";

/**
 * Local mode has no `mediaVersionComments` table, so review notes left on a
 * Media Version are kept in browser storage next to the Project Outputs they
 * belong to.
 */
export const LOCAL_MEDIA_VERSION_COMMENTS_KEY =
  "relay:media-version-comments:v1";

const LOCAL_COMMENT_ID_PREFIX = "local-comment-";

/** Notes pasted from the client, so the row reads as the source it came from. */
export const LOCAL_COMMENT_AUTHOR = "Client note";

export function newLocalMediaVersionCommentId() {
  return `${LOCAL_COMMENT_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isLocalMediaVersionComment(commentId: string) {
  return commentId.startsWith(LOCAL_COMMENT_ID_PREFIX);
}

export function readLocalMediaVersionComments(): MediaVersionComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_MEDIA_VERSION_COMMENTS_KEY);
    return raw ? parseMediaVersionComments(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeLocalMediaVersionComments(
  comments: readonly MediaVersionComment[]
) {
  try {
    window.localStorage.setItem(
      LOCAL_MEDIA_VERSION_COMMENTS_KEY,
      JSON.stringify(comments)
    );
  } catch {
    // Storage is full or blocked. The note stays for this session only.
  }
}

/** The notes an output still owns, newest first. */
export function localCommentsForOutput(
  comments: readonly MediaVersionComment[],
  outputId: string,
  mediaVersionIds: readonly string[]
) {
  return comments
    .filter(
      (comment) =>
        comment.outputId === outputId &&
        mediaVersionIds.includes(comment.mediaVersionId)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/**
 * A note lives with its Media Version. Once the version is gone from the
 * record, its notes go too.
 */
export function pruneLocalMediaVersionComments(
  comments: readonly MediaVersionComment[],
  outputId: string,
  mediaVersionIds: readonly string[]
): MediaVersionComment[] {
  return comments.filter(
    (comment) =>
      comment.outputId !== outputId ||
      mediaVersionIds.includes(comment.mediaVersionId)
  );
}

export function addLocalMediaVersionComment(
  comments: readonly MediaVersionComment[],
  comment: MediaVersionComment
): MediaVersionComment[] {
  return [...comments, comment];
}

export function resolveLocalMediaVersionComment(
  comments: readonly MediaVersionComment[],
  commentId: string,
  resolved: boolean,
  resolvedAt: string
): MediaVersionComment[] {
  return comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          resolved,
          ...(resolved ? { resolvedAt } : { resolvedAt: null }),
        }
      : comment
  );
}

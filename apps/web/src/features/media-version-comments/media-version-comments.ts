import {
  parseAnnotations,
  type AnnotationShape,
} from "./media-version-annotations";

export type MediaVersionComment = {
  id: string;
  outputId: string;
  mediaVersionId: string;
  authorName: string;
  body: string;
  timestampSeconds?: number;
  annotations?: readonly AnnotationShape[];
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string | null;
};

export type MediaVersionSummary = {
  id: string;
  outputId: string;
  versionNumber: number;
  label: string;
  current: boolean;
};

export type MediaVersionCommentsAdapter = {
  listForProject: (projectId: string) => Promise<MediaVersionComment[]>;
  setResolved: (
    commentId: string,
    resolved: boolean
  ) => Promise<MediaVersionComment>;
};

export function commentsForVersion(
  comments: readonly MediaVersionComment[],
  mediaVersionId: string
) {
  return comments
    .filter((comment) => comment.mediaVersionId === mediaVersionId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** Reads one stored comment row, from the Convex table or from browser storage. */
export function readMediaVersionComment(
  value: unknown
): MediaVersionComment | undefined {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  const mediaVersionId = text(value.mediaVersionId);
  if (!id || !mediaVersionId) return undefined;
  const resolvedAt =
    value.resolvedAt === null ? null : text(value.resolvedAt) || undefined;
  const annotations = parseAnnotations(value.annotations);
  return {
    id,
    outputId: text(value.outputId),
    mediaVersionId,
    authorName: text(value.authorName) || "Team member",
    body: text(value.body),
    ...(typeof value.timestampSeconds === "number" &&
    Number.isSafeInteger(value.timestampSeconds) &&
    value.timestampSeconds >= 0 &&
    value.timestampSeconds <= 604_800
      ? { timestampSeconds: value.timestampSeconds }
      : {}),
    ...(annotations.length ? { annotations } : {}),
    resolved: value.resolved === true,
    createdAt: text(value.createdAt),
    ...(resolvedAt === undefined ? {} : { resolvedAt }),
  };
}

/** Drops rows that carry no Media Version to attach to. */
export function parseMediaVersionComments(
  value: unknown
): MediaVersionComment[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.comments)
      ? value.comments
      : [];
  return rows.flatMap((row) => {
    const comment = readMediaVersionComment(row);
    return comment ? [comment] : [];
  });
}

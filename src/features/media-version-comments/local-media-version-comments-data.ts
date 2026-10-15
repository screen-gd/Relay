"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { MediaVersionComment } from "./media-version-comments";
import {
  LOCAL_COMMENT_AUTHOR,
  addLocalMediaVersionComment,
  localCommentsForOutput,
  newLocalMediaVersionCommentId,
  pruneLocalMediaVersionComments,
  resolveLocalMediaVersionComment,
} from "./local-media-version-comments";
import {
  localMediaVersionCommentsSnapshot,
  subscribeToLocalMediaVersionComments,
  updateLocalMediaVersionComments,
} from "./local-media-version-comments-store";

/**
 * The review notes browser storage holds for one Project Output. They are read
 * in every mode, so notes left offline survive signing in, and only a local
 * workspace writes to them.
 *
 * The notes come from the shared store, so a Project showing several Outputs
 * keeps every panel's notes: each panel reads the same list and writes through
 * the store rather than over its own copy of it.
 */
export function useLocalMediaVersionComments({
  outputId,
  mediaVersionIds,
  enabled,
}: {
  outputId: string;
  mediaVersionIds: readonly string[];
  enabled: boolean;
}) {
  const stored = useSyncExternalStore(
    subscribeToLocalMediaVersionComments,
    localMediaVersionCommentsSnapshot,
    localMediaVersionCommentsSnapshot
  );
  const versionKey = mediaVersionIds.join(" ");

  // Notes go with the Media Version they were left on.
  useEffect(() => {
    if (!enabled || !outputId || !versionKey) return;
    updateLocalMediaVersionComments((current) =>
      pruneLocalMediaVersionComments(current, outputId, versionKey.split(" "))
    );
  }, [enabled, outputId, versionKey]);

  const addComment = useCallback(
    (mediaVersionId: string, body: string, timestampSeconds?: number) =>
      updateLocalMediaVersionComments((current) =>
        addLocalMediaVersionComment(current, {
          id: newLocalMediaVersionCommentId(),
          outputId,
          mediaVersionId,
          authorName: LOCAL_COMMENT_AUTHOR,
          body,
          ...(timestampSeconds === undefined ? {} : { timestampSeconds }),
          resolved: false,
          createdAt: new Date().toISOString(),
        })
      ),
    [outputId]
  );

  const setResolved = useCallback(
    (commentId: string, resolved: boolean) =>
      updateLocalMediaVersionComments((current) =>
        resolveLocalMediaVersionComment(
          current,
          commentId,
          resolved,
          new Date().toISOString()
        )
      ),
    []
  );

  return {
    comments: localCommentsForOutput(stored, outputId, mediaVersionIds),
    addComment,
    setResolved,
  };
}

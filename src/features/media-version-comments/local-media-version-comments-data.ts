"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaVersionComment } from "./media-version-comments";
import {
  LOCAL_COMMENT_AUTHOR,
  addLocalMediaVersionComment,
  localCommentsForOutput,
  newLocalMediaVersionCommentId,
  pruneLocalMediaVersionComments,
  readLocalMediaVersionComments,
  resolveLocalMediaVersionComment,
  writeLocalMediaVersionComments,
} from "./local-media-version-comments";

/**
 * The review notes browser storage holds for one Project Output. They are read
 * in every mode, so notes left offline survive signing in, and only a local
 * workspace writes to them.
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
  const [stored, setStored] = useState<readonly MediaVersionComment[]>([]);
  const [ready, setReady] = useState(false);
  const versionKey = mediaVersionIds.join(" ");

  useEffect(() => {
    setStored(readLocalMediaVersionComments());
    setReady(true);
  }, []);

  const update = useCallback(
    (
      updater: (
        current: readonly MediaVersionComment[]
      ) => MediaVersionComment[]
    ) =>
      setStored((current) => {
        const next = updater(current);
        writeLocalMediaVersionComments(next);
        return next;
      }),
    []
  );

  // Notes go with the Media Version they were left on.
  useEffect(() => {
    if (!enabled || !ready || !outputId || !versionKey) return;
    update((current) =>
      pruneLocalMediaVersionComments(current, outputId, versionKey.split(" "))
    );
  }, [enabled, outputId, ready, update, versionKey]);

  const addComment = useCallback(
    (mediaVersionId: string, body: string, timestampSeconds?: number) =>
      update((current) =>
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
    [outputId, update]
  );

  const setResolved = useCallback(
    (commentId: string, resolved: boolean) =>
      update((current) =>
        resolveLocalMediaVersionComment(
          current,
          commentId,
          resolved,
          new Date().toISOString()
        )
      ),
    [update]
  );

  return {
    comments: localCommentsForOutput(stored, outputId, mediaVersionIds),
    addComment,
    setResolved,
  };
}

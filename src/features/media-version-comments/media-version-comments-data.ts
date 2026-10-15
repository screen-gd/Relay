"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  parseMediaVersionComments,
  readMediaVersionComment,
  type MediaVersionCommentsAdapter,
} from "./media-version-comments";

export { parseMediaVersionComments };

export function useInternalMediaVersionComments(
  projectId: string,
  enabled: boolean
) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const available = enabled && isAuthenticated;
  const result = useQuery(
    api.mediaVersionComments.listForProject,
    available ? { projectId } : "skip"
  );
  const setResolvedMutation = useMutation(api.mediaVersionComments.setResolved);
  const comments = parseMediaVersionComments(result);
  const adapter: MediaVersionCommentsAdapter = {
    listForProject: async () => comments,
    setResolved: async (commentId, resolved) => {
      const updated = await setResolvedMutation({
        commentId: commentId as Id<"mediaVersionComments">,
        resolved,
      });
      const comment = readMediaVersionComment(updated);
      if (!comment) throw new Error("The updated comment was not returned.");
      return comment;
    },
  };
  return {
    comments,
    loading:
      enabled && (isLoading || (isAuthenticated && result === undefined)),
    adapter,
  };
}

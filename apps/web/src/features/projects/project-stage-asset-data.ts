"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { parseProjectStorageId } from "./project-cloud-adapter";

export const STAGE_ASSET_KINDS = [
  "brief",
  "raw_footage",
  "script",
  "brand",
  "other",
] as const;

export type StageAssetKind = (typeof STAGE_ASSET_KINDS)[number];
export type StageAssetId = Id<"projectStageAssets">;

/** Project stage assets: the list, the upload reservation, and the editors. */
export function useProjectStageAssets(
  projectId: string,
  includeArchived = false
) {
  const auth = useConvexAuth();
  const data = useQuery(
    api.stageAssets.listForProject,
    auth.isAuthenticated ? { projectId, includeArchived } : "skip"
  );
  return {
    ...auth,
    assets: data?.assets,
    limit: data?.limit,
    addLinkAsset: useMutation(api.stageAssets.addLinkAsset),
    generateUploadUrl: useMutation(api.stageAssets.generateUploadUrl),
    addUploadedAsset: useMutation(api.stageAssets.addUploadedAsset),
    removeAsset: useMutation(api.stageAssets.removeAsset),
    permanentlyDeleteAsset: useMutation(api.stageAssets.permanentlyDeleteAsset),
    releaseUploadReservation: useMutation(
      api.projectFiles.releaseUploadReservation
    ),
    parseStorageId: parseProjectStorageId,
  };
}

/** Asset counts for the board cards, keyed by Project id. */
export function useStageAssetCounts(projectIds: readonly string[]) {
  const { isAuthenticated } = useConvexAuth();
  const counts = useQuery(
    api.stageAssets.countsForProjects,
    isAuthenticated && projectIds.length
      ? { projectIds: [...projectIds] }
      : "skip"
  );
  return counts ?? {};
}

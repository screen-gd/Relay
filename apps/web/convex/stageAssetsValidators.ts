import { v } from "convex/values";

/** What a stage asset is for, independent of the stage it is attached to. */
export const stageAssetKindValidator = v.union(
  v.literal("brief"),
  v.literal("raw_footage"),
  v.literal("script"),
  v.literal("brand"),
  v.literal("other")
);

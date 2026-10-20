import { v } from "convex/values";

export const revisionStatus = v.union(
  v.literal("draft"),
  v.literal("accepted"),
  v.literal("resolved")
);
export const revisionDraft = v.object({
  theme: v.string(),
  text: v.string(),
  sources: v.array(v.number()),
  vague: v.boolean(),
  clarifyingQuestion: v.union(v.string(), v.null()),
  possibleNewScope: v.boolean(),
});
export const revisionItem = v.object({
  projectId: v.string(),
  mediaVersionId: v.id("projectMediaVersions"),
  runId: v.id("aiRuns"),
  sourceCommentIds: v.array(v.id("mediaVersionComments")),
  timestamps: v.array(v.number()),
  theme: v.string(),
  text: v.string(),
  vague: v.boolean(),
  clarifyingQuestion: v.union(v.string(), v.null()),
  possibleNewScope: v.boolean(),
  status: revisionStatus,
});

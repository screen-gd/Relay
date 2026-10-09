import { v } from "convex/values";

export const versionChangelog = v.object({
  projectId: v.string(),
  mediaVersionId: v.id("projectMediaVersions"),
  runId: v.id("aiRuns"),
  text: v.string(),
  sourceRevisionIds: v.array(v.id("revisionItems")),
  approvedText: v.optional(v.string()),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
});

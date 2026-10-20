import { v } from "convex/values";

export const statusChannel = v.union(
  v.literal("portal"),
  v.literal("email"),
  v.literal("whatsapp")
);
export const statusDraft = v.object({
  projectId: v.string(),
  runId: v.id("aiRuns"),
  requestedBy: v.string(),
  channel: statusChannel,
  text: v.string(),
  sourceOutputIds: v.array(v.string()),
  sourceCommentIds: v.array(v.id("mediaVersionComments")),
});

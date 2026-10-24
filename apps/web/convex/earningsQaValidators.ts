import { v } from "convex/values";

/** A number quoted in an answer and the sources the earnings tool returned for it. */
export const earningsCitation = v.object({
  label: v.string(),
  value: v.number(),
  projectIds: v.array(v.string()),
  salaryBatchIds: v.array(v.string()),
});

export const earningsAnswer = v.object({
  text: v.string(),
  citations: v.array(earningsCitation),
});

/**
 * One editor question. Created when the run is enqueued; `answer` is written
 * only after every cited number was checked against tool results.
 */
export const earningsQuestion = v.object({
  workspaceId: v.id("teamWorkspaces"),
  requestedBy: v.string(),
  runId: v.id("aiRuns"),
  question: v.string(),
  answer: v.optional(earningsAnswer),
});

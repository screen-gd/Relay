import { v } from "convex/values";

export const aiModelTierValidator = v.union(
  v.literal("default"),
  v.literal("better")
);

export const aiFailureCodeValidator = v.union(
  v.literal("provider_error"),
  /** The model's output failed the feature's `verify` check (e.g. numbers). */
  v.literal("verification_failed"),
  v.literal("disabled"),
  v.literal("access_revoked"),
  v.literal("timed_out")
);

const aiRunFields = v.object({
  workspaceId: v.id("teamWorkspaces"),
  requestedBy: v.string(),
  projectId: v.optional(v.string()),
  feature: v.string(),
  promptVersion: v.string(),
  modelTier: aiModelTierValidator,
  requestHash: v.string(),
  sourceIds: v.array(v.string()),
  month: v.string(),
});

const aiUsageFields = {
  provider: v.union(v.literal("google"), v.literal("openai")),
  modelId: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  costUsd: v.optional(v.number()),
};

export const aiRunValidator = v.union(
  aiRunFields.extend({ status: v.literal("queued") }),
  aiRunFields.extend({ status: v.literal("running"), startedAt: v.number() }),
  aiRunFields.extend({
    status: v.literal("succeeded"),
    startedAt: v.number(),
    completedAt: v.number(),
    outputJson: v.string(),
    ...aiUsageFields,
  }),
  aiRunFields.extend({
    status: v.literal("failed"),
    startedAt: v.optional(v.number()),
    completedAt: v.number(),
    failureCode: aiFailureCodeValidator,
  })
);

export const aiCompletionValidator = v.object({
  runId: v.id("aiRuns"),
  outputJson: v.string(),
  ...aiUsageFields,
});

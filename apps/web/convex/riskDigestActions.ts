import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObject } from "./aiGeneration";
import { RISK_DIGEST_FEATURE } from "./riskDigest";
import {
  riskDigestInputSchema,
  riskDigestOutputSchema,
  riskDigestPrompt,
} from "./riskDigestPrompt";

/** Worker for `riskDigest.generate`. `riskDigest.save` verifies the output. */
export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== RISK_DIGEST_FEATURE) return null;
    try {
      const input = riskDigestInputSchema.parse(JSON.parse(inputJson));
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: riskDigestPrompt(input),
        schema: riskDigestOutputSchema,
        save: (_output, completion) =>
          ctx.runMutation(internal.riskDigest.save, { completion }),
      });
    } catch {
      await ctx.runMutation(internal.aiRuns.fail, {
        runId,
        failureCode: "provider_error",
      });
    }
    return null;
  },
});

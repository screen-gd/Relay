import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObject } from "./aiGeneration";
import {
  revisionInputSchema,
  revisionOutputSchema,
  revisionPrompt,
} from "./revisionItemsPrompt";

export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== "feedback_revision_list") return null;
    try {
      const input = revisionInputSchema.parse(JSON.parse(inputJson));
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: revisionPrompt(input),
        schema: revisionOutputSchema,
        save: (output, completion) =>
          ctx.runMutation(internal.revisionItems.save, {
            completion,
            items: output.items,
          }),
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

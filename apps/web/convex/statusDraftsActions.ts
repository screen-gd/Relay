import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObject } from "./aiGeneration";
import {
  statusInputSchema,
  statusOutputSchema,
  statusPrompt,
} from "./statusDraftsPrompt";

/** Generates a private draft through the shared claim and save runner. */
export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== "client_status_draft") return null;
    try {
      const input = statusInputSchema.parse(JSON.parse(inputJson));
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: statusPrompt(input),
        schema: statusOutputSchema,
        save: (output, completion) =>
          ctx.runMutation(internal.statusDrafts.save, {
            completion,
            channel: input.channel,
            text: output.text,
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

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObject } from "./aiGeneration";
import {
  changelogInputSchema,
  changelogOutputSchema,
  changelogPrompt,
} from "./versionChangelogPrompt";

/** Generates a private draft through the shared claim and save runner. */
export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== "media_version_changelog") return null;
    try {
      const input = changelogInputSchema.parse(JSON.parse(inputJson));
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: changelogPrompt(input),
        schema: changelogOutputSchema,
        save: (output, completion) =>
          ctx.runMutation(internal.versionChangelog.save, {
            completion,
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

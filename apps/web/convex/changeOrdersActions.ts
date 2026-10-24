import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObject } from "./aiGeneration";
import { CHANGE_ORDER_FEATURE } from "./changeOrders";
import {
  changeOrderInputSchema,
  changeOrderOutputSchema,
  changeOrderPrompt,
} from "./changeOrdersPrompt";

/** Worker for `changeOrders.generate`. `changeOrders.save` verifies the output. */
export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== CHANGE_ORDER_FEATURE) return null;
    try {
      const input = changeOrderInputSchema.parse(JSON.parse(inputJson));
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: changeOrderPrompt(input),
        schema: changeOrderOutputSchema,
        save: (_output, completion) =>
          ctx.runMutation(internal.changeOrders.save, { completion }),
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

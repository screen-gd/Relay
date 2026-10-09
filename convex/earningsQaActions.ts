import { tool } from "ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateAiObjectWithTools } from "./aiGeneration";
import { EARNINGS_QA_FEATURE } from "./earningsQa";
import {
  earningsAnswerSchema,
  earningsQaInputSchema,
  earningsQaPrompt,
  earningsToolInputs,
  MAX_TOOL_STEPS,
  verifyEarningsAnswer,
} from "./earningsQaPrompt";

/**
 * Worker for `earningsQa.ask`. Tools call the internal `*ForRequester`
 * earnings queries with the run's stored Workspace and requester, so each
 * call re-checks that editor's Finance access and Project visibility. The
 * model only picks periods, Clients, granularity and row limits.
 */
export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== EARNINGS_QA_FEATURE) return null;
    const scope = {
      workspaceId: run.workspaceId,
      requestedBy: run.requestedBy,
    };
    try {
      const input = earningsQaInputSchema.parse(JSON.parse(inputJson));
      const tools = {
        totals: tool({
          description:
            "Earned, collected and outstanding totals for a period, split into Projects and Salary Batches.",
          inputSchema: earningsToolInputs.totals,
          execute: (args) =>
            ctx.runQuery(internal.earnings.totalsForRequester, {
              ...scope,
              ...args,
            }),
        }),
        byClient: tool({
          description:
            "Earnings per Client for a period, highest first, with clientId for filtering other tools.",
          inputSchema: earningsToolInputs.byClient,
          execute: (args) =>
            ctx.runQuery(internal.earnings.byClientForRequester, {
              ...scope,
              ...args,
            }),
        }),
        byPeriod: tool({
          description:
            "Earnings per calendar month, quarter or year across a bounded range.",
          inputSchema: earningsToolInputs.byPeriod,
          execute: (args) =>
            ctx.runQuery(internal.earnings.byPeriodForRequester, {
              ...scope,
              ...args,
            }),
        }),
        byProject: tool({
          description:
            "Delivered Projects in a period, newest first, with amount and paid status.",
          inputSchema: earningsToolInputs.byProject,
          execute: (args) =>
            ctx.runQuery(internal.earnings.byProjectForRequester, {
              ...scope,
              ...args,
            }),
        }),
        bySalaryBatch: tool({
          description:
            "Completed Salary Batches in a period, newest first, with amount and paid status.",
          inputSchema: earningsToolInputs.bySalaryBatch,
          execute: (args) =>
            ctx.runQuery(internal.earnings.bySalaryBatchForRequester, {
              ...scope,
              ...args,
            }),
        }),
      };
      await generateAiObjectWithTools(ctx, {
        runId,
        modelTier: run.modelTier,
        prompt: earningsQaPrompt(input),
        schema: earningsAnswerSchema,
        tools,
        maxSteps: MAX_TOOL_STEPS,
        verify: (answer, toolOutputs) =>
          verifyEarningsAnswer(answer, toolOutputs, input.today),
        save: (answer, completion) =>
          ctx.runMutation(internal.earningsQa.save, { completion, answer }),
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

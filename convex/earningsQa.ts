import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import {
  aiCompletionValidator,
  aiFailureCodeValidator,
  aiModelTierValidator,
} from "./aiValidators";
import { workspaceToday } from "./deadlineRiskRules";
import { requireFinanceMember } from "./earnings";
import {
  earningsAnswerSchema,
  earningsQaInputSchema,
  MAX_QUESTION_LENGTH,
} from "./earningsQaPrompt";
import { earningsAnswer } from "./earningsQaValidators";

export const EARNINGS_QA_FEATURE = "earnings_qa";
const RECENT_QUESTIONS = 10;

/** Owners and Editors with Finance permission; rechecked by every tool call. */
async function requireQaAccess(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  userId: string
) {
  const access = await requireFinanceMember(ctx, workspaceId, userId);
  await requireAiEditor(ctx, workspaceId, userId);
  return access;
}

/**
 * Enqueues an earnings question. Only the question text and the Workspace's
 * local date go to the model; figures arrive later through tool calls.
 */
export const ask = mutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    question: v.string(),
    modelTier: aiModelTierValidator,
  },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    { workspaceId, question, modelTier }
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const requestedBy = identity.tokenIdentifier;
    const { workspace } = await requireQaAccess(ctx, workspaceId, requestedBy);
    const parsed = earningsQaInputSchema.safeParse({
      question,
      today: workspaceToday(Date.now(), workspace.timeZone),
    });
    if (!parsed.success)
      throw new Error(
        `Questions must contain 3–${MAX_QUESTION_LENGTH} characters`
      );
    const result = await enqueueAiRun(
      ctx,
      {
        workspaceId,
        feature: EARNINGS_QA_FEATURE,
        promptVersion: "v1",
        modelTier,
        sourceIds: [],
        inputJson: JSON.stringify(parsed.data),
      },
      internal.earningsQaActions.run
    );
    const existing = await ctx.db
      .query("earningsQuestions")
      .withIndex("by_runId", (q) => q.eq("runId", result.runId))
      .unique();
    if (!existing) {
      await ctx.db.insert("earningsQuestions", {
        workspaceId,
        requestedBy,
        runId: result.runId,
        question: parsed.data.question,
      });
    }
    return result;
  },
});

/** The caller's recent questions, newest first, with live run state. */
export const recent = query({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.array(
    v.object({
      _id: v.id("earningsQuestions"),
      _creationTime: v.number(),
      runId: v.id("aiRuns"),
      question: v.string(),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed")
      ),
      failureCode: v.optional(aiFailureCodeValidator),
      modelTier: aiModelTierValidator,
      answer: v.optional(earningsAnswer),
    })
  ),
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireQaAccess(ctx, workspaceId, identity.tokenIdentifier);
    const questions = await ctx.db
      .query("earningsQuestions")
      .withIndex("by_workspaceId_and_requestedBy", (q) =>
        q
          .eq("workspaceId", workspaceId)
          .eq("requestedBy", identity.tokenIdentifier)
      )
      .order("desc")
      .take(RECENT_QUESTIONS);
    const rows = [];
    for (const row of questions) {
      const run = await ctx.db.get(row.runId);
      if (!run) continue;
      rows.push({
        _id: row._id,
        _creationTime: row._creationTime,
        runId: row.runId,
        question: row.question,
        status: run.status,
        ...(run.status === "failed" ? { failureCode: run.failureCode } : {}),
        modelTier: run.modelTier,
        ...(row.answer ? { answer: row.answer } : {}),
      });
    }
    return rows;
  },
});

/**
 * Stores an answer the action already verified against tool results.
 * Rechecks consent, role and Finance access, then completes atomically.
 */
export const save = internalMutation({
  args: { completion: aiCompletionValidator, answer: earningsAnswer },
  returns: v.boolean(),
  handler: async (ctx, { completion, answer }) => {
    const run = await ctx.db.get(completion.runId);
    if (!run || run.status !== "running" || run.feature !== EARNINGS_QA_FEATURE)
      return false;
    const { workspace } = await requireQaAccess(
      ctx,
      run.workspaceId,
      run.requestedBy
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    const parsed = earningsAnswerSchema.parse(answer);
    if (JSON.stringify(parsed) !== completion.outputJson)
      throw new Error("Earnings answer mismatch");
    const question = await ctx.db
      .query("earningsQuestions")
      .withIndex("by_runId", (q) => q.eq("runId", run._id))
      .unique();
    if (!question || question.requestedBy !== run.requestedBy)
      throw new Error("Question unavailable");
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    await ctx.db.patch(question._id, { answer: parsed });
    return true;
  },
});

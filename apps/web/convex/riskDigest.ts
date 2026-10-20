import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { enqueueAiRun, requireAiEditor } from "./aiRuns";
import {
  aiCompletionValidator,
  aiFailureCodeValidator,
  aiModelTierValidator,
} from "./aiValidators";
import {
  requireRiskViewer,
  scanWorkspaceNow,
  visibleFindings,
} from "./deadlineRisk";
import {
  MAX_DIGEST_FINDINGS,
  riskDigestInputSchema,
  riskDigestOutputSchema,
  verifyRiskDigest,
  type RiskDigestInput,
} from "./riskDigestPrompt";
import { riskDigestItem } from "./riskDigestValidators";

export const RISK_DIGEST_FEATURE = "deadline_risk_digest";

/** Model input built only from stored rule findings: titles, kinds, dates and day counts. */
function digestInput(
  evaluatedOn: string,
  items: Doc<"riskDigests">["items"]
): RiskDigestInput {
  return riskDigestInputSchema.parse({
    today: evaluatedOn,
    findings: items.map((item) => ({
      kind: item.kind,
      severity: item.severity,
      waitingOn: item.waitingOn,
      projectTitle: item.projectTitle.slice(0, 160),
      outputTitle: item.outputTitle?.slice(0, 160) ?? null,
      dueDate: item.dueDate,
      daysUntilDue: item.daysUntilDue,
    })),
  });
}

/**
 * Editor-triggered digest. Re-runs the Workspace's deadline scan first so the
 * digest uses current findings, then reads the caller's visible findings
 * server-side and enqueues an AI run that may only rephrase them. Never runs
 * from the cron and never sends anything.
 */
export const generate = mutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    modelTier: aiModelTierValidator,
  },
  returns: v.object({ runId: v.id("aiRuns"), reused: v.boolean() }),
  handler: async (
    ctx,
    { workspaceId, modelTier }
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const requestedBy = identity.tokenIdentifier;
    // Check access before the scan writes anything.
    await requireRiskViewer(ctx, workspaceId, requestedBy);
    await scanWorkspaceNow(ctx, workspaceId);
    const { evaluatedOn, findings } = await visibleFindings(
      ctx,
      workspaceId,
      requestedBy
    );
    if (!evaluatedOn || !findings.length)
      throw new Error("No deadline risks to summarise");
    const selected = findings.slice(0, MAX_DIGEST_FINDINGS);
    const items = selected.map(
      ({
        _id,
        _creationTime,
        workspaceId: _workspace,
        state,
        relatedOutputIds,
        ...item
      }) => item
    );
    const result = await enqueueAiRun(
      ctx,
      {
        workspaceId,
        feature: RISK_DIGEST_FEATURE,
        promptVersion: "v1",
        modelTier,
        sourceIds: selected.map((finding) => finding._id),
        inputJson: JSON.stringify(digestInput(evaluatedOn, items)),
      },
      internal.riskDigestActions.run
    );
    const existing = await ctx.db
      .query("riskDigests")
      .withIndex("by_runId", (q) => q.eq("runId", result.runId))
      .unique();
    if (!existing) {
      await ctx.db.insert("riskDigests", {
        workspaceId,
        requestedBy,
        runId: result.runId,
        evaluatedOn,
        totalFindings: findings.length,
        items,
      });
    }
    return result;
  },
});

/** The caller's most recent digest with its live run state. */
export const latest = query({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.union(
    v.null(),
    v.object({
      runId: v.id("aiRuns"),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed")
      ),
      failureCode: v.optional(aiFailureCodeValidator),
      modelTier: aiModelTierValidator,
      evaluatedOn: v.string(),
      totalFindings: v.number(),
      items: v.array(
        riskDigestItem.extend({ line: v.union(v.string(), v.null()) })
      ),
    })
  ),
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireRiskViewer(ctx, workspaceId, identity.tokenIdentifier);
    const digest = await ctx.db
      .query("riskDigests")
      .withIndex("by_workspaceId_and_requestedBy", (q) =>
        q
          .eq("workspaceId", workspaceId)
          .eq("requestedBy", identity.tokenIdentifier)
      )
      .order("desc")
      .first();
    const run = digest ? await ctx.db.get(digest.runId) : null;
    if (!digest || !run) return null;
    return {
      runId: digest.runId,
      status: run.status,
      ...(run.status === "failed" ? { failureCode: run.failureCode } : {}),
      modelTier: run.modelTier,
      evaluatedOn: digest.evaluatedOn,
      totalFindings: digest.totalFindings,
      items: digest.items.map((item, index) => ({
        ...item,
        line: digest.lines?.[index] ?? null,
      })),
    };
  },
});

/**
 * Verifies the model output against the stored finding snapshot, rechecks
 * consent and access, then completes the run and stores lines atomically.
 */
export const save = internalMutation({
  args: { completion: aiCompletionValidator },
  returns: v.boolean(),
  handler: async (ctx, { completion }) => {
    const run = await ctx.db.get(completion.runId);
    if (!run || run.status !== "running" || run.feature !== RISK_DIGEST_FEATURE)
      return false;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    await requireRiskViewer(ctx, run.workspaceId, run.requestedBy);
    const digest = await ctx.db
      .query("riskDigests")
      .withIndex("by_runId", (q) => q.eq("runId", run._id))
      .unique();
    if (!digest || digest.requestedBy !== run.requestedBy)
      throw new Error("Digest unavailable");
    const output = riskDigestOutputSchema.parse(
      JSON.parse(completion.outputJson)
    );
    verifyRiskDigest(digestInput(digest.evaluatedOn, digest.items), output);
    if (!(await ctx.runMutation(internal.aiRuns.complete, completion)))
      return false;
    await ctx.db.patch(digest._id, {
      lines: output.lines.map((line) => line.text),
    });
    return true;
  },
});

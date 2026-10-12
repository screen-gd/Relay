import { v } from "convex/values";

/** Whether Included Rounds apply to each output or to the whole Project. */
export const roundBasisValidator = v.union(
  v.literal("per_output"),
  v.literal("per_project")
);

/**
 * Facts sent to the model for a change-order draft. Every count and amount
 * is computed in code (`revisionRoundsRules.ts`); the model may only quote
 * them. Mirrors `changeOrderInputSchema` in `changeOrdersPrompt.ts`.
 */
export const changeOrderFacts = v.object({
  projectTitle: v.string(),
  currencyCode: v.string(),
  includedRounds: v.union(v.number(), v.null()),
  roundBasis: roundBasisValidator,
  /** Rounds used across all listed outputs. */
  roundsUsed: v.number(),
  outputs: v.array(
    v.object({
      title: v.string(),
      roundsUsed: v.number(),
      /** Null per project, where only the Project total is billable. */
      extraRounds: v.union(v.number(), v.null()),
    })
  ),
  extraRounds: v.number(),
  extraHours: v.number(),
  rates: v.object({
    extraRound: v.union(v.number(), v.null()),
    extraHour: v.union(v.number(), v.null()),
  }),
  amounts: v.object({
    extraRounds: v.union(v.number(), v.null()),
    extraHours: v.union(v.number(), v.null()),
    total: v.union(v.number(), v.null()),
  }),
  revisionItems: v.array(
    v.object({
      theme: v.string(),
      text: v.string(),
      possibleNewScope: v.boolean(),
    })
  ),
});

export const changeOrderDraft = v.object({
  projectId: v.string(),
  runId: v.id("aiRuns"),
  requestedBy: v.string(),
  facts: changeOrderFacts,
  /** Public Project Output IDs in the same order as `facts.outputs`. */
  sourceOutputIds: v.array(v.string()),
  sourceRevisionItemIds: v.array(v.id("revisionItems")),
  /** Set once the verified draft is saved; the editor may edit both. */
  subject: v.optional(v.string()),
  message: v.optional(v.string()),
});

import { v } from "convex/values";
import { deadlineRiskFindingValidator } from "./deadlineRiskRules";

/** Snapshot of one rule finding sent to the model, kept so lines can link back. */
export const riskDigestItem = deadlineRiskFindingValidator.omit(
  "state",
  "relatedOutputIds"
);

/**
 * One editor-requested digest. Created when the run is enqueued; `lines`
 * (one per item, same order) is written only by a verified completion.
 */
export const riskDigest = v.object({
  workspaceId: v.id("teamWorkspaces"),
  requestedBy: v.string(),
  runId: v.id("aiRuns"),
  evaluatedOn: v.string(),
  /** Visible findings at request time; items holds the first `MAX_DIGEST_FINDINGS`. */
  totalFindings: v.number(),
  items: v.array(riskDigestItem),
  lines: v.optional(v.array(v.string())),
});

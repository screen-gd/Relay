import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  changeOrderDraft,
  roundBasisValidator,
} from "./changeOrdersValidators";

/** Revision-round scope and change-order tables (#78), spread into the schema. */
export const revisionScopeTables = {
  /** Workspace defaults: included rounds and saved rates for extra work. */
  revisionScopeSettings: defineTable({
    workspaceId: v.id("teamWorkspaces"),
    defaultIncludedRounds: v.optional(v.number()),
    /** Unset means per output. */
    roundBasis: v.optional(roundBasisValidator),
    extraRoundRate: v.optional(v.number()),
    extraHourRate: v.optional(v.number()),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_workspaceId", ["workspaceId"]),
  /** Included rounds for projects created from a Workflow Template (package). */
  revisionTemplateLimits: defineTable({
    workspaceId: v.id("teamWorkspaces"),
    templateId: v.string(),
    includedRounds: v.number(),
  }).index("by_workspaceId_and_templateId", ["workspaceId", "templateId"]),
  /**
   * Project-specific included rounds and round basis, each overriding the
   * template and Workspace defaults when set.
   */
  projectRevisionScopes: defineTable({
    projectId: v.string(),
    includedRounds: v.optional(v.number()),
    roundBasis: v.optional(roundBasisValidator),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_projectId", ["projectId"]),
  /** Editor correction to one Project Output's computed round count. */
  revisionRoundCorrections: defineTable({
    projectId: v.string(),
    outputId: v.id("projectOutputs"),
    adjustment: v.number(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_outputId", ["outputId"]),
  changeOrderDrafts: defineTable(changeOrderDraft)
    .index("by_projectId_and_requestedBy", ["projectId", "requestedBy"])
    .index("by_runId", ["runId"]),
};

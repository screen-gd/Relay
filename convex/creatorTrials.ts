import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  currentWorkspace,
  resolveWorkspaceEntitlements,
} from "./workspaceSubscriptions";

const CREATOR_TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const getAvailability = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      canStart: v.boolean(),
      used: v.boolean(),
      active: v.boolean(),
      endsAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const current = await currentWorkspace(ctx, identity.tokenIdentifier);
    if (!current) return null;
    const workspaceTrial = await ctx.db
      .query("creatorTrials")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", current.workspace._id)
      )
      .unique();
    const ownerTrial = await ctx.db
      .query("creatorTrials")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    const subscription = await resolveWorkspaceEntitlements(
      ctx,
      current.workspace._id
    );
    const active =
      workspaceTrial?.status === "active" &&
      subscription.plan === "creator" &&
      subscription.subscriptionStatus === "trialing";
    const isOwner =
      current.membership.role === "Owner" &&
      current.workspace.ownerUserId === identity.tokenIdentifier;
    return {
      canStart:
        isOwner &&
        !workspaceTrial &&
        !ownerTrial &&
        subscription.plan === "free" &&
        subscription.subscriptionStatus === "free",
      used: Boolean(workspaceTrial || ownerTrial),
      active,
      endsAt: active && workspaceTrial ? workspaceTrial.endsAt : null,
    };
  },
});

export const start = mutation({
  args: {},
  returns: v.id("creatorTrials"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const current = await currentWorkspace(ctx, identity.tokenIdentifier);
    if (
      !current ||
      current.membership.role !== "Owner" ||
      current.workspace.ownerUserId !== identity.tokenIdentifier
    ) {
      throw new Error("Only the Workspace Owner can start a Creator trial");
    }
    const existing = await ctx.db
      .query("creatorTrials")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", current.workspace._id)
      )
      .unique();
    if (existing) {
      if (
        existing.status === "active" &&
        existing.userId === identity.tokenIdentifier &&
        Date.now() < existing.endsAt
      ) {
        return existing._id;
      }
      throw new Error("This Workspace has already used its Creator trial");
    }
    const previous = await ctx.db
      .query("creatorTrials")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    if (previous)
      throw new Error("This account has already used its Creator trial");
    const subscription = await resolveWorkspaceEntitlements(
      ctx,
      current.workspace._id
    );
    if (
      subscription.plan !== "free" ||
      subscription.subscriptionStatus !== "free"
    ) {
      throw new Error("Creator trials are only available to Free Workspaces");
    }
    const startsAt = Date.now();
    const endsAt = startsAt + CREATOR_TRIAL_DURATION_MS;
    const trialId = await ctx.db.insert("creatorTrials", {
      workspaceId: current.workspace._id,
      userId: identity.tokenIdentifier,
      startsAt,
      endsAt,
      status: "active",
    });
    await ctx.scheduler.runAt(endsAt, internal.creatorTrials.expire, {
      trialId,
    });
    return trialId;
  },
});

export const expire = internalMutation({
  args: { trialId: v.id("creatorTrials") },
  returns: v.null(),
  handler: async (ctx, { trialId }) => {
    const trial = await ctx.db.get(trialId);
    if (trial?.status === "active" && Date.now() >= trial.endsAt) {
      await ctx.db.patch(trialId, { status: "expired" });
    }
    return null;
  },
});

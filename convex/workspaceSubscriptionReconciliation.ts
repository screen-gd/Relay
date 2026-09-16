"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  env,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import { parseClerkBillingSubscription } from "./billingParsing";

function statusCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error))
    return null;
  const status = error.status;
  return typeof status === "number" ? status : null;
}

type ReconciliationResult = {
  kind: "synced" | "ignored";
  subscriptionStatus: "free" | "trialing" | "active" | "past_due" | "canceled";
};

const reconciliationResultValidator = v.object({
  kind: v.union(v.literal("synced"), v.literal("ignored")),
  subscriptionStatus: v.union(
    v.literal("free"),
    v.literal("trialing"),
    v.literal("active"),
    v.literal("past_due"),
    v.literal("canceled")
  ),
});

async function clerkSubscriptionForUser(clerkUserId: string) {
  if (!env.CLERK_SECRET_KEY)
    throw new Error("Clerk reconciliation is not configured");
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  try {
    return await Promise.race([
      clerk.billing.getUserBillingSubscription(clerkUserId),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Clerk reconciliation timed out")),
          5_000
        )
      ),
    ]);
  } catch (error) {
    if (statusCode(error) !== 404) throw error;
    return {
      id: undefined,
      status: "active",
      payerId: clerkUserId,
      updatedAt: Date.now(),
      subscriptionItems: [
        {
          status: "active",
          plan: { slug: "free_user", isDefault: true },
          planPeriod: "month",
          payerId: clerkUserId,
          isFreeTrial: false,
          periodStart: Date.now(),
          periodEnd: null,
        },
      ],
    };
  }
}

function parseAuthoritativeSubscription(
  subscription: unknown,
  clerkUserId: string,
  eventAtFallback: string
) {
  const confirmation = parseClerkBillingSubscription(
    subscription,
    eventAtFallback,
    clerkUserId
  );
  if (!confirmation)
    throw new Error("Clerk returned an unsupported billing subscription");
  if (confirmation.clerkUserId !== clerkUserId)
    throw new Error(
      "Clerk billing payer does not match the authenticated user"
    );
  return confirmation;
}

async function reconcileCurrentHandler(
  ctx: ActionCtx
): Promise<ReconciliationResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const canReconcile: boolean = await ctx.runQuery(
    internal.workspaceSubscriptions.canReconcileCurrent,
    {}
  );
  if (!canReconcile)
    throw new Error("Only the Workspace Owner can reconcile billing");
  const eventAtFallback = new Date().toISOString();
  const confirmation = parseAuthoritativeSubscription(
    await clerkSubscriptionForUser(identity.subject),
    identity.subject,
    eventAtFallback
  );

  let result: "synced" | "ignored" = "synced";
  try {
    await ctx.runMutation(
      internal.workspaceSubscriptions.confirmForClerkUser,
      confirmation
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Clerk user subscription missing")
    ) {
      throw error;
    }
    result = "ignored";
  }
  return { kind: result, subscriptionStatus: confirmation.subscriptionStatus };
}

export const reconcileCurrent = action({
  args: {},
  returns: reconciliationResultValidator,
  handler: reconcileCurrentHandler,
});

type ReconcileDeliveryArgs = {
  deliveryId: string;
  eventType: string;
  clerkUserId: string;
  receivedAt: string;
};

async function reconcileClerkUserDeliveryHandler(
  ctx: ActionCtx,
  args: ReconcileDeliveryArgs
): Promise<"synced" | "ignored" | "duplicate"> {
  const alreadyProcessed: boolean = await ctx.runQuery(
    internal.workspaceSubscriptions.hasClerkBillingDelivery,
    { deliveryId: args.deliveryId }
  );
  if (alreadyProcessed) return "duplicate";
  const confirmation = parseAuthoritativeSubscription(
    await clerkSubscriptionForUser(args.clerkUserId),
    args.clerkUserId,
    args.receivedAt
  );
  return await ctx.runMutation(
    internal.workspaceSubscriptions.processClerkBillingDelivery,
    {
      deliveryId: args.deliveryId,
      eventType: args.eventType,
      clerkUserId: args.clerkUserId,
      receivedAt: args.receivedAt,
      confirmation,
    }
  );
}

export const reconcileClerkUserDelivery = internalAction({
  args: {
    deliveryId: v.string(),
    eventType: v.string(),
    clerkUserId: v.string(),
    receivedAt: v.string(),
  },
  returns: v.union(
    v.literal("synced"),
    v.literal("ignored"),
    v.literal("duplicate")
  ),
  handler: reconcileClerkUserDeliveryHandler,
});

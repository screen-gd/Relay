/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import {
  parseClerkBillingEvent,
  parseClerkBillingSubscription,
} from "./billingParsing";

const modules = import.meta.glob("./**/*.ts");

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({
    tokenIdentifier: `test|${userId}`,
    subject: userId,
  });
}

async function createWorkspace(
  t: ReturnType<typeof convexTest>,
  userId: string
): Promise<Id<"teamWorkspaces">> {
  const workspaceId = await asUser(t, userId).mutation(
    api.team.createWorkspace,
    {
      name: "Billing workspace",
    }
  );
  const normalized = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", workspaceId)
  );
  if (!normalized) throw new Error("Workspace creation returned an invalid ID");
  return normalized;
}

const creatorConfirmation = {
  clerkUserId: "owner",
  clerkSubscriptionId: "sub_creator",
  clerkPlanId: "creator_plan",
  billingPeriod: "monthly" as const,
  subscriptionStatus: "active" as const,
  confirmedEditorQuantity: 1,
  includedEditorSeatQuantity: 1,
  purchasedExtraEditorSeatQuantity: 0,
  storageAddonQuantity: 0,
  clerkEventAt: "2026-09-03T00:00:00.000Z",
};

describe("Clerk billing parsing", () => {
  test("maps trialing, paid, and past-due webhook states", () => {
    const base = {
      id: "sub_creator",
      payer: { user_id: "owner" },
      updated_at: Date.parse("2026-09-03T00:00:00.000Z"),
      items: [
        {
          status: "active",
          plan_period: "annual",
          period_start: Date.parse("2026-09-01T00:00:00.000Z"),
          period_end: Date.parse("2026-09-08T00:00:00.000Z"),
          is_free_trial: true,
          plan: { slug: "creator_plan", is_default: false },
        },
      ],
    };

    expect(
      parseClerkBillingEvent(
        { type: "subscription.active", data: base },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({
      clerkUserId: "owner",
      clerkPlanId: "creator_plan",
      billingPeriod: "annual",
      subscriptionStatus: "trialing",
      trialEndsAt: "2026-09-08T00:00:00.000Z",
    });

    expect(
      parseClerkBillingEvent(
        {
          type: "subscription.pastDue",
          data: { ...base, status: "past_due" },
        },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({ subscriptionStatus: "past_due" });
  });

  test("maps the installed Backend API subscription shape", () => {
    expect(
      parseClerkBillingSubscription(
        {
          id: "sub_creator",
          payerId: "owner",
          status: "active",
          updatedAt: Date.parse("2026-09-03T00:00:00.000Z"),
          subscriptionItems: [
            {
              payerId: "owner",
              status: "active",
              planPeriod: "month",
              periodStart: Date.parse("2026-09-03T00:00:00.000Z"),
              periodEnd: Date.parse("2026-10-03T00:00:00.000Z"),
              isFreeTrial: false,
              plan: { slug: "creator_plan", isDefault: false },
            },
          ],
        },
        "2026-09-01T00:00:00.000Z",
        "owner"
      )
    ).toMatchObject({
      clerkUserId: "owner",
      clerkPlanId: "creator_plan",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      clerkEventAt: "2026-09-03T00:00:00.000Z",
    });
  });

  test("does not grant paid access for upcoming items or failed payments", () => {
    const upcoming = {
      id: "sub_upcoming",
      payer: { user_id: "owner" },
      status: "active",
      updated_at: Date.parse("2026-09-03T00:00:00.000Z"),
      items: [
        {
          status: "upcoming",
          plan_period: "month",
          plan: { slug: "creator_plan", is_default: false },
        },
      ],
    };
    expect(
      parseClerkBillingEvent(
        { type: "subscription.updated", data: upcoming },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({ subscriptionStatus: "canceled" });

    expect(
      parseClerkBillingEvent(
        {
          type: "paymentAttempt.updated",
          data: {
            status: "failed",
            updated_at: Date.parse("2026-09-03T00:00:00.000Z"),
            payer: { user_id: "owner" },
            subscription_items: [
              {
                status: "active",
                plan_period: "month",
                plan: { slug: "creator_plan", is_default: false },
              },
            ],
          },
        },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({ subscriptionStatus: "past_due" });

    expect(
      parseClerkBillingEvent(
        {
          type: "subscription.updated",
          data: {
            ...upcoming,
            items: [
              {
                status: "ended",
                plan_period: "month",
                plan: { slug: "creator_plan", is_default: false },
              },
            ],
          },
        },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({ subscriptionStatus: "canceled" });

    expect(
      parseClerkBillingEvent(
        {
          type: "subscriptionItem.ended",
          data: {
            status: "ended",
            payer: { user_id: "owner" },
            updated_at: Date.parse("2026-09-04T00:00:00.000Z"),
          },
        },
        "2026-09-01T00:00:00.000Z"
      )
    ).toMatchObject({
      clerkPlanId: "free_user",
      subscriptionStatus: "canceled",
    });
  });
});

describe("Clerk billing delivery lifecycle", () => {
  test("deduplicates delivery IDs without replaying confirmation", async () => {
    const t = convexTest(schema, modules);
    const workspaceId = await createWorkspace(t, "owner");

    await expect(
      t.mutation(internal.workspaceSubscriptions.processClerkBillingDelivery, {
        deliveryId: "delivery_1",
        eventType: "subscription.active",
        receivedAt: "2026-09-03T00:00:00.000Z",
        confirmation: creatorConfirmation,
      })
    ).resolves.toBe("synced");
    await expect(
      t.mutation(internal.workspaceSubscriptions.processClerkBillingDelivery, {
        deliveryId: "delivery_1",
        eventType: "subscription.active",
        receivedAt: "2026-09-03T00:01:00.000Z",
        confirmation: {
          ...creatorConfirmation,
          clerkPlanId: "free_user",
          subscriptionStatus: "free",
          billingPeriod: null,
          clerkEventAt: "2026-09-04T00:00:00.000Z",
        },
      })
    ).resolves.toBe("duplicate");

    const projection = await t.run((ctx) =>
      ctx.db
        .query("workspaceSubscriptions")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
        .unique()
    );
    expect(projection?.plan).toBe("creator");
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("clerkBillingWebhookDeliveries")
          .withIndex("by_deliveryId", (q) => q.eq("deliveryId", "delivery_1"))
          .unique()
      )
    ).resolves.toMatchObject({ eventType: "subscription.active" });
  });

  test("does not record a delivery when confirmation fails", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t, "owner");

    await expect(
      t.mutation(internal.workspaceSubscriptions.processClerkBillingDelivery, {
        deliveryId: "delivery_bad",
        eventType: "subscription.updated",
        receivedAt: "2026-09-03T00:00:00.000Z",
        confirmation: { ...creatorConfirmation, clerkPlanId: "unknown" },
      })
    ).rejects.toThrow("Unknown Clerk plan identifier");
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("clerkBillingWebhookDeliveries")
          .withIndex("by_deliveryId", (q) => q.eq("deliveryId", "delivery_bad"))
          .unique()
      )
    ).resolves.toBeNull();
  });
});

/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const clerkBillingMock = vi.hoisted(() => ({
  getUserBillingSubscription: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({ billing: clerkBillingMock })),
}));

const modules = import.meta.glob("./**/*.ts");

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({
    tokenIdentifier: `test|${userId}`,
    subject: userId,
  });
}

async function createWorkspace(
  t: ReturnType<typeof convexTest>,
  userId = "owner"
): Promise<Id<"teamWorkspaces">> {
  const workspaceId = await asUser(t, userId).mutation(
    api.team.createWorkspace,
    {
      name: "Billing reconciliation",
    }
  );
  const normalized = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", workspaceId)
  );
  if (!normalized) throw new Error("Workspace creation returned an invalid ID");
  return normalized;
}

function creatorSubscription(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-secret");
  clerkBillingMock.getUserBillingSubscription.mockReset();
  vi.useRealTimers();
});

describe("authenticated billing reconciliation", () => {
  test("uses an authoritative User snapshot for item deliveries", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t);
    clerkBillingMock.getUserBillingSubscription.mockResolvedValue(
      creatorSubscription()
    );

    await expect(
      t.action(
        internal.workspaceSubscriptionReconciliation.reconcileClerkUserDelivery,
        {
          deliveryId: "delivery_item",
          eventType: "subscriptionItem.ended",
          clerkUserId: "owner",
          receivedAt: "2026-09-04T00:00:00.000Z",
        }
      )
    ).resolves.toBe("synced");
    await expect(
      t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).resolves.toMatchObject({ plan: "creator", subscriptionStatus: "active" });
  });

  test("reads one user subscription and projects it for the owner", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t);
    clerkBillingMock.getUserBillingSubscription.mockResolvedValue(
      creatorSubscription()
    );

    await expect(
      asUser(t, "owner").action(
        api.workspaceSubscriptionReconciliation.reconcileCurrent,
        {}
      )
    ).resolves.toMatchObject({ kind: "synced", subscriptionStatus: "active" });
    expect(clerkBillingMock.getUserBillingSubscription).toHaveBeenCalledWith(
      "owner"
    );
    await expect(
      t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).resolves.toMatchObject({ plan: "creator", clerkUserId: "owner" });
  });

  test("requires the authenticated Workspace Owner before calling Clerk", async () => {
    const t = convexTest(schema, modules);
    const workspaceId = await createWorkspace(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "test|editor",
        email: "editor@example.com",
        name: "Editor",
        role: "Editor",
        status: "active",
        permissions: {},
        createdAt: "2026-09-03T00:00:00.000Z",
      });
    });

    await expect(
      asUser(t, "editor").action(
        api.workspaceSubscriptionReconciliation.reconcileCurrent,
        {}
      )
    ).rejects.toThrow("Only the Workspace Owner");
    expect(clerkBillingMock.getUserBillingSubscription).not.toHaveBeenCalled();
  });

  test("requires billing repair before an unlinked new Owner can reconcile", async () => {
    const t = convexTest(schema, modules);
    const workspaceId = await createWorkspace(t);
    const nextOwnerId = await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "test|next-owner",
        email: "next-owner@example.com",
        name: "Next Owner",
        role: "Editor",
        status: "active",
        permissions: {},
        createdAt: "2026-09-03T00:00:00.000Z",
      })
    );
    await asUser(t, "owner").mutation(api.team.transferOwnership, {
      teamId: workspaceId,
      memberId: nextOwnerId,
    });

    await expect(
      asUser(t, "next-owner").action(
        api.workspaceSubscriptionReconciliation.reconcileCurrent,
        {}
      )
    ).rejects.toThrow("Billing must be repaired first");
    expect(clerkBillingMock.getUserBillingSubscription).not.toHaveBeenCalled();
  });

  test("maps a missing Backend API subscription to confirmed Free", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t);
    clerkBillingMock.getUserBillingSubscription.mockRejectedValue({
      status: 404,
    });

    await expect(
      asUser(t, "owner").action(
        api.workspaceSubscriptionReconciliation.reconcileCurrent,
        {}
      )
    ).resolves.toMatchObject({ kind: "synced", subscriptionStatus: "free" });
    await expect(
      t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).resolves.toMatchObject({ plan: "free", subscriptionStatus: "free" });
  });

  test("rejects a Backend API top-level payer mismatch", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t);
    clerkBillingMock.getUserBillingSubscription.mockResolvedValue(
      creatorSubscription({ payerId: "another-user" })
    );

    await expect(
      asUser(t, "owner").action(
        api.workspaceSubscriptionReconciliation.reconcileCurrent,
        {}
      )
    ).rejects.toThrow("payer does not match");
  });

  test("times out a hung Backend API call", async () => {
    const t = convexTest(schema, modules);
    await createWorkspace(t);
    clerkBillingMock.getUserBillingSubscription.mockReturnValue(
      new Promise(() => undefined)
    );
    vi.useFakeTimers();
    const result = asUser(t, "owner").action(
      api.workspaceSubscriptionReconciliation.reconcileCurrent,
      {}
    );
    const rejection = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5_001);
    await rejection;
  }, 10_000);

  test("does not regrant a subscription after ownership transfer races the read", async () => {
    const t = convexTest(schema, modules);
    const workspaceId = await createWorkspace(t);
    const nextOwnerId = await t.run(async (ctx) =>
      ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "test|next-owner",
        email: "next-owner@example.com",
        name: "Next Owner",
        role: "Editor",
        status: "active",
        permissions: {},
        createdAt: "2026-09-03T00:00:00.000Z",
      })
    );
    let resolveSubscription!: (value: unknown) => void;
    clerkBillingMock.getUserBillingSubscription.mockReturnValue(
      new Promise((resolve) => {
        resolveSubscription = resolve;
      })
    );
    const reconciliation = asUser(t, "owner").action(
      api.workspaceSubscriptionReconciliation.reconcileCurrent,
      {}
    );
    await vi.waitFor(() =>
      expect(clerkBillingMock.getUserBillingSubscription).toHaveBeenCalled()
    );
    await asUser(t, "owner").mutation(api.team.transferOwnership, {
      teamId: workspaceId,
      memberId: nextOwnerId,
    });
    resolveSubscription(creatorSubscription());

    await expect(reconciliation).resolves.toMatchObject({ kind: "ignored" });
    await expect(
      t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).resolves.toMatchObject({ plan: "free", reconciliationState: "repair" });
  });
});

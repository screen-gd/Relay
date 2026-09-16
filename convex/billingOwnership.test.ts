/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("ownership transfer detaches billing authority and preserves storage and members", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    tokenIdentifier: "test|owner",
    subject: "owner",
  });
  const successor = t.withIdentity({
    tokenIdentifier: "test|next",
    subject: "next",
  });
  const teamId = await owner.mutation(api.team.createWorkspace, {
    name: "Billing transfer",
  });
  const { memberId, projectionId } = await t.run(async (ctx) => {
    const projection = await ctx.db.query("workspaceSubscriptions").unique();
    if (!projection) throw new Error("Missing projection");
    await ctx.db.patch(projection._id, {
      plan: "team",
      subscriptionStatus: "active",
      billingPeriod: "annual",
      clerkSubscriptionId: "old-subscription",
      clerkPlanId: "team",
      includedEditorSeatQuantity: 3,
      confirmedEditorQuantity: 4,
      purchasedExtraEditorSeatQuantity: 1,
      retainedStorageBytes: 1234,
      reservedStorageBytes: 5678,
      reconciliationState: "synced",
    });
    const memberId = await ctx.db.insert("teamMembers", {
      teamId,
      userId: "test|next",
      email: "next@example.com",
      name: "Next Owner",
      role: "Editor",
      status: "active",
      permissions: {},
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    return { memberId, projectionId: projection._id };
  });

  await expect(
    successor.mutation(api.team.transferOwnership, { teamId, memberId })
  ).rejects.toThrow("Only the Workspace Owner");
  await expect(
    t.mutation(api.team.transferOwnership, { teamId, memberId })
  ).rejects.toThrow();
  await owner.mutation(api.team.transferOwnership, { teamId, memberId });

  const projection = await t.run((ctx) => ctx.db.get(projectionId));
  expect(projection).toMatchObject({
    plan: "free",
    reconciliationState: "repair",
    retainedStorageBytes: 1234,
    reservedStorageBytes: 5678,
    purchasedExtraEditorSeatQuantity: 0,
  });
  expect(projection?.clerkUserId).toBeUndefined();
  expect(projection?.clerkSubscriptionId).toBeUndefined();
  expect(
    await t.run((ctx) => ctx.db.query("teamMembers").take(3))
  ).toHaveLength(2);
  await expect(
    owner.mutation(api.workspaceSubscriptions.repairCurrent, {})
  ).rejects.toThrow("Only the Workspace Owner");
  await expect(
    t.mutation(internal.workspaceSubscriptions.confirmForClerkUser, {
      clerkUserId: "owner",
      clerkPlanId: "team",
      billingPeriod: "annual",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 4,
      includedEditorSeatQuantity: 3,
      purchasedExtraEditorSeatQuantity: 1,
      storageAddonQuantity: 0,
      clerkEventAt: "2026-09-17T00:00:00.000Z",
    })
  ).rejects.toThrow("Clerk user subscription missing");
  await successor.mutation(api.workspaceSubscriptions.repairCurrent, {});
  await expect(t.run((ctx) => ctx.db.get(projectionId))).resolves.toMatchObject(
    {
      clerkUserId: "next",
      plan: "free",
      reconciliationState: "repair",
    }
  );
  await expect(
    successor.query(api.workspaceSubscriptions.getCurrent, {})
  ).resolves.toMatchObject({
    plan: "free",
    canManageBilling: true,
    capabilities: { fileUploads: false },
  });
});

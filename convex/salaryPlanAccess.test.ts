/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Salary Plan reads require paid access and retain data after downgrade", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  const other = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Owner workspace" });
  await other.mutation(api.team.createWorkspace, { name: "Other workspace" });
  await expect(owner.query(api.salaryPlans.list, {})).rejects.toThrow(
    "Salary Plans require"
  );
  await expect(owner.query(api.salaryPlans.listBatches, {})).rejects.toThrow(
    "Salary Plans require"
  );

  const { projectionId, planId } = await t.run(async (ctx) => {
    const projection = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", "owner"))
      .unique();
    if (!projection) throw new Error("Missing projection");
    await ctx.db.patch(projection._id, {
      plan: "creator",
      subscriptionStatus: "active",
    });
    const otherProjection = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", "other"))
      .unique();
    if (!otherProjection) throw new Error("Missing other projection");
    await ctx.db.patch(otherProjection._id, {
      plan: "creator",
      subscriptionStatus: "active",
    });
    const planId = await ctx.db.insert("salaryPlans", {
      ownerUserId: "test|owner",
      clientId: "client",
      requiredProjectCount: 3,
      amount: 500,
      startDate: "2026-09-16",
      notes: "Private contract",
      archived: false,
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    });
    return { projectionId: projection._id, planId };
  });
  expect(await owner.query(api.salaryPlans.list, {})).toHaveLength(1);
  expect(await other.query(api.salaryPlans.list, {})).toEqual([]);
  expect(await other.query(api.salaryPlans.listBatches, {})).toEqual([]);
  expect(await t.query(api.salaryPlans.list, {})).toEqual([]);
  await t.run((ctx) =>
    ctx.db.patch(projectionId, { subscriptionStatus: "past_due" })
  );
  await expect(
    owner.query(api.salaryPlans.list, { includeArchived: true })
  ).rejects.toThrow("Salary Plans require");
  await expect(owner.query(api.salaryPlans.listBatches, {})).rejects.toThrow(
    "Salary Plans require"
  );
  expect(await t.run((ctx) => ctx.db.get(planId))).toMatchObject({
    notes: "Private contract",
  });
});

/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Salary Plans are free, owner-scoped, and available without a Workspace", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  const other = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("clients", {
      ownerUserId: "test|owner",
      id: "client",
      name: "Client",
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
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
    await ctx.db.insert("projectSalaryBatches", {
      ownerUserId: "test|owner",
      id: "salary-batch-1",
      number: 1,
      workType: "Job / Salary",
      requiredProjectCount: 3,
      amount: 500,
      projectIds: ["project-1", "project-2", "project-3"],
      salaryPlanId: planId,
      completedAt: "2026-09-16T00:00:00.000Z",
      paid: false,
    });
  });

  expect(await owner.query(api.salaryPlans.list, {})).toHaveLength(1);
  expect(await owner.query(api.salaryPlans.listBatches, {})).toHaveLength(1);
  expect(await other.query(api.salaryPlans.list, {})).toEqual([]);
  expect(await other.query(api.salaryPlans.listBatches, {})).toEqual([]);
  expect(await t.query(api.salaryPlans.list, {})).toEqual([]);
});

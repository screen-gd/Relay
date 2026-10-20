/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const testerId = "user_3IPYy4knUp1jfwBnjvWtWixBN6e";

afterEach(() => vi.useRealTimers());

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: testerId,
    tokenIdentifier: `test|${testerId}`,
  });
  const other = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
  });
  const id = await owner.mutation(api.team.createWorkspace, {
    name: "Plan tests",
  });
  const workspaceId = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", id)
  );
  if (!workspaceId) throw new Error("Invalid Workspace ID");
  return { t, owner, other, workspaceId };
}

test("only the designated account can switch its own Workspace plan", async () => {
  const { t, owner, other } = await fixture();
  await other.mutation(api.team.createWorkspace, { name: "Other Workspace" });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    canTestPlans: true,
    testPlan: null,
    plan: "free",
  });
  expect(
    await other.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    canTestPlans: false,
    testPlan: null,
    plan: "free",
  });
  await expect(
    other.mutation(api.workspaceSubscriptions.setTestPlan, { plan: "team" })
  ).rejects.toThrow("not available to this account");
  await expect(
    t.mutation(api.workspaceSubscriptions.setTestPlan, { plan: "team" })
  ).rejects.toThrow("Not authenticated");
  const differentIdentity = t.withIdentity({
    subject: testerId,
    tokenIdentifier: `another-issuer|${testerId}`,
  });
  await expect(
    differentIdentity.mutation(api.workspaceSubscriptions.setTestPlan, {
      plan: "team",
    })
  ).rejects.toThrow("Only your own Workspace");
});

test("switches real capability and seat checks between Free, Creator, and Team", async () => {
  const { owner, workspaceId } = await fixture();
  for (const plan of ["creator", "team", "free"] as const) {
    await owner.mutation(api.workspaceSubscriptions.setTestPlan, { plan });
    expect(
      await owner.query(api.workspaceSubscriptions.getCurrent, {})
    ).toMatchObject({
      plan,
      testPlan: plan,
      billingPeriod: null,
      trialEndsAt: null,
      subscriptionStatus: plan === "free" ? "free" : "active",
      openProjectLimit: plan === "free" ? 10 : null,
      editorSeatAllowance: plan === "team" ? 3 : 1,
      storageQuotaBytes:
        plan === "free"
          ? 0
          : plan === "creator"
            ? 5_000_000_000
            : 15_000_000_000,
      capabilities: {
        customWorkflowTemplates: plan !== "free",
        salaryPlans: plan !== "free",
        teamFeatures: plan === "team",
      },
    });
    const invite = owner.mutation(api.team.inviteMember, {
      teamId: workspaceId,
      email: "editor@example.com",
      role: "Editor",
    });
    if (plan === "team") await expect(invite).resolves.toBeNull();
    else await expect(invite).rejects.toThrow("Team plan");
  }
});

test("test access has no expiry and leaves billing records unchanged", async () => {
  const { t, owner } = await fixture();
  const before = await t.run((ctx) =>
    ctx.db.query("workspaceSubscriptions").unique()
  );
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, {
    plan: "creator",
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "creator",
    testPlan: "creator",
    trialEndsAt: null,
  });
  expect(
    await t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
  ).toEqual(before);
  expect(
    await t.run((ctx) => ctx.db.query("creatorTrials").unique())
  ).toBeNull();
});

test("billing updates preserve test access and normal access can be restored", async () => {
  const { t, owner, workspaceId } = await fixture();
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, {
    plan: "free",
  });
  await t.mutation(internal.workspaceSubscriptions.confirm, {
    workspaceId,
    clerkUserId: testerId,
    clerkPlanId: "team",
    billingPeriod: "monthly",
    subscriptionStatus: "active",
    confirmedEditorQuantity: 3,
    includedEditorSeatQuantity: 3,
    purchasedExtraEditorSeatQuantity: 0,
    storageAddonQuantity: 0,
    clerkEventAt: "2026-10-16T00:00:00.000Z",
  });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    testPlan: "free",
    capabilities: { teamFeatures: false },
  });
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, { plan: null });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "team",
    testPlan: null,
    billingPeriod: "monthly",
    editorSeatAllowance: 3,
  });
});

test("an active trial and its expiry cannot override the selected test plan", async () => {
  const { t, owner, workspaceId } = await fixture();
  const trialId = await t.run((ctx) =>
    ctx.db.insert("creatorTrials", {
      workspaceId,
      userId: `test|${testerId}`,
      startsAt: 0,
      endsAt: 1,
      status: "active",
    })
  );
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, {
    plan: "free",
  });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "free" });
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, {
    plan: "team",
  });
  await t.mutation(internal.creatorTrials.expire, { trialId });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "team" });
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, { plan: null });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "free", testPlan: null });
});

test("ownership transfer removes test access and neither member can change it", async () => {
  const { t, owner, other, workspaceId } = await fixture();
  await owner.mutation(api.workspaceSubscriptions.setTestPlan, {
    plan: "team",
  });
  const memberId = await t.run((ctx) =>
    ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "test|other",
      email: "other@example.com",
      name: "Other",
      role: "Editor",
      status: "active",
      permissions: {},
      createdAt: new Date().toISOString(),
    })
  );
  expect(
    await other.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "team",
    canTestPlans: false,
  });
  await expect(
    other.mutation(api.workspaceSubscriptions.setTestPlan, { plan: "creator" })
  ).rejects.toThrow("not available to this account");
  await owner.mutation(api.team.transferOwnership, {
    teamId: workspaceId,
    memberId,
  });
  expect(
    await other.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    testPlan: null,
    canTestPlans: false,
  });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    testPlan: null,
    canTestPlans: false,
  });
  await expect(
    owner.mutation(api.workspaceSubscriptions.setTestPlan, { plan: "team" })
  ).rejects.toThrow("Only your own Workspace");
});

test("an Owner membership alone cannot grant test access to someone else's Workspace", async () => {
  const { t, owner, workspaceId } = await fixture();
  await t.run((ctx) =>
    ctx.db.patch(workspaceId, { ownerUserId: "test|other" })
  );
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ canTestPlans: false });
  await expect(
    owner.mutation(api.workspaceSubscriptions.setTestPlan, { plan: "creator" })
  ).rejects.toThrow("Only your own Workspace");
});

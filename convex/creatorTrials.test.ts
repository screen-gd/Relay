/// <reference types="vite/client" />

import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { requireWorkspaceCapability } from "./workspaceSubscriptions";

const modules = import.meta.glob("./**/*.ts");
const startTime = new Date("2026-10-07T12:00:00.000Z");
const duration = 7 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(startTime);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function fixture() {
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  const editor = t.withIdentity({
    subject: "editor",
    tokenIdentifier: "test|editor",
  });
  const viewer = t.withIdentity({
    subject: "viewer",
    tokenIdentifier: "test|viewer",
  });
  const outsider = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "another-issuer|owner",
  });
  const createdId = await owner.mutation(api.team.createWorkspace, {
    name: "Trial Studio",
  });
  const workspaceId = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", createdId)
  );
  if (!workspaceId) throw new Error("Invalid workspace ID");
  const subscriptionId = await t.run(async (ctx) => {
    const subscription = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .unique();
    if (!subscription) throw new Error("Missing subscription");
    for (const [userId, role] of [
      ["test|editor", "Editor"],
      ["test|viewer", "Reviewer"],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        role,
        status: "active",
        permissions: { manageTeam: true },
        email: `${role}@example.com`,
        name: role,
        createdAt: startTime.toISOString(),
      });
    }
    return subscription._id;
  });
  return { t, owner, editor, viewer, outsider, workspaceId, subscriptionId };
}

test("a Free Owner explicitly starts a no-card trial with exactly seven days of Creator entitlements", async () => {
  const f = await fixture();
  expect(
    await f.owner.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ canStart: true, used: false, active: false });
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "free" });
  const trialId = await f.owner.mutation(api.creatorTrials.start, {});
  expect(await f.t.run((ctx) => ctx.db.get(trialId))).toMatchObject({
    workspaceId: f.workspaceId,
    userId: "test|owner",
    status: "active",
    startsAt: startTime.getTime(),
    endsAt: startTime.getTime() + duration,
  });
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "creator",
    subscriptionStatus: "trialing",
    billingPeriod: null,
    trialEndsAt: "2026-10-14T12:00:00.000Z",
    storageQuotaBytes: 5_000_000_000,
    editorSeatAllowance: 1,
    capabilities: {
      fileUploads: true,
      advancedReports: true,
      teamFeatures: false,
    },
  });
  expect(await f.t.run((ctx) => ctx.db.get(f.subscriptionId))).toMatchObject({
    plan: "free",
    subscriptionStatus: "free",
  });
  expect(await f.t.run((ctx) => ctx.db.get(f.workspaceId))).not.toHaveProperty(
    "aiEnabled"
  );
  expect(
    await f.owner.query(api.aiRuns.getSummary, {
      workspaceId: f.workspaceId,
      month: "2026-10",
    })
  ).toMatchObject({ enabled: false, limit: 300 });
});

test("unauthenticated users, other accounts, Editors and Viewers cannot start a Workspace trial", async () => {
  const f = await fixture();
  for (const caller of [f.t, f.outsider, f.editor, f.viewer]) {
    await expect(
      caller.mutation(api.creatorTrials.start, {})
    ).rejects.toThrow();
  }
  expect(await f.t.run((ctx) => ctx.db.query("creatorTrials").take(1))).toEqual(
    []
  );
  expect(
    await f.editor.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ canStart: false });
  expect(
    await f.viewer.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ canStart: false });
});

test("repeated starts reuse one trial and never extend its deadline", async () => {
  const f = await fixture();
  const trialId = await f.owner.mutation(api.creatorTrials.start, {});
  vi.setSystemTime(new Date(startTime.getTime() + 24 * 60 * 60 * 1000));
  expect(await f.owner.mutation(api.creatorTrials.start, {})).toBe(trialId);
  expect(
    await f.t.run((ctx) => ctx.db.query("creatorTrials").take(2))
  ).toHaveLength(1);
  expect(await f.t.run((ctx) => ctx.db.get(trialId))).toMatchObject({
    endsAt: startTime.getTime() + duration,
  });
});

test("expiry restores Free and blocks new Creator operations without deleting existing work", async () => {
  const f = await fixture();
  const trialId = await f.owner.mutation(api.creatorTrials.start, {});
  await f.owner.mutation(async (ctx) => {
    await requireWorkspaceCapability(ctx, f.workspaceId, "fileUploads");
  });
  await f.t.mutation(internal.creatorTrials.expire, { trialId });
  expect(
    await f.owner.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ active: true });
  await vi.advanceTimersByTimeAsync(duration - 1);
  await f.t.finishInProgressScheduledFunctions();
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "creator" });
  await vi.advanceTimersByTimeAsync(1);
  await f.t.finishInProgressScheduledFunctions();
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    storageQuotaBytes: 0,
    capabilities: {
      fileUploads: false,
      advancedReports: false,
      teamFeatures: false,
    },
  });
  expect(
    await f.owner.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ active: false, used: true, canStart: false });
  await expect(
    f.owner.mutation(async (ctx) => {
      await requireWorkspaceCapability(ctx, f.workspaceId, "fileUploads");
    })
  ).rejects.toThrow("Creator or Team plan");
  expect(await f.t.run((ctx) => ctx.db.get(f.workspaceId))).not.toBeNull();
  expect(await f.t.run((ctx) => ctx.db.get(f.subscriptionId))).not.toBeNull();
  expect(
    await f.owner.query(api.aiRuns.getSummary, {
      workspaceId: f.workspaceId,
      month: "2026-10",
    })
  ).toMatchObject({ limit: 10, enabled: false });
  await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "already used"
  );
});

test("an account cannot obtain another trial by recreating its Workspace", async () => {
  const f = await fixture();
  await f.owner.mutation(api.creatorTrials.start, {});
  await f.t.run(async (ctx) => {
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", f.workspaceId))
      .take(10);
    for (const member of memberships) await ctx.db.delete(member._id);
    await ctx.db.delete(f.workspaceId);
  });
  await f.owner.mutation(api.team.createWorkspace, { name: "Another Studio" });
  expect(
    await f.owner.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ used: true, canStart: false });
  await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "account has already used"
  );
});

test("a delayed expiry job cannot extend Creator capability mutations", async () => {
  const f = await fixture();
  await f.owner.mutation(api.creatorTrials.start, {});
  vi.setSystemTime(new Date(startTime.getTime() + duration));
  await expect(
    f.owner.mutation(async (ctx) => {
      await requireWorkspaceCapability(ctx, f.workspaceId, "fileUploads");
    })
  ).rejects.toThrow("Creator or Team plan");
  await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "already used"
  );
});

test("transferring ownership cannot restart the same Workspace trial", async () => {
  const f = await fixture();
  const trialId = await f.owner.mutation(api.creatorTrials.start, {});
  await f.t.run(async (ctx) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", f.workspaceId).eq("userId", "test|editor")
      )
      .unique();
    if (!member) throw new Error("Missing editor");
    await ctx.db.patch(member._id, { role: "Owner" });
    await ctx.db.patch(f.workspaceId, { ownerUserId: "test|editor" });
  });
  expect(
    await f.editor.query(api.creatorTrials.getAvailability, {})
  ).toMatchObject({ active: true, used: true, canStart: false });
  await expect(f.editor.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "Workspace has already used"
  );
  expect(await f.t.run((ctx) => ctx.db.get(trialId))).toMatchObject({
    endsAt: startTime.getTime() + duration,
  });
});

test.each(["creator", "team"] as const)(
  "an existing paid %s plan cannot start a free trial",
  async (plan) => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.subscriptionId, { plan, subscriptionStatus: "active" })
    );
    expect(
      await f.owner.query(api.creatorTrials.getAvailability, {})
    ).toMatchObject({ canStart: false });
    await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
      "only available to Free Workspaces"
    );
  }
);

test("delinquent and externally trialing Team plans cannot use Creator's trial or grant Team trial access", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, {
      plan: "creator",
      subscriptionStatus: "past_due",
    })
  );
  await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "only available to Free Workspaces"
  );
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, {
      plan: "team",
      subscriptionStatus: "trialing",
    })
  );
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    capabilities: { teamFeatures: false, fileUploads: false },
  });
  await expect(f.owner.mutation(api.creatorTrials.start, {})).rejects.toThrow(
    "only available to Free Workspaces"
  );
});

test("Free billing reconciliation does not revoke the local trial and expiry does not revoke paid access", async () => {
  const f = await fixture();
  const trialId = await f.owner.mutation(api.creatorTrials.start, {});
  await f.t.mutation(internal.workspaceSubscriptions.confirmForClerkUser, {
    clerkUserId: "owner",
    clerkPlanId: "free",
    billingPeriod: null,
    subscriptionStatus: "free",
    confirmedEditorQuantity: 1,
    includedEditorSeatQuantity: 1,
    purchasedExtraEditorSeatQuantity: 0,
    storageAddonQuantity: 0,
    clerkEventAt: startTime.toISOString(),
  });
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "creator", subscriptionStatus: "trialing" });
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, {
      plan: "team",
      subscriptionStatus: "active",
      includedEditorSeatQuantity: 3,
    })
  );
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "team", capabilities: { teamFeatures: true } });
  vi.setSystemTime(new Date(startTime.getTime() + duration));
  await f.t.mutation(internal.creatorTrials.expire, { trialId });
  expect(
    await f.owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "team", subscriptionStatus: "active" });
});

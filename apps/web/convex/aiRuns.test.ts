/// <reference types="vite/client" />

import { RateLimiter } from "@convex-dev/rate-limiter";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { anyApi, type ApiFromModules } from "convex/server";
import { v } from "convex/values";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { enqueueAiRun } from "./aiRuns";
import schema from "./schema";
import { seedAiKeys } from "./testHelpers/aiKeys.fixture";

const worker = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    if (await ctx.runMutation(internal.aiRuns.claim, { runId })) {
      await ctx.runMutation(internal.aiRuns.complete, {
        runId,
        outputJson: JSON.stringify({ draft: "AI-drafted test result" }),
        provider: "google",
        modelId: "test-model",
        inputTokens: 10,
        outputTokens: 20,
      });
    }
    return null;
  },
});
const workerApi: ApiFromModules<{
  aiTestWorker: { run: typeof worker };
}> = { aiTestWorker: { run: anyApi.aiTestWorker.run } };
const modules = {
  ...import.meta.glob("./**/*.ts"),
  "./aiTestWorker.ts": async () => ({ run: worker }),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function fixture(plan: Doc<"workspaceSubscriptions">["plan"] = "free") {
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const now = new Date().toISOString();
  const owner = t.withIdentity({
    tokenIdentifier: "issuer|owner",
    subject: "owner",
  });
  const editor = t.withIdentity({
    tokenIdentifier: "issuer|editor",
    subject: "editor",
  });
  const viewer = t.withIdentity({
    tokenIdentifier: "issuer|viewer",
    subject: "viewer",
  });
  const outsider = t.withIdentity({
    tokenIdentifier: "other-issuer|owner",
    subject: "owner",
  });
  const createdWorkspaceId = await owner.mutation(api.team.createWorkspace, {
    name: "AI Studio",
  });
  const workspaceId = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", createdWorkspaceId)
  );
  if (!workspaceId) throw new Error("Invalid workspace ID");
  const subscriptionId = await t.run(async (ctx) => {
    for (const [userId, role] of [
      ["issuer|editor", "Editor"],
      ["issuer|viewer", "Reviewer"],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        role,
        status: "active",
        email: `${role.toLowerCase()}@example.com`,
        name: role,
        permissions: { editProjects: true, viewProjects: true },
        createdAt: now,
      });
    }
    const subscription = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .unique();
    if (!subscription) throw new Error("Missing subscription");
    await ctx.db.patch(subscription._id, {
      plan,
      subscriptionStatus: plan === "free" ? "free" : "active",
      includedEditorSeatQuantity: plan === "team" ? 3 : 1,
      confirmedEditorQuantity: plan === "team" ? 3 : 1,
    });
    return subscription._id;
  });
  await seedAiKeys(t, workspaceId);
  const request = {
    workspaceId,
    feature: "status_update",
    promptVersion: "v1",
    modelTier: "default" as const,
    inputJson: JSON.stringify({ title: "Review cut" }),
    sourceIds: ["project-1"],
  };
  const enqueue = (inputJson = request.inputJson) =>
    owner.mutation((ctx) =>
      enqueueAiRun(ctx, { ...request, inputJson }, workerApi.aiTestWorker.run)
    );
  const summary = () =>
    owner.query(api.aiRuns.getSummary, { workspaceId, month: "2026-10" });
  const enable = () =>
    owner.mutation(api.aiRuns.setEnabled, { workspaceId, enabled: true });
  return {
    t,
    owner,
    editor,
    viewer,
    outsider,
    workspaceId,
    subscriptionId,
    request,
    enqueue,
    summary,
    enable,
  };
}

test("legacy workspaces default to off and only the Owner controls consent", async () => {
  const f = await fixture();
  expect(await f.summary()).toMatchObject({
    enabled: false,
    canManage: true,
    limit: 10,
    used: 0,
  });
  await expect(f.enqueue()).rejects.toThrow("AI is disabled");
  for (const caller of [f.editor, f.viewer]) {
    await expect(
      caller.mutation(api.aiRuns.setEnabled, {
        workspaceId: f.workspaceId,
        enabled: true,
      })
    ).rejects.toThrow("Only the Workspace Owner");
  }
  await f.enable();
  expect(await f.summary()).toMatchObject({ enabled: true, used: 0 });
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  expect(await f.summary()).toMatchObject({ enabled: false, used: 0 });
});

test("missing workspace keys reject new runs before quota is consumed", async () => {
  const f = await fixture();
  await f.enable();
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "relay-key-must-not-be-used");
  await f.owner.mutation(api.aiCredentials.remove, {
    workspaceId: f.workspaceId,
    provider: "google",
  });
  await expect(f.enqueue()).rejects.toThrow("Add a Gemini API key");
  expect(await f.summary()).toMatchObject({ googleConfigured: false, used: 0 });
  vi.unstubAllEnvs();
});

test("unauthenticated users, outsiders and Viewers cannot request runs", async () => {
  const f = await fixture();
  await f.enable();
  for (const caller of [f.t, f.outsider]) {
    await expect(
      caller.query(api.aiRuns.getSummary, {
        workspaceId: f.workspaceId,
        month: "2026-10",
      })
    ).rejects.toThrow();
    await expect(
      caller.mutation((ctx) =>
        enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run)
      )
    ).rejects.toThrow();
  }
  await expect(
    f.viewer.mutation((ctx) =>
      enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run)
    )
  ).rejects.toThrow("Only Workspace Owners and Editors");
  expect(await f.summary()).toMatchObject({ used: 0 });
});

test("Free stops at ten runs and duplicate requests reuse the existing run even at the limit", async () => {
  const f = await fixture();
  await f.enable();
  const first = await f.enqueue();
  for (let i = 1; i < 10; i++)
    await f.enqueue(JSON.stringify({ title: `Cut ${i}` }));
  expect(await f.summary()).toMatchObject({ used: 10, remaining: 0 });
  expect(await f.enqueue()).toEqual({ runId: first.runId, reused: true });
  await expect(f.enqueue(JSON.stringify({ title: "Cut 11" }))).rejects.toThrow(
    "Monthly AI run quota"
  );
  const rows = await f.t.run((ctx) => ctx.db.query("aiRuns").take(20));
  expect(rows).toHaveLength(10);
  expect(JSON.stringify(rows)).not.toContain("Review cut");
});

test("Creator grants 300 runs and Team pools only paid Editor Seat capacity", async () => {
  const creator = await fixture("creator");
  expect(await creator.summary()).toMatchObject({ limit: 300, remaining: 300 });
  const f = await fixture("team");
  await f.enable();
  expect(await f.summary()).toMatchObject({ limit: 900 });
  await f.owner.mutation(async (ctx) => {
    await new RateLimiter(components.rateLimiter).limit(ctx, "monthlyAiRuns", {
      key: `${f.workspaceId}:2026-10`,
      count: 899,
      config: {
        kind: "fixed window",
        rate: 1_000_000,
        capacity: 1_000_000,
        start: Date.UTC(2026, 9, 1),
        period: Date.UTC(2026, 10, 1) - Date.UTC(2026, 9, 1),
      },
      throws: true,
    });
  });
  await f.editor.mutation((ctx) =>
    enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run)
  );
  expect(await f.summary()).toMatchObject({
    limit: 900,
    used: 900,
    remaining: 0,
  });
  await expect(f.enqueue()).rejects.toThrow("Monthly AI run quota");
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, { purchasedExtraEditorSeatQuantity: 1 })
  );
  expect(await f.summary()).toMatchObject({
    limit: 1200,
    used: 900,
    remaining: 300,
  });
});

test("upgrades, downgrades and toggling consent never reset consumed quota", async () => {
  const f = await fixture();
  await f.enable();
  for (let i = 0; i < 10; i++)
    await f.enqueue(JSON.stringify({ title: `Cut ${i}` }));
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, {
      plan: "creator",
      subscriptionStatus: "active",
    })
  );
  expect(await f.summary()).toMatchObject({
    limit: 300,
    used: 10,
    remaining: 290,
  });
  await f.enqueue(JSON.stringify({ title: "Paid cut" }));
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  await f.enable();
  await f.t.run((ctx) =>
    ctx.db.patch(f.subscriptionId, { subscriptionStatus: "past_due" })
  );
  expect(await f.summary()).toMatchObject({
    limit: 10,
    used: 11,
    remaining: 0,
  });
  await expect(f.enqueue(JSON.stringify({ title: "New cut" }))).rejects.toThrow(
    "Monthly AI run quota"
  );
});

test("UTC calendar-month rollover preserves the previous month and starts a new allowance", async () => {
  const f = await fixture();
  await f.enable();
  await f.enqueue();
  vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
  await f.enqueue(JSON.stringify({ title: "November cut" }));
  expect(await f.summary()).toMatchObject({
    used: 1,
    resetsAt: Date.UTC(2026, 10, 1),
  });
  expect(
    await f.owner.query(api.aiRuns.getSummary, {
      workspaceId: f.workspaceId,
      month: "2026-11",
    })
  ).toMatchObject({ used: 1, remaining: 9, resetsAt: Date.UTC(2026, 11, 1) });
  expect(
    await f.owner.query(api.aiRuns.getSummary, {
      workspaceId: f.workspaceId,
      month: "2028-02",
    })
  ).toMatchObject({ used: 0, resetsAt: Date.UTC(2028, 2, 1) });
  await expect(
    f.owner.query(api.aiRuns.getSummary, {
      workspaceId: f.workspaceId,
      month: "2026-13",
    })
  ).rejects.toThrow("YYYY-MM");
});

test("claim and completion are idempotent and cached results do not spend another run", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.enqueue();
  expect(await f.t.mutation(internal.aiRuns.claim, { runId })).toBe(true);
  expect(await f.t.mutation(internal.aiRuns.claim, { runId })).toBe(false);
  const result = {
    runId,
    provider: "google" as const,
    modelId: "test-model",
    inputTokens: 20,
    outputTokens: 40,
    outputJson: JSON.stringify({ draft: "Ready for review" }),
    costUsd: 0.002,
  };
  expect(await f.t.mutation(internal.aiRuns.complete, result)).toBe(true);
  expect(await f.t.mutation(internal.aiRuns.complete, result)).toBe(false);
  expect(
    await f.t.mutation(internal.aiRuns.fail, {
      runId,
      failureCode: "provider_error",
    })
  ).toBe(false);
  expect(await f.enqueue()).toEqual({ runId, reused: true });
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "succeeded",
    outputJson: result.outputJson,
    inputTokens: 20,
    outputTokens: 40,
    costUsd: 0.002,
  });
  expect(await f.summary()).toMatchObject({ used: 1 });
});

test("retrying failures, better models and prompt changes use new audited attempts", async () => {
  const f = await fixture();
  await f.enable();
  const first = await f.enqueue();
  await f.t.mutation(internal.aiRuns.fail, {
    runId: first.runId,
    failureCode: "provider_error",
  });
  const retry = await f.enqueue();
  expect(retry).toMatchObject({ reused: false });
  expect(retry.runId).not.toBe(first.runId);
  for (const change of [
    { modelTier: "better" as const },
    { promptVersion: "v2" },
    { feature: "revision_list" },
    { sourceIds: ["project-2"] },
  ]) {
    expect(
      await f.owner.mutation((ctx) =>
        enqueueAiRun(
          ctx,
          { ...f.request, ...change },
          workerApi.aiTestWorker.run
        )
      )
    ).toMatchObject({ reused: false });
  }
  expect(await f.summary()).toMatchObject({ used: 6 });
});

test("cache and live output are private to the requesting editor", async () => {
  const f = await fixture("team");
  await f.enable();
  const first = await f.enqueue();
  const second = await f.editor.mutation((ctx) =>
    enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run)
  );
  expect(second.runId).not.toBe(first.runId);
  for (const caller of [f.editor, f.viewer, f.outsider]) {
    await expect(
      caller.query(api.aiRuns.getRun, { runId: first.runId })
    ).rejects.toThrow("AI run access required");
  }
  expect(await f.summary()).toMatchObject({ used: 2 });
});

test("workers stop when consent or membership is revoked after enqueue", async () => {
  const f = await fixture();
  await f.enable();
  const first = await f.enqueue();
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  expect(
    await f.t.mutation(internal.aiRuns.claim, { runId: first.runId })
  ).toBe(false);
  expect(
    await f.owner.query(api.aiRuns.getRun, { runId: first.runId })
  ).toMatchObject({ status: "failed", failureCode: "disabled" });
  await f.enable();
  const second = await f.editor.mutation((ctx) =>
    enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run)
  );
  await f.t.run(async (ctx) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", f.workspaceId).eq("userId", "issuer|editor")
      )
      .unique();
    if (!member) throw new Error("Missing editor");
    await ctx.db.delete(member._id);
  });
  expect(
    await f.t.mutation(internal.aiRuns.claim, { runId: second.runId })
  ).toBe(false);
  expect(await f.t.run((ctx) => ctx.db.get(second.runId))).toMatchObject({
    status: "failed",
    failureCode: "access_revoked",
  });
  await expect(
    f.editor.query(api.aiRuns.getRun, { runId: second.runId })
  ).rejects.toThrow("Workspace access required");
});

test("project visibility is enforced at enqueue, worker start and result read", async () => {
  const f = await fixture("team");
  await f.enable();
  const projectId = "private-project";
  const projectDocId = await f.t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: "issuer|owner",
      id: projectId,
      teamId: f.workspaceId,
      assigneeUserIds: [],
      profileId: "default",
      title: "Private",
      clientId: "client-1",
      archived: false,
      status: "Planned",
      workflowStageId: "draft",
      workflowStages: [],
      workType: "freelance",
      startDate: "2026-10-07",
      dueDate: "2026-10-10",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  );
  const request = { ...f.request, projectId };
  const enqueue = () =>
    f.editor.mutation((ctx) =>
      enqueueAiRun(ctx, request, workerApi.aiTestWorker.run)
    );
  await expect(enqueue()).rejects.toThrow("Project access required");
  await f.t.run((ctx) =>
    ctx.db.patch(projectDocId, { assigneeUserIds: ["issuer|editor"] })
  );
  const { runId } = await enqueue();
  await f.t.run((ctx) => ctx.db.patch(projectDocId, { assigneeUserIds: [] }));
  expect(await f.t.mutation(internal.aiRuns.claim, { runId })).toBe(false);
  await expect(f.editor.query(api.aiRuns.getRun, { runId })).rejects.toThrow(
    "Project access required"
  );
});

test("oversized inputs and invalid usage metadata are rejected without partial writes", async () => {
  const f = await fixture();
  await f.enable();
  await expect(
    f.enqueue(JSON.stringify({ title: "a".repeat(64_001) }))
  ).rejects.toThrow("Invalid AI request");
  await expect(f.enqueue("invalid json")).rejects.toThrow();
  expect(await f.summary()).toMatchObject({ used: 0 });
  const { runId } = await f.enqueue();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  await expect(
    f.t.mutation(internal.aiRuns.complete, {
      runId,
      outputJson: "{}",
      provider: "google",
      modelId: "test-model",
      inputTokens: -1,
      outputTokens: 0,
    })
  ).rejects.toThrow("Invalid AI result metadata");
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "running",
  });
});

test("quota, audit and scheduled jobs roll back together if the feature mutation fails", async () => {
  const f = await fixture();
  await f.enable();
  await expect(
    f.owner.mutation(async (ctx) => {
      await enqueueAiRun(ctx, f.request, workerApi.aiTestWorker.run);
      throw new Error("Feature save failed");
    })
  ).rejects.toThrow("Feature save failed");
  expect(await f.summary()).toMatchObject({ used: 0 });
  expect(await f.t.run((ctx) => ctx.db.query("aiRuns").take(1))).toEqual([]);
  expect(
    await f.t.run((ctx) => ctx.db.system.query("_scheduled_functions").take(1))
  ).toEqual([]);
});

test("the scheduled action runs without caller auth and completes before its timeout", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.enqueue();
  await vi.advanceTimersByTimeAsync(0);
  await f.t.finishInProgressScheduledFunctions();
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "succeeded",
    provider: "google",
  });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "succeeded",
  });
});

test("unfinished runs time out and late completion cannot overwrite the terminal state", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.enqueue();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  vi.setSystemTime(new Date("2026-10-07T12:11:00Z"));
  await f.t.mutation(internal.aiRuns.expire, { runId });
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "failed",
    failureCode: "timed_out",
  });
  expect(
    await f.t.mutation(internal.aiRuns.complete, {
      runId,
      outputJson: "{}",
      provider: "google",
      modelId: "test-model",
      inputTokens: 1,
      outputTokens: 1,
    })
  ).toBe(false);
});

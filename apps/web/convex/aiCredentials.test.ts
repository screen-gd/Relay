/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { generateObject, generateText } from "ai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { decryptCredential } from "./aiCredentials";
import { generateAiObject, generateAiObjectWithTools } from "./aiGeneration";
import schema from "./schema";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  isStepCount: vi.fn(),
  Output: { object: vi.fn() },
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI:
    (config: { apiKey: string }) => (modelId: string) => ({
      modelId,
      apiKey: config.apiKey,
    }),
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (config: { apiKey: string }) => (modelId: string) => ({
    modelId,
    apiKey: config.apiKey,
  }),
}));
const modules = import.meta.glob("./**/*.ts");
const workspaceKey = "customer-provider-key-123456";

beforeEach(() => {
  vi.stubEnv("AI_BYOK_ENCRYPTION_KEY", "a1".repeat(32));
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "relay-key-must-not-be-used");
  vi.stubEnv("OPENAI_API_KEY", "relay-key-must-not-be-used");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function fixture() {
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(api.team.createWorkspace, {
    name: "BYOK studio",
  });
  const workspaceId = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", created)
  );
  if (!workspaceId) throw new Error("Invalid workspace");
  await t.run(async (ctx) => {
    for (const [userId, role] of [
      ["editor", "Editor"],
      ["viewer", "Reviewer"],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        role,
        status: "active",
        email: `${userId}@example.com`,
        name: userId,
        permissions: {},
        createdAt: "2026-10-11",
      });
    }
  });
  await owner.mutation(api.aiRuns.setEnabled, { workspaceId, enabled: true });
  const key = (provider: "google" | "openai" = "google") =>
    t.run((ctx) =>
      ctx.db
        .query("aiProviderKeys")
        .withIndex("by_workspaceId_and_provider", (q) =>
          q.eq("workspaceId", workspaceId).eq("provider", provider)
        )
        .unique()
    );
  const save = (
    provider: "google" | "openai" = "google",
    apiKey = workspaceKey
  ) => owner.action(api.aiCredentials.save, { workspaceId, provider, apiKey });
  const run = (modelTier: "default" | "better" = "default") =>
    t.run((ctx) =>
      ctx.db.insert("aiRuns", {
        workspaceId,
        requestedBy: "owner",
        feature: "byok_test",
        promptVersion: "v1",
        modelTier,
        requestHash: "test",
        sourceIds: [],
        month: "2026-10",
        status: "queued",
      })
    );
  return { t, owner, workspaceId, save, key, run };
}

test("keys are encrypted, replaceable and removable without exposing them in settings", async () => {
  const f = await fixture();
  await f.save();
  const stored = await f.key();
  expect(stored).not.toBeNull();
  if (!stored) throw new Error("Missing key");
  expect(new TextDecoder().decode(stored.ciphertext)).not.toContain(
    workspaceKey
  );
  expect(await decryptCredential(stored)).toBe(workspaceKey);
  const summary = await f.owner.query(api.aiRuns.getSummary, {
    workspaceId: f.workspaceId,
    month: "2026-10",
  });
  expect(summary).toMatchObject({
    googleConfigured: true,
    openaiConfigured: false,
  });
  expect(JSON.stringify(summary)).not.toContain(workspaceKey);
  await f.save("google", "replacement-provider-key-123456");
  expect((await f.key())?._id).toBe(stored._id);
  const replacement = await f.key();
  if (!replacement) throw new Error("Missing replacement key");
  expect(await decryptCredential(replacement)).toBe(
    "replacement-provider-key-123456"
  );
  await f.owner.mutation(api.aiCredentials.remove, {
    workspaceId: f.workspaceId,
    provider: "google",
  });
  expect(await f.key()).toBeNull();
});

test("only the active workspace Owner can save or remove keys", async () => {
  const f = await fixture();
  await f.save();
  for (const caller of [
    f.t,
    f.t.withIdentity({ tokenIdentifier: "editor" }),
    f.t.withIdentity({ tokenIdentifier: "viewer" }),
    f.t.withIdentity({ tokenIdentifier: "outsider" }),
  ]) {
    await expect(
      caller.action(api.aiCredentials.save, {
        workspaceId: f.workspaceId,
        provider: "google",
        apiKey: workspaceKey,
      })
    ).rejects.toThrow();
    await expect(
      caller.mutation(api.aiCredentials.remove, {
        workspaceId: f.workspaceId,
        provider: "google",
      })
    ).rejects.toThrow();
  }
  await f.t.run(async (ctx) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", f.workspaceId).eq("userId", "owner")
      )
      .unique();
    if (!member) throw new Error("Missing owner");
    await ctx.db.patch(member._id, { status: "invited" });
  });
  await expect(f.save()).rejects.toThrow();
  expect(await f.key()).not.toBeNull();
});

test("malformed API keys and missing encryption configuration are rejected", async () => {
  const f = await fixture();
  for (const apiKey of [
    "",
    "short",
    "key with spaces 123456",
    "x".repeat(1025),
  ]) {
    await expect(f.save("google", apiKey)).rejects.toThrow(
      "Enter a valid API key"
    );
  }
  vi.stubEnv("AI_BYOK_ENCRYPTION_KEY", "");
  await expect(f.save()).rejects.toThrow("AI key storage is not configured");
  expect(await f.key()).toBeNull();
});

test("encrypted credentials cannot be substituted across workspaces or providers", async () => {
  const f = await fixture();
  const otherCreated = await f.t
    .withIdentity({ tokenIdentifier: "other-owner" })
    .mutation(api.team.createWorkspace, { name: "Other studio" });
  const otherWorkspaceId = await f.t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", otherCreated)
  );
  if (!otherWorkspaceId) throw new Error("Invalid other workspace");
  await f.save();
  const stored = await f.key();
  if (!stored) throw new Error("Missing key");
  await expect(
    decryptCredential({ ...stored, workspaceId: otherWorkspaceId })
  ).rejects.toThrow();
  await expect(
    decryptCredential({ ...stored, provider: "openai" })
  ).rejects.toThrow();
});

for (const modelTier of ["default", "better"] as const) {
  test(`${modelTier} generation uses the workspace key for object and tool runners`, async () => {
    const f = await fixture();
    await f.save(modelTier === "default" ? "google" : "openai");
    vi.mocked(generateObject).mockResolvedValue({
      object: { draft: "Test" },
      usage: { inputTokens: 1, outputTokens: 2 },
      response: { modelId: "test-model" },
    } as Awaited<ReturnType<typeof generateObject>>);
    vi.mocked(generateText).mockResolvedValue({
      output: { draft: "Test" },
      totalUsage: { inputTokens: 1, outputTokens: 2 },
      response: { modelId: "test-model" },
      steps: [],
    } as unknown as Awaited<ReturnType<typeof generateText>>);
    const runId = await f.run(modelTier);
    expect(
      await f.t.action((ctx) =>
        generateAiObject(ctx, {
          runId,
          modelTier,
          prompt: "Draft",
          schema: z.object({ draft: z.string() }),
        })
      )
    ).toEqual({ draft: "Test" });
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ apiKey: workspaceKey }),
      })
    );
    const toolRunId = await f.run(modelTier);
    expect(
      await f.t.action((ctx) =>
        generateAiObjectWithTools(ctx, {
          runId: toolRunId,
          modelTier,
          prompt: "Draft",
          schema: z.object({ draft: z.string() }),
          tools: {},
          maxSteps: 1,
          verify: () => {},
        })
      )
    ).toEqual({ draft: "Test" });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ apiKey: workspaceKey }),
      })
    );
  });
}

test("removing a key before execution prevents provider calls and shared-key fallback", async () => {
  const f = await fixture();
  await f.save();
  const runId = await f.run();
  await f.owner.mutation(api.aiCredentials.remove, {
    workspaceId: f.workspaceId,
    provider: "google",
  });
  expect(
    await f.t.action((ctx) =>
      generateAiObject(ctx, {
        runId,
        modelTier: "default",
        prompt: "Draft",
        schema: z.object({ draft: z.string() }),
      })
    )
  ).toBeNull();
  expect(generateObject).not.toHaveBeenCalled();
  expect(
    await f.t.query(internal.aiRuns.getExecution, { runId })
  ).toMatchObject({ status: "failed", failureCode: "provider_error" });
});

test("credential lookup requires a running run, matching tier and current consent", async () => {
  const f = await fixture();
  await f.save();
  const runId = await f.run();
  expect(
    await f.t.query(internal.aiCredentials.getForRun, {
      runId,
      modelTier: "default",
    })
  ).toBeNull();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  expect(
    await f.t.query(internal.aiCredentials.getForRun, {
      runId,
      modelTier: "better",
    })
  ).toBeNull();
  expect(
    await f.t.query(internal.aiCredentials.getForRun, {
      runId,
      modelTier: "default",
    })
  ).toMatchObject({ workspaceId: f.workspaceId, provider: "google" });
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  expect(
    await f.t.query(internal.aiCredentials.getForRun, {
      runId,
      modelTier: "default",
    })
  ).toBeNull();
});

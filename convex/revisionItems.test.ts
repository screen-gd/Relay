/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { generateObject } from "ai";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { revisionInputSchema } from "./revisionItemsPrompt";

vi.mock("ai", () => ({ generateObject: vi.fn() }));
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function fixture() {
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const editor = t.withIdentity({ tokenIdentifier: "editor" });
  const viewer = t.withIdentity({ tokenIdentifier: "viewer" });
  const workspace = await owner.mutation(api.team.createWorkspace, {
    name: "Revision studio",
  });
  const seeded = await t.run(async (ctx) => {
    const workspaceId = ctx.db.normalizeId("teamWorkspaces", workspace)!;
    for (const [userId, role] of [
      ["editor", "Editor"],
      ["viewer", "Reviewer"],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        role,
        status: "active",
        name: role,
        email: "private@example.com",
        permissions: { viewProjects: true, editProjects: true },
        createdAt: "2026-10-09",
      });
    }
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "p",
      teamId: workspaceId,
      assigneeUserIds: ["editor", "viewer"],
      profileId: "video-editing",
      title: "Launch film",
      clientId: "private-client",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [],
      workType: "Freelance",
      startDate: "2026-10-01",
      dueDate: "2026-10-20",
      earnings: 500,
      paid: false,
      notes: "private notes",
      createdAt: "2026-10-09",
      updatedAt: "2026-10-09",
    });
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "p",
      id: "o",
      title: "Main cut",
      description: "private description",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: "2026-10-09",
      updatedAt: "2026-10-09",
    });
    const versionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "p",
      outputId,
      id: "v",
      versionNumber: 1,
      title: "Version one",
      notes: "private version notes",
      createdByUserId: "owner",
      createdAt: "2026-10-09",
      source: { kind: "link", url: "https://example.com/private-media" },
    });
    const commentId = await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "p",
      outputId,
      mediaVersionId: versionId,
      authorName: "private@example.com",
      body: "Make it pop",
      timestampSeconds: 0,
      resolved: false,
      createdAt: "2026-10-09",
    });
    return { workspaceId, versionId, outputId, commentId };
  });
  const enable = () =>
    owner.mutation(api.aiRuns.setEnabled, {
      workspaceId: seeded.workspaceId,
      enabled: true,
    });
  const generate = () =>
    owner.mutation(api.revisionItems.generate, {
      mediaVersionId: "v",
      modelTier: "default",
    });
  return { t, owner, editor, viewer, ...seeded, enable, generate };
}

const items = [
  {
    theme: "Colour",
    text: "Clarify the desired colour treatment",
    sources: [0],
    vague: true,
    clarifyingQuestion: "Would you like warmer colours or more contrast?",
    possibleNewScope: false,
  },
];

test("generation enforces identity, role, project visibility/edit access and opt-in", async () => {
  const f = await fixture();
  const args = { mediaVersionId: "v", modelTier: "default" as const };
  await expect(f.t.mutation(api.revisionItems.generate, args)).rejects.toThrow(
    "Not authenticated"
  );
  await expect(f.generate()).rejects.toThrow("AI is disabled");
  await f.enable();
  await expect(
    f.viewer.mutation(api.revisionItems.generate, args)
  ).rejects.toThrow("Only Owners and Editors");
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "outsider" })
      .mutation(api.revisionItems.generate, args)
  ).rejects.toThrow("Permission denied");
  await f.editor.mutation(api.revisionItems.generate, args);
  await f.t.run(async (ctx) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", f.workspaceId).eq("userId", "editor")
      )
      .unique();
    await ctx.db.patch(member!._id, {
      permissions: { editProjects: false, viewProjects: true },
    });
  });
  await expect(
    f.editor.mutation(api.revisionItems.generate, args)
  ).rejects.toThrow("Permission denied");
  expect(generateObject).not.toHaveBeenCalled();
});

test("scheduled input contains only bounded titles, comment text and timestamps", async () => {
  const f = await fixture();
  await f.enable();
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.commentId, { body: "a".repeat(5000) });
  });
  await f.generate();
  const scheduled = await f.t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").take(10)).find((row) =>
      row.name.includes("revisionItemsActions")
    )
  );
  const argument = scheduled!.args[0];
  if (
    !argument ||
    typeof argument !== "object" ||
    !("inputJson" in argument) ||
    typeof argument.inputJson !== "string"
  )
    throw new Error("Missing input");
  const input = revisionInputSchema.parse(JSON.parse(argument.inputJson));
  expect(input.comments).toEqual([{ text: "a".repeat(1000), timestamp: 0 }]);
  expect(Object.keys(JSON.parse(argument.inputJson))).toEqual([
    "titles",
    "comments",
  ]);
  expect(argument.inputJson).not.toMatch(
    /private|authorName|email|token|clientId|source/
  );
  await f.t.run(async (ctx) => {
    for (let i = 0; i < 40; i++)
      await ctx.db.insert("mediaVersionComments", {
        ownerUserId: "owner",
        projectId: "p",
        outputId: f.outputId,
        mediaVersionId: f.versionId,
        authorName: "Client",
        body: "Shorten the intro",
        resolved: false,
        createdAt: "2026-10-09",
      });
  });
  await expect(f.generate()).rejects.toThrow("40 or fewer");
});

test("save validates sources, atomically completes once, and preserves editor decisions", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.generate();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  const completion = {
    runId,
    outputJson: JSON.stringify({ items }),
    provider: "google" as const,
    modelId: "test-model",
    inputTokens: 10,
    outputTokens: 20,
  };
  const invalid = [{ ...items[0], sources: [1] }];
  await expect(
    f.t.mutation(internal.revisionItems.save, {
      completion: {
        ...completion,
        outputJson: JSON.stringify({ items: invalid }),
      },
      items: invalid,
    })
  ).rejects.toThrow("Invalid revision source");
  expect((await f.owner.query(api.aiRuns.getRun, { runId }))?.status).toBe(
    "running"
  );
  expect(
    await f.t.mutation(internal.revisionItems.save, { completion, items })
  ).toBe(true);
  expect(
    await f.t.mutation(internal.revisionItems.save, { completion, items })
  ).toBe(false);
  const [item] = await f.owner.query(api.revisionItems.list, {
    mediaVersionId: "v",
  });
  expect(item).toMatchObject({
    status: "draft",
    sourceCommentIds: [f.commentId],
    timestamps: [0],
    vague: true,
  });
  await expect(
    f.viewer.mutation(api.revisionItems.update, {
      itemId: item._id,
      status: "resolved",
    })
  ).rejects.toThrow("Only Owners and Editors");
  await f.editor.mutation(api.revisionItems.update, {
    itemId: item._id,
    text: "Increase contrast",
  });
  await f.editor.mutation(api.revisionItems.update, {
    itemId: item._id,
    status: "resolved",
  });
  expect(
    await f.owner.query(api.revisionItems.list, { mediaVersionId: "v" })
  ).toMatchObject([{ text: "Increase contrast", status: "resolved" }]);
  expect(await f.t.run((ctx) => ctx.db.get(f.commentId))).toMatchObject({
    resolved: false,
  });
  await f.editor.mutation(api.revisionItems.remove, { itemId: item._id });
  expect(
    await f.owner.query(api.revisionItems.list, { mediaVersionId: "v" })
  ).toEqual([]);
});

test("shared runner claims once, records actual usage, and hides provider failures", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.generate();
  const inputJson = JSON.stringify({
    titles: ["Cut"],
    comments: [{ text: "Make it pop", timestamp: 0 }],
  });
  vi.mocked(generateObject).mockResolvedValue({
    object: { items },
    response: { modelId: "actual-model" },
    usage: { inputTokens: 12, outputTokens: 34 },
  } as Awaited<ReturnType<typeof generateObject>>);
  await f.t.action(internal.revisionItemsActions.run, { runId, inputJson });
  await f.t.action(internal.revisionItemsActions.run, { runId, inputJson });
  expect(generateObject).toHaveBeenCalledTimes(1);
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "succeeded",
    modelId: "actual-model",
    inputTokens: 12,
    outputTokens: 34,
  });
  const retry = await f.owner.mutation(api.revisionItems.generate, {
    mediaVersionId: "v",
    modelTier: "better",
  });
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.mocked(generateObject).mockRejectedValue(
    new Error("Secret provider details")
  );
  await f.t.action(internal.revisionItemsActions.run, {
    runId: retry.runId,
    inputJson,
  });
  expect(
    await f.owner.query(api.aiRuns.getRun, { runId: retry.runId })
  ).toMatchObject({ status: "failed", failureCode: "provider_error" });
  expect(generateObject).toHaveBeenLastCalledWith(
    expect.objectContaining({ providerOptions: { openai: { store: false } } })
  );
  const missingUsage = await f.owner.mutation(api.revisionItems.generate, {
    mediaVersionId: "v",
    modelTier: "better",
  });
  vi.mocked(generateObject).mockResolvedValue({
    object: { items },
    response: { modelId: "actual-model" },
    usage: {},
  } as Awaited<ReturnType<typeof generateObject>>);
  await f.t.action(internal.revisionItemsActions.run, {
    runId: missingUsage.runId,
    inputJson,
  });
  expect(
    await f.owner.query(api.aiRuns.getRun, { runId: missingUsage.runId })
  ).toMatchObject({ status: "failed", failureCode: "provider_error" });
});

test("saving rechecks consent after a provider run starts", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.generate();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  await expect(
    f.t.mutation(internal.revisionItems.save, {
      completion: {
        runId,
        outputJson: JSON.stringify({ items }),
        provider: "google",
        modelId: "test-model",
        inputTokens: 1,
        outputTokens: 1,
      },
      items,
    })
  ).rejects.toThrow("AI is disabled");
  expect(
    await f.owner.query(api.revisionItems.list, { mediaVersionId: "v" })
  ).toEqual([]);
});

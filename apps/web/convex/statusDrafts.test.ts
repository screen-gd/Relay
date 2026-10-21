/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { generateObject } from "ai";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seedAiKeys } from "./testHelpers/aiKeys.fixture";
import { statusInputSchema } from "./statusDraftsPrompt";
import { changelogInputSchema } from "./versionChangelogPrompt";

vi.mock("ai", () => ({ generateObject: vi.fn() }));
const modules = import.meta.glob("./**/*.ts");
beforeEach(() => {
  vi.useFakeTimers();
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
        permissions: {
          viewProjects: true,
          editProjects: true,
          managePortal: true,
        },
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
    await ctx.db.patch(outputId, { currentMediaVersionId: versionId });
    const seedRun = await ctx.db.insert("aiRuns", {
      workspaceId,
      requestedBy: "owner",
      projectId: "p",
      feature: "feedback_revision_list",
      promptVersion: "v1",
      modelTier: "default",
      requestHash: "seed",
      sourceIds: [commentId],
      month: "2026-10",
      status: "queued",
    });
    const revisionId = await ctx.db.insert("revisionItems", {
      projectId: "p",
      mediaVersionId: versionId,
      runId: seedRun,
      sourceCommentIds: [commentId],
      timestamps: [0],
      theme: "Colour",
      text: "Increase contrast",
      vague: false,
      clarifyingQuestion: null,
      possibleNewScope: false,
      status: "resolved",
    });
    return { workspaceId, versionId, outputId, commentId, revisionId };
  });
  await seedAiKeys(t, seeded.workspaceId);
  const enable = () =>
    owner.mutation(api.aiRuns.setEnabled, {
      workspaceId: seeded.workspaceId,
      enabled: true,
    });
  return { t, owner, editor, viewer, ...seeded, enable };
}

async function inputFor(
  f: Awaited<ReturnType<typeof fixture>>,
  module: string
) {
  return f.t.run(async (ctx) => {
    const scheduled = (
      await ctx.db.system.query("_scheduled_functions").take(30)
    ).find((row) => row.name.includes(module));
    const arg = scheduled?.args[0];
    if (
      !arg ||
      typeof arg !== "object" ||
      !("inputJson" in arg) ||
      typeof arg.inputJson !== "string"
    )
      throw new Error("Missing scheduled input");
    return arg.inputJson;
  });
}

for (const feature of ["status", "changelog"] as const) {
  test(`${feature} enforces identity, opt-in, role and project edit access`, async () => {
    const f = await fixture();
    const request = (client: typeof f.owner) =>
      feature === "status"
        ? client.mutation(api.statusDrafts.generate, {
            projectId: "p",
            channel: "portal",
            modelTier: "default",
          })
        : client.mutation(api.versionChangelog.generate, {
            mediaVersionId: "v",
            modelTier: "default",
          });
    await expect(request(f.t)).rejects.toThrow("Not authenticated");
    await expect(request(f.owner)).rejects.toThrow("AI is disabled");
    await f.enable();
    await expect(request(f.viewer)).rejects.toThrow("Only Owners and Editors");
    await expect(
      request(f.t.withIdentity({ tokenIdentifier: "outsider" }))
    ).rejects.toThrow("Permission denied");
    await request(f.editor);
    await f.t.run(async (ctx) => {
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", f.workspaceId).eq("userId", "editor")
        )
        .unique();
      await ctx.db.patch(member!._id, {
        permissions: { viewProjects: true, editProjects: false },
      });
    });
    await expect(request(f.editor)).rejects.toThrow("Permission denied");
    expect(generateObject).not.toHaveBeenCalled();
  });
}

test.each([
  [0, 0],
  [604800, 604800],
  [undefined, null],
  [1.5, null],
  [-1, null],
  [604801, null],
  [NaN, null],
  [Infinity, null],
  [-Infinity, null],
])(
  "stored timestamp %s never breaks a status draft",
  async (timestampSeconds, expected) => {
    const f = await fixture();
    await f.enable();
    await f.t.run((ctx) => ctx.db.patch(f.commentId, { timestampSeconds }));
    await f.owner.mutation(api.statusDrafts.generate, {
      projectId: "p",
      channel: "portal",
      modelTier: "default",
    });
    const input = statusInputSchema.parse(
      JSON.parse(await inputFor(f, "statusDraftsActions"))
    );
    expect(input.comments[0].timestamp).toBe(expected);
  }
);

test("status input is bounded and excludes private fields; all channels save without publishing", async () => {
  const f = await fixture();
  await f.enable();
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.commentId, { body: "x".repeat(5000) });
    await ctx.db.patch(f.outputId, { title: "t".repeat(500) });
  });
  for (const channel of ["portal", "email", "whatsapp"] as const) {
    const { runId } = await f.owner.mutation(api.statusDrafts.generate, {
      projectId: "p",
      channel,
      modelTier: "default",
    });
    const raw = await inputFor(f, "statusDraftsActions");
    const input = statusInputSchema.parse(JSON.parse(raw));
    expect(input.comments[0].text).toHaveLength(1000);
    expect(input.outputs[0].title).toHaveLength(160);
    expect(input.project).toMatchObject({
      status: "Planned",
      dueDate: "2026-10-20",
    });
    expect(raw).not.toMatch(
      /private|clientId|authorName|earnings|token|source/
    );
    await f.t.mutation(internal.aiRuns.claim, { runId });
    const text =
      channel === "whatsapp"
        ? "The film is planned."
        : "Launch film is planned. Main cut is ready for review.";
    const completion = {
      runId,
      outputJson: JSON.stringify({ text }),
      provider: "google" as const,
      modelId: "test-model",
      inputTokens: 1,
      outputTokens: 1,
    };
    if (channel === "whatsapp")
      await expect(
        f.t.mutation(internal.statusDrafts.save, {
          channel,
          text: "x".repeat(701),
          completion: {
            ...completion,
            outputJson: JSON.stringify({ text: "x".repeat(701) }),
          },
        })
      ).rejects.toThrow("Invalid status draft");
    expect(
      await f.t.mutation(internal.statusDrafts.save, {
        channel,
        text,
        completion,
      })
    ).toBe(true);
    expect(
      await f.t.mutation(internal.statusDrafts.save, {
        channel,
        text,
        completion,
      })
    ).toBe(false);
  }
  const rows = await f.owner.query(api.statusDrafts.list, { projectId: "p" });
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({
    sourceOutputIds: ["o"],
    sourceCommentIds: [f.commentId],
  });
  expect(
    await f.editor.query(api.statusDrafts.list, { projectId: "p" })
  ).toEqual([]);
  await expect(
    f.editor.mutation(api.statusDrafts.update, {
      draftId: rows[0]._id,
      text: "Edited",
    })
  ).rejects.toThrow("Draft access required");
  await f.owner.mutation(api.statusDrafts.update, {
    draftId: rows[0]._id,
    text: "Edited",
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("projectPortals").take(1))
  ).toEqual([]);
  const portal = await f.owner.mutation(api.projectPortals.publish, {
    projectId: "p",
    config: {
      publicNotes: "Original",
      showStartDate: false,
      showDueDate: true,
      selectedOutputIds: ["o"],
      expiresAt: null,
    },
  });
  await f.owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  const portalDraft = rows.find((row) => row.channel === "portal")!;
  await f.owner.mutation(api.projectPortals.updateSettings, {
    portalId: portal.portalId,
    changes: { publicNotes: portalDraft.text },
  });
  expect(
    await f.t.query(api.projectPortals.getByToken, { token: portal.token })
  ).toMatchObject({ project: { publicNotes: portalDraft.text } });
});

test("changelog input uses only resolved text and strips internal flags; approval is the sole portal visibility gate", async () => {
  const f = await fixture();
  await f.enable();
  await f.t.run(async (ctx) => {
    const item = (await ctx.db.get(f.revisionId))!;
    const { _id, _creationTime, ...fields } = item;
    void _id;
    void _creationTime;
    await ctx.db.insert("revisionItems", {
      ...fields,
      status: "draft",
      text: "private unfinished",
    });
    await ctx.db.insert("revisionItems", {
      ...fields,
      vague: true,
      clarifyingQuestion: "private question",
      text: "Warmer colour treatment",
    });
    await ctx.db.insert("revisionItems", {
      ...fields,
      possibleNewScope: true,
      text: "Added caption track",
    });
  });
  const { runId } = await f.owner.mutation(api.versionChangelog.generate, {
    mediaVersionId: "v",
    modelTier: "default",
  });
  const raw = await inputFor(f, "versionChangelogActions");
  expect(changelogInputSchema.parse(JSON.parse(raw)).items).toEqual([
    { text: "Increase contrast", timestamps: [0] },
    { text: "Warmer colour treatment", timestamps: [0] },
    { text: "Added caption track", timestamps: [0] },
  ]);
  expect(raw).not.toMatch(
    /private|vague|clarifyingQuestion|possibleNewScope|notes|transcript/
  );
  vi.mocked(generateObject).mockResolvedValue({
    object: { text: "Increased contrast." },
    response: { modelId: "test-model" },
    usage: { inputTokens: 1, outputTokens: 2 },
  } as Awaited<ReturnType<typeof generateObject>>);
  await f.t.action(internal.versionChangelogActions.run, {
    runId,
    inputJson: raw,
  });
  await f.t.action(internal.versionChangelogActions.run, {
    runId,
    inputJson: raw,
  });
  expect(generateObject).toHaveBeenCalledTimes(1);
  const [row] = await f.owner.query(api.versionChangelog.list, {
    mediaVersionId: "v",
  });
  expect(row).toMatchObject({
    text: "Increased contrast.",
    sourceRevisionIds: expect.arrayContaining([f.revisionId]),
  });
  await expect(
    f.viewer.query(api.versionChangelog.list, { mediaVersionId: "v" })
  ).rejects.toThrow("Only Owners and Editors");
  await expect(
    f.viewer.mutation(api.versionChangelog.update, {
      changelogId: row._id,
      text: "Leak",
      approve: true,
    })
  ).rejects.toThrow("Only Owners and Editors");
  const portal = await f.owner.mutation(api.projectPortals.publish, {
    projectId: "p",
    config: {
      publicNotes: "Note",
      showStartDate: false,
      showDueDate: true,
      selectedOutputIds: ["o"],
      expiresAt: null,
    },
  });
  await f.owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  const projection = () =>
    f.t.query(api.projectPortals.getByToken, { token: portal.token });
  expect(await projection()).toMatchObject({
    outputs: [{ currentVersion: { changelog: null } }],
  });
  await f.editor.mutation(api.versionChangelog.update, {
    changelogId: row._id,
    text: "Contrast improved.",
    approve: true,
  });
  expect(await projection()).toMatchObject({
    outputs: [{ currentVersion: { changelog: "Contrast improved." } }],
  });
  await f.editor.mutation(api.versionChangelog.update, {
    changelogId: row._id,
    text: "private new draft",
    approve: false,
  });
  expect(await projection()).toMatchObject({
    outputs: [{ currentVersion: { changelog: "Contrast improved." } }],
  });
  expect(JSON.stringify(await projection())).not.toMatch(
    /private new draft|private question|private unfinished|sourceRevisionIds|"approvedBy"|clarifyingQuestion|vague|possibleNewScope|runId/
  );
  const retry = await f.owner.mutation(api.versionChangelog.generate, {
    mediaVersionId: "v",
    modelTier: "better",
  });
  await f.t.mutation(internal.aiRuns.claim, { runId: retry.runId });
  await f.t.mutation(internal.versionChangelog.save, {
    completion: {
      runId: retry.runId,
      outputJson: JSON.stringify({ text: "Retry draft" }),
      provider: "openai",
      modelId: "test",
      inputTokens: 1,
      outputTokens: 1,
    },
    text: "Retry draft",
  });
  expect(await projection()).toMatchObject({
    outputs: [{ currentVersion: { changelog: "Contrast improved." } }],
  });
  const [newRow] = await f.owner.query(api.versionChangelog.list, {
    mediaVersionId: "v",
  });
  await f.owner.mutation(api.versionChangelog.update, {
    changelogId: newRow._id,
    text: "Updated approved summary",
    approve: true,
  });
  expect(await projection()).toMatchObject({
    outputs: [{ currentVersion: { changelog: "Updated approved summary" } }],
  });
  await f.owner.mutation(api.projectPortals.updateSettings, {
    portalId: portal.portalId,
    changes: { selectedOutputIds: [] },
  });
  expect(await projection()).toMatchObject({ outputs: [] });
});

test("both saves recheck consent and changelog sources before persisting", async () => {
  const f = await fixture();
  await f.enable();
  const status = await f.owner.mutation(api.statusDrafts.generate, {
    projectId: "p",
    channel: "portal",
    modelTier: "default",
  });
  const changelog = await f.owner.mutation(api.versionChangelog.generate, {
    mediaVersionId: "v",
    modelTier: "default",
  });
  for (const { runId } of [status, changelog])
    await f.t.mutation(internal.aiRuns.claim, { runId });
  const result = {
    outputJson: JSON.stringify({ text: "Update" }),
    provider: "google" as const,
    modelId: "test",
    inputTokens: 1,
    outputTokens: 1,
  };
  await f.t.run((ctx) => ctx.db.patch(f.revisionId, { status: "accepted" }));
  await expect(
    f.t.mutation(internal.versionChangelog.save, {
      completion: { ...result, runId: changelog.runId },
      text: "Update",
    })
  ).rejects.toThrow("Changelog sources unavailable");
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  await expect(
    f.t.mutation(internal.statusDrafts.save, {
      completion: { ...result, runId: status.runId },
      channel: "portal",
      text: "Update",
    })
  ).rejects.toThrow("AI is disabled");
  await expect(
    f.t.mutation(internal.versionChangelog.save, {
      completion: { ...result, runId: changelog.runId },
      text: "Update",
    })
  ).rejects.toThrow("AI is disabled");
  expect(
    await f.owner.query(api.statusDrafts.list, { projectId: "p" })
  ).toEqual([]);
  expect(
    await f.owner.query(api.versionChangelog.list, { mediaVersionId: "v" })
  ).toEqual([]);
});

test("generation rejects oversized collections instead of silently dropping sources", async () => {
  const f = await fixture();
  await f.enable();
  await f.t.run(async (ctx) => {
    const original = (await ctx.db.get(f.commentId))!;
    const { _id, _creationTime, ...fields } = original;
    void _id;
    void _creationTime;
    for (let i = 0; i < 40; i++)
      await ctx.db.insert("mediaVersionComments", fields);
    const revision = (await ctx.db.get(f.revisionId))!;
    const {
      _id: revisionId,
      _creationTime: created,
      ...revisionFields
    } = revision;
    void revisionId;
    void created;
    for (let i = 0; i < 40; i++)
      await ctx.db.insert("revisionItems", revisionFields);
  });
  await expect(
    f.owner.mutation(api.statusDrafts.generate, {
      projectId: "p",
      channel: "portal",
      modelTier: "default",
    })
  ).rejects.toThrow("up to 40 current-version comments");
  await expect(
    f.owner.mutation(api.versionChangelog.generate, {
      mediaVersionId: "v",
      modelTier: "default",
    })
  ).rejects.toThrow("up to 40 resolved revisions");
  expect(generateObject).not.toHaveBeenCalled();
});

test("status worker persists the channel draft through the shared runner", async () => {
  const f = await fixture();
  await f.enable();
  const { runId } = await f.owner.mutation(api.statusDrafts.generate, {
    projectId: "p",
    channel: "email",
    modelTier: "default",
  });
  const inputJson = await inputFor(f, "statusDraftsActions");
  vi.mocked(generateObject).mockResolvedValue({
    object: {
      text: "Subject: Launch film update\nMain cut is ready for review.",
    },
    response: { modelId: "test-model" },
    usage: { inputTokens: 2, outputTokens: 3 },
  } as Awaited<ReturnType<typeof generateObject>>);
  await f.t.action(internal.statusDraftsActions.run, { runId, inputJson });
  expect(
    await f.owner.query(api.statusDrafts.list, { projectId: "p" })
  ).toMatchObject([
    {
      runId,
      channel: "email",
      text: "Subject: Launch film update\nMain cut is ready for review.",
    },
  ]);
  expect(await f.owner.query(api.aiRuns.getRun, { runId })).toMatchObject({
    status: "succeeded",
    inputTokens: 2,
    outputTokens: 3,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("projectPortals").take(1))
  ).toEqual([]);
});

test("cached drafts remain reviewable beyond the recent list without crossing editor access", async () => {
  const f = await fixture();
  await f.enable();
  const status = await f.owner.mutation(api.statusDrafts.generate, {
    projectId: "p",
    channel: "portal",
    modelTier: "default",
  });
  const changelog = await f.owner.mutation(api.versionChangelog.generate, {
    mediaVersionId: "v",
    modelTier: "default",
  });
  for (const { runId } of [status, changelog])
    await f.t.mutation(internal.aiRuns.claim, { runId });
  const metadata = {
    outputJson: JSON.stringify({ text: "Original" }),
    provider: "google" as const,
    modelId: "test",
    inputTokens: 1,
    outputTokens: 1,
  };
  await f.t.mutation(internal.statusDrafts.save, {
    completion: { ...metadata, runId: status.runId },
    channel: "portal",
    text: "Original",
  });
  await f.t.mutation(internal.versionChangelog.save, {
    completion: { ...metadata, runId: changelog.runId },
    text: "Original",
  });
  await f.t.run(async (ctx) => {
    for (let i = 0; i < 21; i++) {
      const runId = await ctx.db.insert("aiRuns", {
        workspaceId: f.workspaceId,
        requestedBy: "owner",
        projectId: "p",
        feature: "fixture",
        promptVersion: "v1",
        modelTier: "default",
        requestHash: String(i),
        sourceIds: [],
        month: "2026-10",
        status: "queued",
      });
      await ctx.db.insert("statusDrafts", {
        projectId: "p",
        runId,
        requestedBy: "owner",
        channel: "portal",
        text: "Newer",
        sourceOutputIds: [],
        sourceCommentIds: [],
      });
      await ctx.db.insert("versionChangelogs", {
        projectId: "p",
        runId,
        mediaVersionId: f.versionId,
        text: "Newer",
        sourceRevisionIds: [],
      });
    }
  });
  expect(
    (
      await f.owner.query(api.statusDrafts.list, {
        projectId: "p",
        runId: status.runId,
      })
    )[0]
  ).toMatchObject({ runId: status.runId, text: "Original" });
  expect(
    (
      await f.owner.query(api.versionChangelog.list, {
        mediaVersionId: "v",
        runId: changelog.runId,
      })
    )[0]
  ).toMatchObject({ runId: changelog.runId, text: "Original" });
  expect(
    await f.editor.query(api.statusDrafts.list, {
      projectId: "p",
      runId: status.runId,
    })
  ).toEqual([]);
});

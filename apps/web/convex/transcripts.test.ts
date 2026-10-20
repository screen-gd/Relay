/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seedAiKeys } from "./testHelpers/aiKeys.fixture";
import { validateTranscriptMatches } from "./transcriptsValidators";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const text =
  "1\n00:00:00,000 --> 00:00:03,000\nWelcome to Relay\n\n2\n00:00:06,000 --> 00:00:09,000\nSee you next time";
async function fixture() {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const workspace = await owner.mutation(api.team.createWorkspace, {
    name: "Studio",
  });
  const seeded = await t.run(async (ctx) => {
    const workspaceId = ctx.db.normalizeId("teamWorkspaces", workspace)!;
    for (const [userId, role] of [
      ["editor", "Editor"],
      ["viewer", "Reviewer"],
    ] as const)
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
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "p",
      teamId: workspaceId,
      assigneeUserIds: ["editor", "viewer"],
      profileId: "video-editing",
      title: "Film",
      clientId: "client",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [],
      workType: "Freelance",
      startDate: "2026-10-01",
      dueDate: "2026-10-20",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-10-09",
      updatedAt: "2026-10-09",
    });
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "p",
      id: "o",
      title: "Main",
      description: "",
      category: "Deliverable",
      reviewState: "draft",
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
      title: "Cut",
      notes: "",
      createdByUserId: "owner",
      createdAt: "2026-10-09",
      source: { kind: "link", url: "https://example.com/private" },
    });
    const timestamped = await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "p",
      outputId,
      mediaVersionId: versionId,
      authorName: "private@example.com",
      body: "Shorten this",
      timestampSeconds: 0,
      resolved: false,
      createdAt: "2026-10-09",
    });
    const ambiguous = await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "p",
      outputId,
      mediaVersionId: versionId,
      authorName: "private@example.com",
      body: 'Trim "See you next time"',
      resolved: false,
      createdAt: "2026-10-09",
    });
    return { workspaceId, versionId, outputId, timestamped, ambiguous };
  });
  const upload = () =>
    owner.mutation(api.transcripts.upload, {
      mediaVersionId: "v",
      sourceName: "cut.srt",
      text,
    });
  const generate = () =>
    owner.mutation(api.transcripts.generate, {
      mediaVersionId: "v",
      modelTier: "default",
    });
  await seedAiKeys(t, seeded.workspaceId);
  const enable = () =>
    owner.mutation(api.aiRuns.setEnabled, {
      workspaceId: seeded.workspaceId,
      enabled: true,
    });
  return { t, owner, ...seeded, upload, generate, enable };
}

test("transcripts require project edit access and role; AI also requires opt-in; timestamps match without AI", async () => {
  const f = await fixture();
  const args = { mediaVersionId: "v", sourceName: "cut.srt", text };
  await expect(f.t.mutation(api.transcripts.upload, args)).rejects.toThrow(
    "Not authenticated"
  );
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "viewer" })
      .mutation(api.transcripts.upload, args)
  ).rejects.toThrow("Owners and Editors");
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "outsider" })
      .mutation(api.transcripts.upload, args)
  ).rejects.toThrow("Permission denied");
  await f.upload();
  const result = await f.owner.query(api.transcripts.get, {
    mediaVersionId: "v",
  });
  expect(result.matches).toEqual([
    {
      commentId: f.timestamped,
      segmentId: result.segments[0]._id,
      text: "Welcome to Relay",
      startSeconds: 0,
      aiDrafted: false,
    },
  ]);
  expect(await f.t.run((ctx) => ctx.db.query("aiRuns").take(10))).toEqual([]);
  await expect(f.generate()).rejects.toThrow("AI is disabled");
  await f.enable();
  await f.generate();
  await f.t.run(async (ctx) => {
    const editor = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", f.workspaceId).eq("userId", "editor")
      )
      .unique();
    await ctx.db.patch(editor!._id, {
      permissions: { viewProjects: true, editProjects: false },
    });
  });
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "editor" })
      .mutation(api.transcripts.generate, {
        mediaVersionId: "v",
        modelTier: "default",
      })
  ).rejects.toThrow("Permission denied");
});

test("AI persistence rejects foreign segment IDs, missing comments and revoked consent", async () => {
  const f = await fixture();
  const transcriptId = await f.upload();
  await f.enable();
  const { runId } = await f.generate();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  const result = await f.owner.query(api.transcripts.get, {
    mediaVersionId: "v",
  });
  const foreignSegmentId = await f.t.run(async (ctx) => {
    const foreignVersion = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "p",
      outputId: f.outputId,
      id: "other-v",
      versionNumber: 2,
      title: "Other cut",
      notes: "",
      createdByUserId: "owner",
      createdAt: "2026-10-09",
      source: { kind: "link", url: "https://example.com/private" },
    });
    const foreignTranscriptId = await ctx.db.insert("transcripts", {
      mediaVersionId: foreignVersion,
      uploadedBy: "owner",
      sourceName: "other.srt",
    });
    return ctx.db.insert("transcriptSegments", {
      transcriptId: foreignTranscriptId,
      startSeconds: 0,
      endSeconds: 1,
      text: "Private dialogue",
    });
  });
  const save = (
    matches: Array<{ comment: number; segmentId: string | null }>
  ) =>
    f.t.mutation(internal.transcripts.save, {
      completion: {
        runId,
        outputJson: JSON.stringify({ matches }),
        provider: "google",
        modelId: "test",
        inputTokens: 10,
        outputTokens: 10,
      },
      matches,
    });
  await expect(
    save([{ comment: 0, segmentId: foreignSegmentId }])
  ).rejects.toThrow("Unknown");
  await expect(save([])).rejects.toThrow();
  await f.owner.mutation(api.aiRuns.setEnabled, {
    workspaceId: f.workspaceId,
    enabled: false,
  });
  await expect(
    save([{ comment: 0, segmentId: result.segments[1]._id }])
  ).rejects.toThrow("AI is disabled");
  await f.enable();
  expect(await save([{ comment: 0, segmentId: result.segments[1]._id }])).toBe(
    true
  );
  expect(await save([{ comment: 0, segmentId: result.segments[1]._id }])).toBe(
    false
  );
  const matched = await f.owner.query(api.transcripts.get, {
    mediaVersionId: "v",
  });
  expect(
    matched.matches.find((match) => match.commentId === f.ambiguous)
  ).toMatchObject({ text: "See you next time", aiDrafted: true });
  const stored = await f.t.run((ctx) =>
    ctx.db
      .query("transcriptMatches")
      .withIndex("by_transcriptId", (q) => q.eq("transcriptId", transcriptId))
      .take(100)
  );
  expect(stored).toHaveLength(1);
});

test("uploading again replaces the transcript, its segments and saved AI matches", async () => {
  const f = await fixture();
  const oldId = await f.upload();
  await f.enable();
  const { runId } = await f.generate();
  await f.t.mutation(internal.aiRuns.claim, { runId });
  const old = await f.owner.query(api.transcripts.get, { mediaVersionId: "v" });
  const matches = [{ comment: 0, segmentId: old.segments[1]._id }];
  const completion = {
    runId,
    outputJson: JSON.stringify({ matches }),
    provider: "google" as const,
    modelId: "test",
    inputTokens: 10,
    outputTokens: 10,
  };
  expect(
    await f.t.mutation(internal.transcripts.save, { completion, matches })
  ).toBe(true);
  const { runId: pendingRunId } = await f.owner.mutation(
    api.transcripts.generate,
    {
      mediaVersionId: "v",
      modelTier: "better",
    }
  );
  await f.t.mutation(internal.aiRuns.claim, { runId: pendingRunId });

  const newId = await f.owner.mutation(api.transcripts.upload, {
    mediaVersionId: "v",
    sourceName: "final.vtt",
    text: "WEBVTT\n\n00:00:10.000 --> 00:00:12.000\nNew line",
  });
  expect(newId).not.toBe(oldId);
  const replaced = await f.owner.query(api.transcripts.get, {
    mediaVersionId: "v",
  });
  expect(replaced.transcript).toMatchObject({
    _id: newId,
    sourceName: "final.vtt",
  });
  expect(replaced.segments.map((segment) => segment.text)).toEqual([
    "New line",
  ]);
  expect(replaced.matches).toEqual([]);
  const leftovers = await f.t.run(async (ctx) => ({
    transcript: await ctx.db.get(oldId),
    segments: await ctx.db
      .query("transcriptSegments")
      .withIndex("by_transcriptId", (q) => q.eq("transcriptId", oldId))
      .take(10),
    matches: await ctx.db
      .query("transcriptMatches")
      .withIndex("by_transcriptId", (q) => q.eq("transcriptId", oldId))
      .take(10),
  }));
  expect(leftovers).toEqual({ transcript: null, segments: [], matches: [] });
  // A run started on the old transcript can no longer save into the new one.
  await expect(
    f.t.mutation(internal.transcripts.save, {
      completion: { ...completion, runId: pendingRunId },
      matches,
    })
  ).rejects.toThrow("Transcript source mismatch");
});

test("upload rejects oversized or malformed files and keeps the existing transcript", async () => {
  const f = await fixture();
  await f.upload();
  await expect(
    f.owner.mutation(api.transcripts.upload, {
      mediaVersionId: "v",
      sourceName: "cut.srt",
      text: "x".repeat(32001),
    })
  ).rejects.toThrow("32 KB");
  await expect(
    f.owner.mutation(api.transcripts.upload, {
      mediaVersionId: "v",
      sourceName: "cut.txt",
      text,
    })
  ).rejects.toThrow("SRT or VTT");
  await expect(
    f.owner.mutation(api.transcripts.upload, {
      mediaVersionId: "v",
      sourceName: "cut.srt",
      text: "broken",
    })
  ).rejects.toThrow("Invalid");
  const kept = await f.owner.query(api.transcripts.get, {
    mediaVersionId: "v",
  });
  expect(kept.transcript?.sourceName).toBe("cut.srt");
  expect(kept.segments).toHaveLength(2);
});

test("match validator rejects duplicate/out-of-range comments and permits explicit no-match", () => {
  const ids = new Set(["segment"]);
  expect(() =>
    validateTranscriptMatches(
      { matches: [{ comment: 0, segmentId: "invented" }] },
      ids,
      1
    )
  ).toThrow("Unknown");
  expect(() =>
    validateTranscriptMatches(
      {
        matches: [
          { comment: 0, segmentId: "segment" },
          { comment: 0, segmentId: null },
        ],
      },
      ids,
      2
    )
  ).toThrow("duplicate");
  expect(() =>
    validateTranscriptMatches(
      { matches: [{ comment: 1, segmentId: null }] },
      ids,
      1
    )
  ).toThrow("Unknown");
  expect(() =>
    validateTranscriptMatches(
      { matches: [{ comment: 0, segmentId: null }] },
      ids,
      1
    )
  ).not.toThrow();
});

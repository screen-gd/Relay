/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { generateObject } from "ai";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { changeOrderInputSchema } from "./changeOrdersPrompt";

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
    name: "Scope studio",
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
        // Finance access alone must not allow changing rates.
        permissions: {
          viewProjects: true,
          editProjects: true,
          manageFinance: true,
        },
        createdAt: "2026-10-01",
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
      status: "Client Review",
      workflowStageId: "review",
      workflowStages: [],
      workType: "Freelance",
      startDate: "2026-10-01",
      dueDate: "2026-10-20",
      earnings: 900,
      paid: false,
      notes: "private notes",
      templateId: "social-pack",
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
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
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    });
    // v1 and v2 each get client feedback before the next version: 2 rounds.
    const versionIds = [];
    for (const n of [1, 2, 3]) {
      const versionId = await ctx.db.insert("projectMediaVersions", {
        ownerUserId: "owner",
        projectId: "p",
        outputId,
        id: `v${n}`,
        versionNumber: n,
        title: `Version ${n}`,
        notes: "",
        createdByUserId: "owner",
        createdAt: `2026-10-0${n * 2}T10:00:00.000Z`,
        source: { kind: "link", url: "https://example.com/private-media" },
      });
      versionIds.push(versionId);
      if (n < 3)
        for (const body of ["Shorter intro", "Warmer grade"])
          await ctx.db.insert("mediaVersionComments", {
            ownerUserId: "owner",
            projectId: "p",
            outputId,
            mediaVersionId: versionId,
            authorName: "private@example.com",
            body,
            resolved: true,
            createdAt: `2026-10-0${n * 2 + 1}T10:00:00.000Z`,
          });
    }
    const runId = await ctx.db.insert("aiRuns", {
      workspaceId,
      requestedBy: "owner",
      projectId: "p",
      feature: "feedback_revision_list",
      promptVersion: "v1",
      modelTier: "default",
      requestHash: "seed",
      sourceIds: [],
      month: "2026-10",
      status: "queued",
    });
    const itemId = await ctx.db.insert("revisionItems", {
      projectId: "p",
      mediaVersionId: versionIds[1],
      runId,
      sourceCommentIds: [],
      timestamps: [],
      theme: "Graphics",
      text: "Add 3 animated lower thirds",
      vague: false,
      clarifyingQuestion: null,
      possibleNewScope: true,
      status: "accepted",
    });
    return { workspaceId, outputId, itemId };
  });
  const settings = (patch: {
    defaultIncludedRounds?: number | null;
    roundBasis?: "per_output" | "per_project";
    extraRoundRate?: number | null;
  }) =>
    owner.mutation(api.revisionRounds.saveWorkspaceSettings, {
      workspaceId: seeded.workspaceId,
      defaultIncludedRounds: patch.defaultIncludedRounds ?? null,
      roundBasis: patch.roundBasis ?? null,
      extraRoundRate: patch.extraRoundRate ?? null,
      extraHourRate: 80,
      templateLimits: [],
    });
  const enable = () =>
    owner.mutation(api.aiRuns.setEnabled, {
      workspaceId: seeded.workspaceId,
      enabled: true,
    });
  const args = {
    projectId: "p",
    revisionItemIds: [seeded.itemId],
    extraHours: 0,
    modelTier: "default" as const,
  };
  return { t, owner, editor, viewer, ...seeded, settings, enable, args };
}

test("rounds come from stored versions and feedback; limits and corrections are editor-only", async () => {
  const f = await fixture();
  await f.settings({ defaultIncludedRounds: 3 });
  expect(
    await f.viewer.query(api.revisionRounds.getSummary, { projectId: "p" })
  ).toMatchObject({
    canEdit: false,
    includedRounds: 3,
    limitSource: "workspace",
    roundBasis: "per_output",
    basisSource: "default",
    roundsUsed: 2,
    extraRounds: 0,
    extraHourRate: null,
    outputs: [
      { outputId: "o", computed: 2, closingVersions: [2, 3], openRound: false },
    ],
  });
  await expect(
    f.viewer.mutation(api.revisionRounds.setProjectLimit, {
      projectId: "p",
      includedRounds: 0,
    })
  ).rejects.toThrow("Only Owners and Editors");
  await expect(
    f.editor.mutation(api.revisionRounds.saveWorkspaceSettings, {
      workspaceId: f.workspaceId,
      defaultIncludedRounds: 9,
      roundBasis: null,
      extraRoundRate: 1,
      extraHourRate: 1,
      templateLimits: [],
    })
  ).rejects.toThrow("Only the Workspace Owner");
  expect(
    await f.editor.query(api.revisionRounds.getWorkspaceSettings, {
      workspaceId: f.workspaceId,
    })
  ).toMatchObject({ canManage: false, roundBasis: "per_output" });
  expect(
    await f.owner.query(api.revisionRounds.getWorkspaceSettings, {
      workspaceId: f.workspaceId,
    })
  ).toMatchObject({ canManage: true });
  await f.owner.mutation(api.revisionRounds.saveWorkspaceSettings, {
    workspaceId: f.workspaceId,
    defaultIncludedRounds: 3,
    roundBasis: null,
    extraRoundRate: null,
    extraHourRate: null,
    templateLimits: [{ templateId: "social-pack", includedRounds: 2 }],
  });
  expect(
    await f.editor.query(api.revisionRounds.getSummary, { projectId: "p" })
  ).toMatchObject({ includedRounds: 2, limitSource: "template" });
  await f.editor.mutation(api.revisionRounds.setProjectLimit, {
    projectId: "p",
    includedRounds: 1,
  });
  await f.editor.mutation(api.revisionRounds.correctRounds, {
    projectId: "p",
    outputId: "o",
    rounds: 3,
  });
  expect(
    await f.editor.query(api.revisionRounds.getSummary, { projectId: "p" })
  ).toMatchObject({
    includedRounds: 1,
    limitSource: "project",
    roundsUsed: 3,
    extraRounds: 2,
    outputs: [{ computed: 2, adjustment: 1, roundsUsed: 3 }],
  });
  await expect(
    f.editor.mutation(api.revisionRounds.correctRounds, {
      projectId: "p",
      outputId: "o",
      rounds: -1,
    })
  ).rejects.toThrow("whole number");
});

test("per project sums rounds across outputs; the project can override the basis", async () => {
  const f = await fixture();
  await f.settings({
    defaultIncludedRounds: 2,
    roundBasis: "per_project",
    extraRoundRate: 150,
  });
  // A second output with one closed round: 3 rounds across the Project.
  await f.t.run(async (ctx) => {
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "p",
      id: "o2",
      title: "Teaser",
      description: "",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    });
    for (const n of [1, 2]) {
      const versionId = await ctx.db.insert("projectMediaVersions", {
        ownerUserId: "owner",
        projectId: "p",
        outputId,
        id: `t${n}`,
        versionNumber: n,
        title: `Teaser ${n}`,
        notes: "",
        createdByUserId: "owner",
        createdAt: `2026-10-0${n * 2}T10:00:00.000Z`,
        source: { kind: "link", url: "https://example.com/private-media" },
      });
      if (n === 1)
        await ctx.db.insert("mediaVersionComments", {
          ownerUserId: "owner",
          projectId: "p",
          outputId,
          mediaVersionId: versionId,
          authorName: "Client",
          body: "Tighter",
          resolved: true,
          createdAt: "2026-10-03T10:00:00.000Z",
        });
    }
  });
  const summary = () =>
    f.editor.query(api.revisionRounds.getSummary, { projectId: "p" });
  expect(await summary()).toMatchObject({
    roundBasis: "per_project",
    basisSource: "workspace",
    roundsUsed: 3,
    extraRounds: 1,
    outputs: [
      { outputId: "o", roundsUsed: 2, extraRounds: 0 },
      { outputId: "o2", roundsUsed: 1, extraRounds: 0 },
    ],
  });
  await f.enable();
  await f.editor.mutation(api.changeOrders.generate, f.args);
  const draft = await f.editor.query(api.changeOrders.latest, {
    projectId: "p",
  });
  expect(draft?.draft.facts).toMatchObject({
    roundBasis: "per_project",
    roundsUsed: 3,
    extraRounds: 1,
    outputs: [
      { title: "Main cut", roundsUsed: 2, extraRounds: null },
      { title: "Teaser", roundsUsed: 1, extraRounds: null },
    ],
    amounts: { extraRounds: 150, total: 150 },
  });
  await f.editor.mutation(api.revisionRounds.setProjectLimit, {
    projectId: "p",
    includedRounds: null,
    roundBasis: "per_output",
  });
  expect(await summary()).toMatchObject({
    includedRounds: 2,
    limitSource: "workspace",
    roundBasis: "per_output",
    basisSource: "project",
    extraRounds: 0,
  });
  await f.editor.mutation(api.revisionRounds.setProjectLimit, {
    projectId: "p",
    includedRounds: null,
    roundBasis: null,
  });
  expect(await summary()).toMatchObject({
    basisSource: "workspace",
    extraRounds: 1,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("projectRevisionScopes").collect())
  ).toEqual([]);
});

test("drafting requires opt-in, an Owner or Editor, and rounds over the limit", async () => {
  const f = await fixture();
  await f.settings({ defaultIncludedRounds: 2, extraRoundRate: 150 });
  await expect(
    f.owner.mutation(api.changeOrders.generate, f.args)
  ).rejects.toThrow("Revision rounds are within the included limit");
  await f.owner.mutation(api.revisionRounds.setProjectLimit, {
    projectId: "p",
    includedRounds: 1,
  });
  await expect(
    f.owner.mutation(api.changeOrders.generate, f.args)
  ).rejects.toThrow("AI is disabled");
  await f.enable();
  await expect(
    f.viewer.mutation(api.changeOrders.generate, f.args)
  ).rejects.toThrow("Only Owners and Editors");
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "outsider" })
      .mutation(api.changeOrders.generate, f.args)
  ).rejects.toThrow("Permission denied");
  await expect(
    f.owner.mutation(api.changeOrders.generate, {
      ...f.args,
      extraHours: 1.1,
    })
  ).rejects.toThrow("quarter hours");
  await f.editor.mutation(api.changeOrders.generate, f.args);
  expect(generateObject).not.toHaveBeenCalled();
});

test("scheduled input holds only titles, counts, rates, amounts and chosen revision text", async () => {
  const f = await fixture();
  await f.settings({ defaultIncludedRounds: 1, extraRoundRate: 150 });
  await f.enable();
  await f.owner.mutation(api.changeOrders.generate, {
    ...f.args,
    extraHours: 1.5,
  });
  const scheduled = await f.t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").take(10)).find((row) =>
      row.name.includes("changeOrdersActions")
    )
  );
  const argument = scheduled?.args[0];
  if (!argument || typeof argument !== "object" || !("inputJson" in argument))
    throw new Error("Missing input");
  const inputJson = String(argument.inputJson);
  expect(changeOrderInputSchema.parse(JSON.parse(inputJson))).toEqual({
    projectTitle: "Launch film",
    currencyCode: "USD",
    includedRounds: 1,
    roundBasis: "per_output",
    roundsUsed: 2,
    outputs: [{ title: "Main cut", roundsUsed: 2, extraRounds: 1 }],
    extraRounds: 1,
    extraHours: 1.5,
    rates: { extraRound: 150, extraHour: 80 },
    amounts: { extraRounds: 150, extraHours: 120, total: 270 },
    revisionItems: [
      {
        theme: "Graphics",
        text: "Add 3 animated lower thirds",
        possibleNewScope: true,
      },
    ],
  });
  expect(inputJson).not.toMatch(/private|email|token|clientId|example\.com/);
  const copies = await f.t.run(async (ctx) => {
    const { _id, _creationTime, ...fields } = (await ctx.db.get(f.itemId))!;
    void _id;
    void _creationTime;
    const other = await ctx.db.insert("revisionItems", {
      ...fields,
      projectId: "other",
    });
    const many = [];
    for (let i = 0; i < 21; i++)
      many.push(await ctx.db.insert("revisionItems", fields));
    return { other, many };
  });
  await expect(
    f.owner.mutation(api.changeOrders.generate, {
      ...f.args,
      revisionItemIds: [copies.other],
    })
  ).rejects.toThrow("Revision item not found");
  await expect(
    f.owner.mutation(api.changeOrders.generate, {
      ...f.args,
      revisionItemIds: copies.many,
    })
  ).rejects.toThrow("Choose up to 20");
});

test("save rejects invented numbers and a missing total, then stores an editable draft", async () => {
  const f = await fixture();
  await f.settings({ defaultIncludedRounds: 1, extraRoundRate: 150 });
  await f.enable();
  const { runId } = await f.owner.mutation(api.changeOrders.generate, f.args);
  await f.t.mutation(internal.aiRuns.claim, { runId });
  const save = (subject: string, message: string) =>
    f.t.mutation(internal.changeOrders.save, {
      completion: {
        runId,
        outputJson: JSON.stringify({ subject, message }),
        provider: "google",
        modelId: "test-model",
        inputTokens: 1,
        outputTokens: 1,
      },
    });
  await expect(
    save(
      "Extra round",
      "You have used 2 rounds. A 10% discount brings it to USD 135."
    )
  ).rejects.toThrow("not supplied");
  await expect(
    save("Extra round", "You have used 2 of 1 included rounds.")
  ).rejects.toThrow("computed total");
  expect((await f.owner.query(api.aiRuns.getRun, { runId }))?.status).toBe(
    "running"
  );
  const message =
    "Main cut has used 2 revision rounds; 1 was included. The extra round is USD 150.00, adding the 3 lower thirds. Total: USD 150. Please confirm before I continue.";
  expect(await save("Extra revision round for Launch film", message)).toBe(
    true
  );
  const latest = await f.owner.query(api.changeOrders.latest, {
    projectId: "p",
  });
  expect(latest).toMatchObject({
    status: "succeeded",
    draft: {
      message,
      sourceOutputIds: ["o"],
      sourceRevisionItemIds: [f.itemId],
    },
  });
  expect(
    await f.editor.query(api.changeOrders.latest, { projectId: "p" })
  ).toBeNull();
  await expect(
    f.editor.mutation(api.changeOrders.update, {
      draftId: latest!.draft._id,
      subject: "Edited",
      message: "Edited",
    })
  ).rejects.toThrow("Draft access required");
  await f.owner.mutation(api.changeOrders.update, {
    draftId: latest!.draft._id,
    subject: "Extra round",
    message: "Edited by the editor: USD 175 total.",
  });
});

test("the worker fails the run without saving when the model invents a number", async () => {
  const f = await fixture();
  await f.settings({ defaultIncludedRounds: 1, extraRoundRate: 150 });
  await f.enable();
  const { runId } = await f.owner.mutation(api.changeOrders.generate, f.args);
  const draft = await f.owner.query(api.changeOrders.latest, {
    projectId: "p",
  });
  vi.mocked(generateObject).mockResolvedValue({
    object: { subject: "Extra round", message: "Total: USD 200." },
    response: { modelId: "actual-model" },
    usage: { inputTokens: 5, outputTokens: 5 },
  } as Awaited<ReturnType<typeof generateObject>>);
  await f.t.action(internal.changeOrdersActions.run, {
    runId,
    inputJson: JSON.stringify(draft!.draft.facts),
  });
  expect(
    await f.owner.query(api.changeOrders.latest, { projectId: "p" })
  ).toMatchObject({ status: "failed", failureCode: "provider_error" });
  expect(
    (await f.owner.query(api.changeOrders.latest, { projectId: "p" }))?.draft
      .message
  ).toBeUndefined();
});

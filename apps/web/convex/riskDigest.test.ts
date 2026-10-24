/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { generateObject } from "ai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { riskDigestInputSchema } from "./riskDigestPrompt";
import schema from "./schema";
import { seedAiKeys } from "./testHelpers/aiKeys.fixture";

vi.mock("ai", () => ({ generateObject: vi.fn() }));
const modules = import.meta.glob("./**/*.ts");
const NOW = "2026-10-09T12:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

type ProjectFields = Omit<Doc<"projects">, "_id" | "_creationTime">;

function project(id: string, overrides: Partial<ProjectFields>): ProjectFields {
  return {
    ownerUserId: "owner",
    id,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: "private-client",
    archived: false,
    status: "In Progress",
    workflowStageId: "edit",
    workflowStages: [{ id: "edit", label: "Edit", purpose: "editing" }],
    workType: "Freelance",
    startDate: "2026-10-01",
    dueDate: "2026-10-10",
    earnings: 900,
    paid: false,
    notes: "private notes",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function fixture() {
  const t = convexTest(schema, modules);
  rateLimiterComponent.register(t);
  const workspaceId = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Studio",
      inviteCode: "DIGEST",
      createdAt: NOW,
      timeZone: "UTC",
      aiEnabled: true,
    });
    for (const [userId, role] of [
      ["owner", "Owner"],
      ["editor", "Editor"],
      ["reviewer", "Reviewer"],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        email: `${userId}@example.com`,
        name: userId,
        role,
        status: "active",
        permissions: { viewProjects: true },
        createdAt: NOW,
      });
    }
    await ctx.db.insert(
      "projects",
      project("late", {
        teamId: workspaceId,
        title: "Launch film 2",
        assigneeUserIds: ["editor"],
        dueDate: "2026-10-07",
      })
    );
    await ctx.db.insert(
      "projects",
      project("solo", { title: "Brand spot", dueDate: "2026-10-08" })
    );
    return workspaceId;
  });
  await t.mutation(internal.deadlineRisk.scanWorkspace, { workspaceId });
  await seedAiKeys(t, workspaceId);
  const as = (tokenIdentifier: string) => t.withIdentity({ tokenIdentifier });
  const generate = (user = "owner") =>
    as(user).mutation(api.riskDigest.generate, {
      workspaceId,
      modelTier: "default",
    });
  return { t, workspaceId, as, generate };
}

function completion(runId: Id<"aiRuns">, lines: unknown) {
  return {
    runId,
    outputJson: JSON.stringify({ lines }),
    provider: "google" as const,
    modelId: "test-model",
    inputTokens: 1,
    outputTokens: 1,
  };
}

test("the hourly scan never starts AI runs", async () => {
  const { t } = await fixture();
  await t.mutation(internal.deadlineRisk.scanAll, { cursor: null });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.query("aiRuns").take(1))).toEqual([]);
});

test("generate is limited to opted-in Owners and Editors and sends only rule findings", async () => {
  const { t, workspaceId, generate } = await fixture();
  await expect(
    t.mutation(api.riskDigest.generate, { workspaceId, modelTier: "default" })
  ).rejects.toThrow("Not authenticated");
  await expect(generate("reviewer")).rejects.toThrow("Owner or Editor");
  await expect(generate("stranger")).rejects.toThrow("Owner or Editor");

  await generate();
  const scheduled = await t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").take(20)).find((row) =>
      row.name.includes("riskDigestActions")
    )
  );
  const argument = scheduled?.args[0];
  if (!argument || typeof argument !== "object" || !("inputJson" in argument))
    throw new Error("Missing input");
  const inputJson = String(argument.inputJson);
  expect(riskDigestInputSchema.parse(JSON.parse(inputJson))).toEqual({
    today: "2026-10-09",
    findings: [
      expect.objectContaining({
        projectTitle: "Launch film 2",
        kind: "overdue",
        daysUntilDue: -2,
        waitingOn: "editor",
      }),
      expect.objectContaining({ projectTitle: "Brand spot", daysUntilDue: -1 }),
    ],
  });
  expect(inputJson).not.toMatch(/private|example\.com|earnings|900/);

  await t.run((ctx) => ctx.db.patch(workspaceId, { aiEnabled: false }));
  await expect(generate("editor")).rejects.toThrow("AI is disabled");
});

test("generate re-checks deadlines before reading findings", async () => {
  const { t, workspaceId, as, generate } = await fixture();
  // Changes since the last scan: one Project rescheduled, one newly overdue.
  await t.run(async (ctx) => {
    const solo = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", "solo"))
      .unique();
    await ctx.db.patch(solo!._id, { dueDate: "2026-12-01" });
    await ctx.db.insert(
      "projects",
      project("new", { title: "Teaser", dueDate: "2026-10-06" })
    );
  });
  await generate();
  const digest = await as("owner").query(api.riskDigest.latest, {
    workspaceId,
  });
  expect(digest?.items.map((item) => item.projectId)).toEqual(["new", "late"]);
  expect(
    (
      await as("owner").query(api.deadlineRisk.listFindings, { workspaceId })
    ).findings.map((finding) => finding.projectId)
  ).toEqual(["new", "late"]);
});

test("save rejects invented, dropped, reordered and off-finding lines", async () => {
  const { t, as, workspaceId, generate } = await fixture();
  const { runId } = await generate();
  await t.mutation(internal.aiRuns.claim, { runId });
  const good = [
    { position: 0, text: "Launch film 2 is 2 days overdue (due 2026-10-07)." },
    { position: 1, text: "Brand spot was due yesterday." },
  ];
  for (const [lines, message] of [
    [[...good, { position: 2, text: "Extra film is late." }], "exactly once"],
    [good.slice(0, 1), "exactly once"],
    [[good[1], good[0]], "finding order"],
    [
      [{ position: 0, text: "Launch film 2 is due 2026-10-12." }, good[1]],
      "outside its finding",
    ],
  ] as const) {
    await expect(
      t.mutation(internal.riskDigest.save, {
        completion: completion(runId, lines),
      })
    ).rejects.toThrow(message);
  }
  expect(
    await as("owner").query(api.riskDigest.latest, { workspaceId })
  ).toMatchObject({
    status: "running",
    items: [{ line: null }, { line: null }],
  });

  expect(
    await t.mutation(internal.riskDigest.save, {
      completion: completion(runId, good),
    })
  ).toBe(true);
  const digest = await as("owner").query(api.riskDigest.latest, {
    workspaceId,
  });
  expect(digest).toMatchObject({
    status: "succeeded",
    totalFindings: 2,
    items: [
      { projectId: "late", line: good[0].text },
      { projectId: "solo", line: good[1].text },
    ],
  });
});

test("a provider answer with an invented finding fails the run without saving lines", async () => {
  const { t, as, workspaceId, generate } = await fixture();
  const { runId } = await generate();
  const inputJson = await t.run(async (ctx) => {
    const row = (
      await ctx.db.system.query("_scheduled_functions").take(20)
    ).find((entry) => entry.name.includes("riskDigestActions"));
    const argument = row?.args[0];
    return argument && typeof argument === "object" && "inputJson" in argument
      ? String(argument.inputJson)
      : "";
  });
  vi.mocked(generateObject).mockResolvedValue({
    object: {
      lines: [
        { position: 0, text: "Launch film 2 is overdue." },
        { position: 1, text: "Brand spot is overdue." },
        { position: 2, text: "Secret project is overdue." },
      ],
    },
    response: { modelId: "actual-model" },
    usage: { inputTokens: 3, outputTokens: 4 },
  } as Awaited<ReturnType<typeof generateObject>>);
  await t.action(internal.riskDigestActions.run, { runId, inputJson });
  expect(
    await as("owner").query(api.riskDigest.latest, { workspaceId })
  ).toMatchObject({
    status: "failed",
    failureCode: "provider_error",
    items: [{ line: null }, { line: null }],
  });
});

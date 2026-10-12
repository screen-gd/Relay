/// <reference types="vite/client" />
import rateLimiterComponent from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { generateText } from "ai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { verifyEarningsAnswer, type EarningsAnswer } from "./earningsQaPrompt";
import schema from "./schema";
import { seedAiKeys } from "./testHelpers/aiKeys.fixture";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  isStepCount: vi.fn(),
  Output: { object: vi.fn() },
  tool: <T>(definition: T) => definition,
}));
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
    title: `Title ${id}`,
    clientId: "client-a",
    archived: false,
    status: "Delivered",
    workflowStageId: "done",
    workflowStages: [{ id: "done", label: "Delivered", purpose: "delivered" }],
    workType: "Freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-10",
    earnings: 0,
    paid: false,
    notes: "",
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
      inviteCode: "EARNQA",
      createdAt: NOW,
      currencyCode: "EUR",
      timeZone: "UTC",
      aiEnabled: true,
    });
    for (const [userId, role, manageFinance] of [
      ["owner", "Owner", true],
      ["finance", "Editor", true],
      ["editor", "Editor", false],
      ["reviewer", "Reviewer", true],
    ] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId,
        email: `${userId}@example.com`,
        name: userId,
        role,
        status: "active",
        permissions: { viewProjects: true, manageFinance },
        createdAt: NOW,
      });
    }
    await ctx.db.insert(
      "projects",
      project("team-paid", {
        teamId: workspaceId,
        assigneeUserIds: ["finance"],
        earnings: 300,
        paid: true,
        completedAt: "2026-08-05T10:00:00.000Z",
      })
    );
    await ctx.db.insert(
      "projects",
      project("solo", {
        earnings: 800,
        completedAt: "2026-08-06T10:00:00.000Z",
      })
    );
    return workspaceId;
  });
  await seedAiKeys(t, workspaceId);
  const as = (tokenIdentifier: string) => t.withIdentity({ tokenIdentifier });
  const ask = (user: string, question = "What did I earn in August?") =>
    as(user).mutation(api.earningsQa.ask, {
      workspaceId,
      question,
      modelTier: "default",
    });
  return { t, workspaceId, as, ask };
}

async function scheduledInput(
  t: Awaited<ReturnType<typeof fixture>>["t"],
  runId: Id<"aiRuns">
) {
  return t.run(async (ctx) => {
    const rows = await ctx.db.system.query("_scheduled_functions").take(20);
    for (const row of rows) {
      const argument = row.args[0];
      if (
        row.name.includes("earningsQaActions") &&
        argument &&
        typeof argument === "object" &&
        "runId" in argument &&
        argument.runId === runId &&
        "inputJson" in argument
      )
        return String(argument.inputJson);
    }
    throw new Error("Missing scheduled input");
  });
}

/** Fakes a model that calls the `totals` tool for August, then answers. */
function modelAnswers(answer: (toolOutput: unknown) => EarningsAnswer) {
  vi.mocked(generateText).mockImplementation(async (options) => {
    const totals = options.tools?.totals;
    if (!totals || !("execute" in totals) || !totals.execute)
      throw new Error("Missing tool");
    const toolOutput: unknown = await totals.execute(
      { start: "2026-08-01", end: "2026-08-31" },
      { toolCallId: "call-1", messages: [], context: {} }
    );
    return {
      output: answer(toolOutput),
      steps: [{ toolResults: [{ output: toolOutput }] }],
      totalUsage: { inputTokens: 5, outputTokens: 6 },
      response: { modelId: "actual-model" },
    } as unknown as Awaited<ReturnType<typeof generateText>>;
  });
}

test("ask requires an opted-in Owner or Editor with Finance access and bounds input", async () => {
  const { t, workspaceId, ask } = await fixture();
  await expect(
    t.mutation(api.earningsQa.ask, {
      workspaceId,
      question: "Earnings?",
      modelTier: "default",
    })
  ).rejects.toThrow("Not authenticated");
  await expect(ask("editor")).rejects.toThrow("Finance access required");
  await expect(ask("reviewer")).rejects.toThrow("Owners and Editors");
  await expect(ask("finance", "x".repeat(501))).rejects.toThrow(
    "3–500 characters"
  );

  const { runId } = await ask("finance");
  expect(JSON.parse(await scheduledInput(t, runId))).toEqual({
    question: "What did I earn in August?",
    today: "2026-10-09",
  });

  await t.run((ctx) => ctx.db.patch(workspaceId, { aiEnabled: false }));
  await expect(ask("finance", "And in July?")).rejects.toThrow(
    "AI is disabled"
  );
});

test("tools run as the requester and cited answers are saved", async () => {
  const { t, workspaceId, as, ask } = await fixture();
  const { runId } = await ask("finance");
  modelAnswers(() => ({
    text: "You earned 300 in August, all collected.",
    citations: [
      {
        label: "August earned",
        value: 300,
        projectIds: ["team-paid"],
        salaryBatchIds: [],
      },
    ],
  }));
  await t.action(internal.earningsQaActions.run, {
    runId,
    inputJson: await scheduledInput(t, runId),
  });
  const [row] = await as("finance").query(api.earningsQa.recent, {
    workspaceId,
  });
  expect(row).toMatchObject({
    status: "succeeded",
    answer: { citations: [{ value: 300, projectIds: ["team-paid"] }] },
  });
});

test("answers citing numbers or sources the tools did not return fail safely", async () => {
  const { t, workspaceId, as, ask } = await fixture();
  const { runId } = await ask("finance");
  // The Owner would see 1,100; the finance editor's tool only returns 300.
  modelAnswers(() => ({
    text: "You earned 1,100 in August.",
    citations: [
      { label: "August", value: 1100, projectIds: [], salaryBatchIds: [] },
    ],
  }));
  await t.action(internal.earningsQaActions.run, {
    runId,
    inputJson: await scheduledInput(t, runId),
  });
  const [row] = await as("finance").query(api.earningsQa.recent, {
    workspaceId,
  });
  expect(row).toMatchObject({
    status: "failed",
    failureCode: "verification_failed",
  });
  expect(row.answer).toBeUndefined();

  const toolOutput = {
    total: { earned: 300, sources: { projectIds: ["p1"] } },
  };
  const cite = (text: string, value: number, projectIds: string[]) => ({
    text,
    citations: [{ label: "Total", value, projectIds, salaryBatchIds: [] }],
  });
  expect(() =>
    verifyEarningsAnswer(
      cite("Earned 300.", 300, ["p1"]),
      [toolOutput],
      "2026-10-09"
    )
  ).not.toThrow();
  expect(() =>
    verifyEarningsAnswer(
      cite("Earned 300.", 300, ["p9"]),
      [toolOutput],
      "2026-10-09"
    )
  ).toThrow("source");
  expect(() =>
    verifyEarningsAnswer(
      cite("Up 50%.", 300, ["p1"]),
      [toolOutput],
      "2026-10-09"
    )
  ).toThrow("no tool returned");
  expect(() =>
    verifyEarningsAnswer(
      { text: "Earned 300.", citations: [] },
      [toolOutput],
      "2026-10-09"
    )
  ).toThrow("without citations");
});

test("every earnings tool keeps its stored scope when model input supplies identity fields", async () => {
  const { t, workspaceId, as, ask } = await fixture();
  const otherWorkspaceId = await t.run((ctx) =>
    ctx.db.insert("teamWorkspaces", {
      ownerUserId: "outsider",
      name: "Other studio",
      inviteCode: "OTHER",
      createdAt: NOW,
    })
  );
  const { runId } = await ask("finance");
  const calledTools: string[] = [];
  vi.mocked(generateText).mockImplementation(async (options) => {
    const toolOutputs: unknown[] = [];
    const inputs = {
      totals: {},
      byClient: {},
      byPeriod: { granularity: "month" },
      byProject: {},
      bySalaryBatch: {},
    };
    for (const [name, input] of Object.entries(inputs)) {
      const tool = options.tools?.[name];
      if (!tool || !("execute" in tool) || !tool.execute)
        throw new Error("Missing tool");
      // Bypass SDK parsing to model a future schema that permits these fields.
      const output: unknown = await tool.execute(
        {
          start: "2026-08-01",
          end: "2026-08-31",
          ...input,
          workspaceId: otherWorkspaceId,
          requestedBy: "owner",
        },
        { toolCallId: name, messages: [], context: {} }
      );
      expect(output).toMatchObject({ includesSoloWork: false });
      toolOutputs.push(output);
      calledTools.push(name);
    }
    return {
      output: { text: "Your workspace records were checked.", citations: [] },
      steps: [{ toolResults: toolOutputs.map((output) => ({ output })) }],
      totalUsage: { inputTokens: 1, outputTokens: 1 },
      response: { modelId: "test-model" },
    } as Awaited<ReturnType<typeof generateText>>;
  });
  await t.action(internal.earningsQaActions.run, {
    runId,
    inputJson: await scheduledInput(t, runId),
  });
  expect(calledTools).toEqual([
    "totals",
    "byClient",
    "byPeriod",
    "byProject",
    "bySalaryBatch",
  ]);
  expect(
    await as("finance").query(api.earningsQa.recent, { workspaceId })
  ).toMatchObject([{ status: "succeeded" }]);
});

test("tools recheck Finance access when the run executes", async () => {
  const { t, workspaceId, ask } = await fixture();
  const { runId } = await ask("finance");
  await t.run(async (ctx) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", workspaceId).eq("userId", "finance")
      )
      .unique();
    if (member)
      await ctx.db.patch(member._id, {
        permissions: { viewProjects: true, manageFinance: false },
      });
  });
  modelAnswers(() => ({ text: "No data.", citations: [] }));
  await t.action(internal.earningsQaActions.run, {
    runId,
    inputJson: await scheduledInput(t, runId),
  });
  const run = await t.run((ctx) => ctx.db.get(runId));
  expect(run).toMatchObject({
    status: "failed",
    failureCode: "provider_error",
  });
});

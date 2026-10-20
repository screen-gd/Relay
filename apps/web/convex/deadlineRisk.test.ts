/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const NOW = "2026-10-09T12:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

type ProjectFields = Omit<Doc<"projects">, "_id" | "_creationTime">;

function project(
  id: string,
  overrides: Partial<ProjectFields> = {}
): ProjectFields {
  return {
    ownerUserId: "owner",
    id,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: "client-a",
    archived: false,
    status: "In Progress",
    workflowStageId: "edit",
    workflowStages: [
      { id: "edit", label: "Edit", purpose: "editing" },
      { id: "done", label: "Delivered", purpose: "delivered" },
    ],
    workType: "Freelance",
    startDate: "2026-10-01",
    dueDate: "2026-10-10",
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
  const workspaceId = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Studio",
      inviteCode: "RISK01",
      createdAt: NOW,
      timeZone: "UTC",
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
        assigneeUserIds: ["editor"],
        dueDate: "2026-10-07",
      })
    );
    await ctx.db.insert("projects", project("hidden", { teamId: workspaceId }));
    await ctx.db.insert("projects", project("solo", { dueDate: "2026-10-08" }));
    await ctx.db.insert(
      "projects",
      project("later", { teamId: workspaceId, dueDate: "2026-11-01" })
    );
    await ctx.db.insert(
      "projects",
      project("someone-elses", {
        ownerUserId: "stranger",
        dueDate: "2026-10-01",
      })
    );
    return workspaceId;
  });
  const findings = (tokenIdentifier: string) =>
    t
      .withIdentity({ tokenIdentifier })
      .query(api.deadlineRisk.listFindings, { workspaceId });
  return { t, workspaceId, findings };
}

test("the cron fan-out stores rule findings for each Workspace", async () => {
  const { t, findings } = await fixture();
  await t.mutation(internal.deadlineRisk.scanAll, { cursor: null });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const result = await findings("owner");
  expect(result).toMatchObject({ evaluatedOn: "2026-10-09", truncated: false });
  expect(
    result.findings.map(({ projectId, kind, daysUntilDue }) => [
      projectId,
      kind,
      daysUntilDue,
    ])
  ).toEqual([
    ["late", "overdue", -2],
    ["solo", "overdue", -1],
    ["hidden", "due_soon", 1],
  ]);
});

test("findings respect role and Project visibility", async () => {
  const { t, workspaceId, findings } = await fixture();
  await t.mutation(internal.deadlineRisk.scanWorkspace, { workspaceId });

  expect((await findings("editor")).findings.map((f) => f.projectId)).toEqual([
    "late",
  ]);
  await expect(findings("reviewer")).rejects.toThrow("Owner or Editor");
  await expect(findings("stranger")).rejects.toThrow("Owner or Editor");
  await expect(
    t.query(api.deadlineRisk.listFindings, { workspaceId })
  ).rejects.toThrow("Not authenticated");
});

test("unchanged scans skip writes and closed Projects drop out before the next scan", async () => {
  const { t, workspaceId, findings } = await fixture();
  await t.mutation(internal.deadlineRisk.scanWorkspace, { workspaceId });
  const first = await findings("owner");

  vi.setSystemTime(new Date("2026-10-09T13:00:00.000Z"));
  await t.mutation(internal.deadlineRisk.scanWorkspace, { workspaceId });
  const second = await findings("owner");
  expect(second.updatedAt).toBe(first.updatedAt);
  expect(second.findings.map((f) => f._id)).toEqual(
    first.findings.map((f) => f._id)
  );

  await t.run(async (ctx) => {
    const late = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", "late"))
      .unique();
    if (late) await ctx.db.patch(late._id, { status: "Delivered" });
  });
  expect((await findings("owner")).findings.map((f) => f.projectId)).toEqual([
    "solo",
    "hidden",
  ]);
});

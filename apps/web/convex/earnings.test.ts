/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const NOW = "2026-08-01T00:00:00.000Z";

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
    title: `Title ${id}`,
    clientId: "client-a",
    archived: false,
    status: "Delivered",
    workflowStageId: "done",
    workflowStages: [
      { id: "edit", label: "Edit", purpose: "editing" },
      { id: "done", label: "Delivered", purpose: "delivered" },
    ],
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
  const workspaceId = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Studio",
      inviteCode: "EARN01",
      createdAt: NOW,
      currencyCode: "EUR",
    });
    for (const [userId, role, manageFinance] of [
      ["owner", "Owner", true],
      ["finance", "Editor", true],
      ["editor", "Editor", false],
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
    await ctx.db.insert("clients", {
      ownerUserId: "owner",
      id: "client-a",
      name: "Acme",
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    });
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
      project("team-hidden", { teamId: workspaceId, earnings: 200 })
    );
    await ctx.db.insert(
      "projects",
      project("solo", {
        earnings: 100,
        completedAt: "2026-09-03T10:00:00.000Z",
      })
    );
    await ctx.db.insert(
      "projects",
      project("salary-1", { workType: "Job / Salary" })
    );
    await ctx.db.insert("projectSalaryBatches", {
      ownerUserId: "owner",
      id: "salary-batch-1",
      number: 1,
      workType: "Job / Salary",
      requiredProjectCount: 1,
      amount: 500,
      projectIds: ["salary-1"],
      completedAt: "2026-08-20T10:00:00.000Z",
      paid: false,
    });
    return workspaceId;
  });
  const as = (tokenIdentifier: string) => t.withIdentity({ tokenIdentifier });
  return { t, workspaceId, as };
}

test("Finance access gates earnings, and only the Owner sees solo work and Salary Batches", async () => {
  const { workspaceId, as } = await fixture();

  const owner = await as("owner").query(api.earnings.totals, { workspaceId });
  expect(owner).toMatchObject({
    currencyCode: "EUR",
    includesSoloWork: true,
    truncated: false,
    salaryProjectCount: 1,
    total: {
      earned: 1_100,
      collected: 300,
      outstanding: 800,
      projectCount: 3,
      salaryBatchCount: 1,
    },
    salaryBatches: {
      earned: 500,
      sources: { salaryBatchIds: ["salary-batch-1"] },
    },
  });

  const finance = await as("finance").query(api.earnings.totals, {
    workspaceId,
  });
  expect(finance).toMatchObject({
    includesSoloWork: false,
    total: {
      earned: 300,
      salaryBatchCount: 0,
      sources: { projectIds: ["team-paid"], salaryBatchIds: [] },
    },
  });

  await expect(
    as("editor").query(api.earnings.totals, { workspaceId })
  ).rejects.toThrow("Finance access required");
  await expect(
    as("stranger").query(api.earnings.totals, { workspaceId })
  ).rejects.toThrow("Workspace access required");
});

test("breakdowns cite Clients, Projects, Salary Batches and periods", async () => {
  const { workspaceId, as } = await fixture();
  const owner = as("owner");
  const august = { workspaceId, start: "2026-08-01", end: "2026-08-31" };

  expect((await owner.query(api.earnings.byClient, august)).clients).toEqual([
    expect.objectContaining({
      clientId: "client-a",
      clientName: "Acme",
      earned: 1_000,
    }),
  ]);

  const projects = await owner.query(api.earnings.byProject, august);
  expect(projects.projects).toEqual([
    expect.objectContaining({
      projectId: "salary-1",
      kind: "salary_project",
      amount: 0,
      salaryBatchId: "salary-batch-1",
    }),
    expect.objectContaining({
      projectId: "team-hidden",
      kind: "project",
      amount: 200,
      paid: false,
    }),
    expect.objectContaining({
      projectId: "team-paid",
      title: "Title team-paid",
      amount: 300,
      paid: true,
    }),
  ]);

  expect(
    (await owner.query(api.earnings.bySalaryBatch, august)).salaryBatches
  ).toEqual([
    expect.objectContaining({
      salaryBatchId: "salary-batch-1",
      number: 1,
      amount: 500,
      projectIds: ["salary-1"],
    }),
  ]);

  const periods = await owner.query(api.earnings.byPeriod, {
    workspaceId,
    start: "2026-08-01",
    end: "2026-09-30",
    granularity: "month",
  });
  expect(periods.periods.map(({ label, earned }) => [label, earned])).toEqual([
    ["2026-08", 1_000],
    ["2026-09", 100],
  ]);

  await expect(
    owner.query(api.earnings.totals, {
      workspaceId,
      start: "2026-09-01",
      end: "2026-08-01",
    })
  ).rejects.toThrow("on or before");
});

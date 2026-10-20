/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setupProject() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const createdAt = "2026-08-24T00:00:00.000Z";
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Project Files Workspace",
      inviteCode: "FILES1",
      createdAt,
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner",
      role: "Owner",
      status: "active",
      permissions: {
        viewProjects: true,
        createProjects: true,
        editProjects: true,
        updateStatus: true,
        commentProjects: true,
        manageTeam: true,
        useChat: true,
      },
      createdAt,
      joinedAt: createdAt,
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan: "creator",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: createdAt,
    });
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-files-rebuild",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Project Files",
      clientId: "client-a",
      archived: false,
      status: "In Progress",
      workflowStageId: "planned",
      workflowStages: [{ id: "planned", label: "Planned", purpose: "planned" }],
      workType: "Freelance",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
  });
  return {
    t,
    owner: t.withIdentity({ tokenIdentifier: "owner", name: "Owner" }),
  };
}

test("Project files validate uploads, retain quota, and require archive before deletion", async () => {
  const { owner, t } = await setupProject();
  const validFile = {
    projectId: "project-files-rebuild",
    category: "Deliverable" as const,
    title: "Final export",
    description: "Client handoff",
    status: "approved" as const,
    clientVisible: true,
    downloadable: true,
    provider: "google_drive" as const,
    externalUrl: "https://drive.google.com/file/final-export",
    fileName: "final-export.pdf",
    mimeType: "application/pdf",
    size: 1024,
    notes: "",
  };

  await expect(
    owner.mutation(api.projectFiles.saveExternalVersion, {
      ...validFile,
      fileName: "final-export.exe",
      mimeType: "application/octet-stream",
    })
  ).rejects.toThrow("Only PDF");
  await expect(
    owner.mutation(api.projectFiles.saveExternalVersion, {
      ...validFile,
      size: 20 * 1024 * 1024 + 1,
    })
  ).rejects.toThrow("20 MB or smaller");

  const fileId = await owner.mutation(
    api.projectFiles.saveExternalVersion,
    validFile
  );
  const listed = await owner.query(api.projectFiles.listForProject, {
    projectId: "project-files-rebuild",
  });
  expect(listed.retainedBytes).toBe(0);
  expect(listed.files).toMatchObject([{ _id: fileId, archived: false }]);

  await expect(
    owner.mutation(api.projectFiles.removeFile, { fileId })
  ).rejects.toThrow("Archive this file before deleting it permanently");
  await owner.mutation(api.projectFiles.archiveFile, { fileId });
  expect(
    (
      await owner.query(api.projectFiles.listForProject, {
        projectId: "project-files-rebuild",
      })
    ).files
  ).toEqual([]);

  await owner.mutation(api.projectFiles.removeFile, { fileId });
  expect(
    (await t.run((ctx) => ctx.db.query("projectFileVersions").collect())).length
  ).toBe(0);
});

test("lists files for a personal project without a Workspace", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "personal-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Personal Project",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [{ id: "planned", label: "Planned", purpose: "planned" }],
      workType: "Freelance",
      startDate: "2026-09-15",
      dueDate: "2026-09-20",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    })
  );

  await expect(
    t
      .withIdentity({ tokenIdentifier: "owner" })
      .query(api.projectFiles.listForProject, { projectId: "personal-project" })
  ).resolves.toMatchObject({
    retainedBytes: 0,
    workspaceLimitBytes: 0,
    files: [],
    uploadHistory: [],
  });

  await expect(
    t
      .withIdentity({ tokenIdentifier: "owner" })
      .mutation(api.projectFiles.generateUploadUrl, {
        projectId: "personal-project",
        size: 1,
      })
  ).rejects.toThrow("Select one Workspace before using hosted storage");
});

test("lists files for a personal project when the owner belongs to multiple Workspaces", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const createdAt = "2026-09-16T00:00:00.000Z";
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "personal-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Personal Project",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [{ id: "planned", label: "Planned", purpose: "planned" }],
      workType: "Freelance",
      startDate: "2026-09-16",
      dueDate: "2026-09-20",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt,
      updatedAt: createdAt,
    });
    const fileId = await ctx.db.insert("projectFiles", {
      projectId: "personal-project",
      ownerUserId: "owner",
      category: "Asset",
      title: "Hidden source",
      description: "",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      createdByUserId: "owner",
      createdByName: "Owner",
      createdAt,
      updatedAt: createdAt,
    });
    await ctx.db.insert("projectFileVersions", {
      projectId: "personal-project",
      projectFileId: fileId,
      versionNumber: 1,
      status: "draft",
      provider: "external",
      externalUrl: "https://example.com/hidden-source.txt",
      fileName: "hidden-source.txt",
      mimeType: "text/plain",
      size: 4,
      uploadedByUserId: "owner",
      uploadedByName: "Owner",
      uploadedAt: createdAt,
      notes: "",
    });
    for (const [name, inviteCode] of [
      ["First Workspace", "FIRST1"],
      ["Second Workspace", "SECOND2"],
    ] as const) {
      const teamId = await ctx.db.insert("teamWorkspaces", {
        ownerUserId: "owner",
        name,
        inviteCode,
        createdAt,
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userId: "owner",
        email: "owner@example.com",
        name: "Owner",
        role: "Owner",
        status: "active",
        permissions: {
          viewProjects: true,
          createProjects: true,
          editProjects: true,
          updateStatus: true,
          commentProjects: true,
          manageTeam: true,
          useChat: true,
        },
        createdAt,
        joinedAt: createdAt,
      });
    }
  });

  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await expect(
    owner.query(api.projectFiles.listForProject, {
      projectId: "personal-project",
    })
  ).resolves.toMatchObject({
    retainedBytes: 0,
    workspaceLimitBytes: 0,
    files: [],
    uploadHistory: [],
  });
  await expect(
    owner.mutation(api.projectFiles.generateUploadUrl, {
      projectId: "personal-project",
      size: 1,
    })
  ).rejects.toThrow("Select one Workspace before using hosted storage");
});

test("rejects removing hosted files from a personal project without a Workspace", async () => {
  const t = convexTest(schema, modules);
  const fileId = await t.run(async (ctx) => {
    const createdAt = "2026-09-15T00:00:00.000Z";
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "personal-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Personal Project",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [{ id: "planned", label: "Planned", purpose: "planned" }],
      workType: "Freelance",
      startDate: "2026-09-15",
      dueDate: "2026-09-20",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt,
      updatedAt: createdAt,
    });
    const id = await ctx.db.insert("projectFiles", {
      projectId: "personal-project",
      ownerUserId: "owner",
      category: "Asset",
      title: "Source",
      description: "",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      archived: true,
      createdByUserId: "owner",
      createdByName: "Owner",
      createdAt,
      updatedAt: createdAt,
    });
    await ctx.db.insert("projectFileVersions", {
      projectId: "personal-project",
      projectFileId: id,
      versionNumber: 1,
      status: "draft",
      provider: "r2",
      r2Key: "personal-project/source.txt",
      fileName: "source.txt",
      mimeType: "text/plain",
      size: 4,
      uploadedByUserId: "owner",
      uploadedByName: "Owner",
      uploadedAt: createdAt,
      notes: "",
    });
    return id;
  });

  await expect(
    t
      .withIdentity({ tokenIdentifier: "owner" })
      .mutation(api.projectFiles.removeFile, { fileId })
  ).rejects.toThrow("Select one Workspace before using hosted storage");
});

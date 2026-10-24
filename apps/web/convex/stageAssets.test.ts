/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllEnvs());

const ownerPermissions = {
  viewProjects: true,
  createProjects: true,
  editProjects: true,
  updateStatus: true,
  commentProjects: true,
  manageTeam: true,
  useChat: true,
};

async function setupProject(plan: "free" | "creator" = "creator") {
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  const t = convexTest(schema, modules);
  const createdAt = new Date().toISOString();
  const workspaceId = await t.run((ctx) =>
    ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Stage Assets",
      inviteCode: "STAGE1",
      createdAt,
    })
  );
  await t.run(async (ctx) => {
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner User",
      role: "Owner",
      status: "active",
      permissions: ownerPermissions,
      createdAt,
      joinedAt: createdAt,
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan,
      billingPeriod: plan === "free" ? null : "monthly",
      subscriptionStatus: plan === "free" ? "free" : "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: createdAt,
    });
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-assets",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Stage Assets Project",
      clientId: "client",
      archived: false,
      status: "In Progress",
      workflowStageId: "editing",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "editing", label: "Editing", purpose: "editing" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-06-01",
      dueDate: "2026-06-10",
      earnings: 500,
      paid: false,
      notes: "",
      createdAt,
      updatedAt: createdAt,
    });
  });
  return {
    t,
    owner: t.withIdentity({
      tokenIdentifier: "owner",
      subject: "owner",
      name: "Owner User",
      email: "owner@example.com",
    }),
  };
}

async function uploadBrief(
  t: ReturnType<typeof convexTest>,
  upload: { url: string; reservationId: Id<"workspaceStorageReservations"> }
) {
  const url = new URL(upload.url);
  const response = await t.fetch(url.pathname + url.search, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "brief",
  });
  expect(response.status).toBe(200);
  const reservation = await t.run((ctx) => ctx.db.get(upload.reservationId));
  if (!reservation?.storageId) throw new Error("Upload was not bound");
  expect(await response.json()).toEqual({ storageId: reservation.storageId });
  return reservation.storageId;
}

const assetArgs = {
  projectId: "project-assets",
  kind: "brief",
  title: "Brief",
  fileName: "brief.txt",
  mimeType: "text/plain",
} as const;

describe("stage assets", () => {
  test("uploaded assets default to internal visibility", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const storageId = await uploadBrief(t, upload);
    const assetId = await owner.mutation(api.stageAssets.addUploadedAsset, {
      projectId: "project-assets",
      workflowStageId: "planned",
      kind: "brief",
      title: "Private uploaded brief",
      storageId,
      reservationId: upload.reservationId,
      fileName: "brief.txt",
      mimeType: "text/plain",
    });
    expect(await t.run((ctx) => ctx.db.get(assetId))).toMatchObject({
      clientVisible: false,
      provider: "convex",
    });
  });

  test("rejects foreign storage IDs and binds the upload URL to one object", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const foreignId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["other"], { type: "text/plain" }))
    );
    await expect(
      owner.mutation(api.stageAssets.addUploadedAsset, {
        ...assetArgs,
        reservationId: upload.reservationId,
        storageId: foreignId,
      })
    ).rejects.toThrow("does not belong to this reservation");
    const storageId = await uploadBrief(t, upload);
    const url = new URL(upload.url);
    expect(
      (
        await t.fetch(url.pathname + url.search, {
          method: "POST",
          body: "brief",
        })
      ).status
    ).toBe(403);
    await expect(
      owner.mutation(api.stageAssets.addUploadedAsset, {
        ...assetArgs,
        reservationId: upload.reservationId,
        storageId: foreignId,
      })
    ).rejects.toThrow("does not belong to this reservation");
    await owner.mutation(api.stageAssets.addUploadedAsset, {
      ...assetArgs,
      reservationId: upload.reservationId,
      storageId,
    });
    await expect(
      owner.mutation(api.stageAssets.addUploadedAsset, {
        ...assetArgs,
        reservationId: upload.reservationId,
        storageId,
      })
    ).rejects.toThrow("already attached to a stage asset");
  });

  test.each([{ projectId: "other-project" }, { uploaderUserId: "other-user" }])(
    "rejects an upload owned by another project or user: %j",
    async (foreign) => {
      const { t, owner } = await setupProject();
      const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
        projectId: "project-assets",
        size: 5,
      });
      const storageId = await uploadBrief(t, upload);
      await t.run((ctx) => ctx.db.patch(upload.reservationId, foreign));
      await expect(
        owner.mutation(api.stageAssets.addUploadedAsset, {
          ...assetArgs,
          reservationId: upload.reservationId,
          storageId,
        })
      ).rejects.toThrow("does not belong to this reservation");
    }
  );

  test("rejects project-file bytes even when bound to the supplied reservation", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const storageId = await uploadBrief(t, upload);
    await owner.mutation(api.projectFiles.saveStorageVersion, {
      projectId: "project-assets",
      storageId,
      reservationId: upload.reservationId,
      category: "Reference",
      title: "File brief",
      description: "",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      fileName: "brief.txt",
      mimeType: "text/plain",
      notes: "",
    });
    await expect(
      owner.mutation(api.stageAssets.addUploadedAsset, {
        ...assetArgs,
        reservationId: upload.reservationId,
        storageId,
      })
    ).rejects.toThrow("already attached to a project version");
  });

  test("project files cannot reuse stage asset bytes", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const storageId = await uploadBrief(t, upload);
    await owner.mutation(api.stageAssets.addUploadedAsset, {
      ...assetArgs,
      reservationId: upload.reservationId,
      storageId,
    });
    await expect(
      owner.mutation(api.projectFiles.saveStorageVersion, {
        projectId: "project-assets",
        storageId,
        reservationId: upload.reservationId,
        category: "Reference",
        title: "File brief",
        description: "",
        status: "draft",
        clientVisible: false,
        downloadable: false,
        fileName: "brief.txt",
        mimeType: "text/plain",
        notes: "",
      })
    ).rejects.toThrow("already attached to a stage asset");
  });

  test("adds a link to a stage and lists it with the stage id", async () => {
    const { owner } = await setupProject();

    await owner.mutation(api.stageAssets.addLinkAsset, {
      projectId: "project-assets",
      workflowStageId: "editing",
      kind: "raw_footage",
      title: "Camera originals",
      clientVisible: false,
      externalUrl: "https://drive.example.com/footage",
    });

    const listed = await owner.query(api.stageAssets.listForProject, {
      projectId: "project-assets",
    });
    expect(listed.assets).toHaveLength(1);
    expect(listed.assets[0]).toMatchObject({
      workflowStageId: "editing",
      kind: "raw_footage",
      title: "Camera originals",
      provider: "external",
      url: "https://drive.example.com/footage",
      clientVisible: false,
      archived: false,
      createdByName: "Owner User",
    });
    expect(
      await owner.query(api.stageAssets.countsForProjects, {
        projectIds: ["project-assets"],
      })
    ).toEqual({ "project-assets": 1 });
  });

  test("keeps assets on their stage when the stage is renamed", async () => {
    const { t, owner } = await setupProject();
    await owner.mutation(api.stageAssets.addLinkAsset, {
      projectId: "project-assets",
      workflowStageId: "editing",
      kind: "brief",
      title: "Edit brief",
      clientVisible: false,
      externalUrl: "https://docs.example.com/brief",
    });

    await t.run(async (ctx) => {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_projectId", (q) => q.eq("id", "project-assets"))
        .unique();
      if (!project) throw new Error("Project missing");
      await ctx.db.patch(project._id, {
        workflowStages: project.workflowStages.map((stage) =>
          stage.id === "editing"
            ? { ...stage, label: "Editing and Sound" }
            : stage
        ),
      });
    });

    const listed = await owner.query(api.stageAssets.listForProject, {
      projectId: "project-assets",
    });
    expect(listed.assets[0]?.workflowStageId).toBe("editing");
  });

  test("rejects an unrelated user and an unknown stage", async () => {
    const { t, owner } = await setupProject();
    const intruder = t.withIdentity({
      tokenIdentifier: "intruder",
      subject: "intruder",
      name: "Intruder",
    });

    await expect(
      intruder.mutation(api.stageAssets.addLinkAsset, {
        projectId: "project-assets",
        workflowStageId: "editing",
        kind: "brief",
        title: "Not allowed",
        clientVisible: false,
        externalUrl: "https://docs.example.com/secret",
      })
    ).rejects.toThrow("Project access required");
    await expect(
      intruder.query(api.stageAssets.listForProject, {
        projectId: "project-assets",
      })
    ).rejects.toThrow("Project access required");

    await expect(
      owner.mutation(api.stageAssets.addLinkAsset, {
        projectId: "project-assets",
        workflowStageId: "deleted-stage",
        kind: "brief",
        title: "Unknown stage",
        clientVisible: false,
        externalUrl: "https://docs.example.com/brief",
      })
    ).rejects.toThrow("Workflow stage not found");
  });

  test("blocks hosted uploads on Free while links still work", async () => {
    const { owner } = await setupProject("free");

    await expect(
      owner.mutation(api.stageAssets.generateUploadUrl, {
        projectId: "project-assets",
        size: 8,
      })
    ).rejects.toThrow("Creator or Team");

    await expect(
      owner.mutation(api.stageAssets.addLinkAsset, {
        projectId: "project-assets",
        workflowStageId: "planned",
        kind: "brief",
        title: "Free brief link",
        clientVisible: true,
        externalUrl: "https://docs.example.com/free-brief",
      })
    ).resolves.toBeTruthy();
  });

  test("blocks a hosted upload at the Workspace storage limit", async () => {
    const { t, owner } = await setupProject();
    await t.run(async (ctx) => {
      const subscription = await ctx.db
        .query("workspaceSubscriptions")
        .withIndex("by_workspaceId")
        .unique();
      if (!subscription) throw new Error("Subscription missing");
      await ctx.db.patch(subscription._id, {
        retainedStorageBytes: 5_000_000_000,
      });
    });

    await expect(
      owner.mutation(api.stageAssets.generateUploadUrl, {
        projectId: "project-assets",
        size: 8,
      })
    ).rejects.toThrow(
      "Workspace storage limit reached. Permanently delete archived files before uploading more."
    );
  });

  test("archives an asset instead of deleting it", async () => {
    const { t, owner } = await setupProject();
    const assetId = await owner.mutation(api.stageAssets.addLinkAsset, {
      projectId: "project-assets",
      workflowStageId: "delivered",
      kind: "brand",
      title: "Brand kit",
      clientVisible: true,
      externalUrl: "https://brand.example.com/kit",
    });

    await owner.mutation(api.stageAssets.removeAsset, { assetId });

    const current = await owner.query(api.stageAssets.listForProject, {
      projectId: "project-assets",
    });
    expect(current.assets).toEqual([]);
    const withArchived = await owner.query(api.stageAssets.listForProject, {
      projectId: "project-assets",
      includeArchived: true,
    });
    expect(withArchived.assets).toMatchObject([
      {
        _id: assetId,
        title: "Brand kit",
        archived: true,
        clientVisible: false,
      },
    ]);
    const stored = await t.run((ctx) => ctx.db.get(assetId));
    expect(stored?.archived).toBe(true);
  });

  test("permanent deletion frees native storage, preserves Activity and is idempotent", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const storageId = await uploadBrief(t, upload);
    const assetId = await owner.mutation(api.stageAssets.addUploadedAsset, {
      ...assetArgs,
      reservationId: upload.reservationId,
      storageId,
    });
    await expect(
      owner.mutation(api.stageAssets.permanentlyDeleteAsset, { assetId })
    ).rejects.toThrow("Archive this asset");
    const intruder = t.withIdentity({
      tokenIdentifier: "intruder",
      subject: "intruder",
    });
    await expect(
      intruder.mutation(api.stageAssets.permanentlyDeleteAsset, { assetId })
    ).rejects.toThrow("Project access required");
    await owner.mutation(api.stageAssets.removeAsset, { assetId });
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(storageId)) !== null)
    ).toBe(true);
    expect(
      await t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).toMatchObject({ retainedStorageBytes: 5 });
    await owner.mutation(api.stageAssets.permanentlyDeleteAsset, { assetId });
    await owner.mutation(api.stageAssets.permanentlyDeleteAsset, { assetId });
    expect(await t.run((ctx) => ctx.storage.get(storageId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(assetId))).toBeNull();
    expect(
      await t.run((ctx) => ctx.db.query("workspaceSubscriptions").unique())
    ).toMatchObject({ retainedStorageBytes: 0 });
    const history = await owner.query(api.projectActivity.listForProject, {
      projectId: "project-assets",
    });
    expect(
      history.filter((event) => event.message.includes("permanently deleted"))
    ).toHaveLength(1);
    expect(history.some((event) => event.kind === "project_file_added")).toBe(
      true
    );
  });

  test("permanent deletion credits the original upload Workspace after membership changes", async () => {
    const { t, owner } = await setupProject();
    const upload = await owner.mutation(api.stageAssets.generateUploadUrl, {
      projectId: "project-assets",
      size: 5,
    });
    const storageId = await uploadBrief(t, upload);
    const assetId = await owner.mutation(api.stageAssets.addUploadedAsset, {
      ...assetArgs,
      reservationId: upload.reservationId,
      storageId,
    });
    const original = await t.run((ctx) =>
      ctx.db.query("workspaceSubscriptions").unique()
    );
    if (!original) throw new Error("Subscription missing");
    const otherWorkspace = await t.run(async (ctx) => {
      const other = await ctx.db.insert("teamWorkspaces", {
        ownerUserId: "owner",
        name: "New Workspace",
        inviteCode: "NEW",
        createdAt: new Date().toISOString(),
      });
      const { _id, _creationTime, ...subscription } = original;
      await ctx.db.insert("workspaceSubscriptions", {
        ...subscription,
        workspaceId: other,
        retainedStorageBytes: 100,
      });
      const membership = await ctx.db.query("teamMembers").unique();
      if (!membership) throw new Error("Membership missing");
      await ctx.db.patch(membership._id, { teamId: other });
      // Legacy rows can use the committed reservation's recorded charge.
      await ctx.db.patch(assetId, { storageWorkspaceId: undefined });
      return other;
    });
    await owner.mutation(api.stageAssets.removeAsset, { assetId });
    await owner.mutation(api.stageAssets.permanentlyDeleteAsset, { assetId });
    expect(await t.run((ctx) => ctx.db.get(original._id))).toMatchObject({
      retainedStorageBytes: 0,
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("workspaceSubscriptions")
          .withIndex("by_workspaceId", (q) =>
            q.eq("workspaceId", otherWorkspace)
          )
          .unique()
      )
    ).toMatchObject({ retainedStorageBytes: 100 });
  });
});

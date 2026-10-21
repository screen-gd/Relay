/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedProject(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-portal",
      profileId: "video-editor",
      title: "Private Project",
      clientId: "client-1",
      assigneeUserIds: [],
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "review", label: "Client Review", purpose: "client_review" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workflowStageId: "review",
      status: "Review",
      workType: "Client",
      startDate: "2026-08-01",
      dueDate: "2026-08-30",
      earnings: 400,
      paid: false,
      notes: "Internal notes must stay private.",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const output = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "project-portal",
      id: "main-output",
      title: "Main Film",
      description: "Internal output description",
      category: "Deliverable",
      reviewState: "approved",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const hidden = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "project-portal",
      id: "hidden-output",
      title: "Internal Cut",
      description: "Do not publish",
      category: "Reference",
      reviewState: "draft",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const version = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: output,
      id: "main-v1",
      versionNumber: 1,
      source: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      },
      title: "Client cut",
      notes: "Internal mix note",
      createdByUserId: "owner",
      createdAt: "2026-08-02T00:00:00.000Z",
    });
    await ctx.db.patch(output, { currentMediaVersionId: version });
    await ctx.db.patch(hidden, { archived: true });
    return {
      projectId,
      outputId: output,
      versionId: version,
      hiddenOutputId: hidden,
    };
  });
}

async function stageAssetPortalFixture() {
  const t = convexTest(schema, modules);
  const ids = await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const portal = await owner.mutation(api.projectPortals.publish, {
    projectId: "project-portal",
    config: {
      publicNotes: "",
      showStartDate: false,
      showDueDate: false,
      selectedOutputIds: [],
      expiresAt: null,
    },
  });
  const addLink = (
    title: string,
    workflowStageId: string,
    clientVisible?: boolean,
    kind: Doc<"projectStageAssets">["kind"] = "raw_footage"
  ) =>
    owner.mutation(api.stageAssets.addLinkAsset, {
      projectId: "project-portal",
      workflowStageId,
      kind,
      title,
      clientVisible,
      externalUrl: `https://assets.example.com/${encodeURIComponent(title)}`,
    });
  return { t, owner, ids, portal, addLink };
}

test("projects only explicitly visible active stage assets in workflow order", async () => {
  const { t, owner, ids, portal, addLink } = await stageAssetPortalFixture();
  const reviewId = await addLink("Shared originals", "review", true);
  const briefId = await addLink("Client brief", "planned", true, "brief");
  await addLink("Private footage", "review", false);
  const defaultId = await addLink("Private by default", "planned");
  const archivedId = await addLink("Archived client asset", "planned", true);
  await t.run(async (ctx) => {
    await ctx.db.patch(archivedId, { archived: true });
    const visible = await ctx.db.get(reviewId);
    if (!visible) throw new Error("Asset fixture missing");
    const { _id, _creationTime, ...fields } = visible;
    await ctx.db.insert("projectStageAssets", {
      ...fields,
      projectId: "other-project",
      title: "Other project secret",
    });
    await ctx.db.insert("projectStageAssets", {
      ...fields,
      ownerUserId: "other-owner",
      title: "Other owner secret",
    });
    await ctx.db.insert("projectStageAssets", {
      ...fields,
      provider: "r2",
      r2Key: "private/r2-key",
      title: "R2 unsupported",
    });
  });
  expect(await t.run((ctx) => ctx.db.get(defaultId))).toMatchObject({
    clientVisible: false,
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  const result = await t.query(api.projectPortals.getByToken, {
    token: portal.token,
  });
  if (result.access !== "active") throw new Error("Expected active portal");
  expect(result.stageAssets).toEqual([
    {
      stageLabel: "Planned",
      assets: [
        {
          id: briefId,
          kind: "brief",
          title: "Client brief",
          stageLabel: "Planned",
          url: "https://assets.example.com/Client%20brief",
        },
      ],
    },
    {
      stageLabel: "Client Review",
      assets: [
        {
          id: reviewId,
          kind: "raw_footage",
          title: "Shared originals",
          stageLabel: "Client Review",
          url: "https://assets.example.com/Shared%20originals",
        },
      ],
    },
  ]);
  const json = JSON.stringify(result);
  for (const secret of [
    "Private footage",
    "Private by default",
    "Archived client asset",
    "Other project secret",
    "Other owner secret",
    "R2 unsupported",
    "ownerUserId",
    "teamId",
    "createdByUserId",
    "storageId",
    "r2Key",
    "fileName",
    "workflowStageId",
    "workflowStages",
  ]) {
    expect(json).not.toContain(secret);
  }
  await t.run(async (ctx) => {
    const project = await ctx.db.get(ids.projectId);
    if (!project) throw new Error("Project fixture missing");
    await ctx.db.patch(project._id, {
      workflowStages: [...project.workflowStages]
        .reverse()
        .map((stage) =>
          stage.id === "review" ? { ...stage, label: "Final review" } : stage
        ),
    });
  });
  const renamed = await t.query(api.projectPortals.getByToken, {
    token: portal.token,
  });
  if (renamed.access !== "active") throw new Error("Expected active portal");
  expect(renamed.stageAssets.map((group) => group.stageLabel)).toEqual([
    "Final review",
    "Planned",
  ]);
  expect(renamed.stageAssets[0]?.assets[0]).toMatchObject({
    id: reviewId,
    stageLabel: "Final review",
  });
});

test("stage assets stay behind portal status, expiry, token and PIN checks", async () => {
  const { t, owner, portal, addLink } = await stageAssetPortalFixture();
  await addLink("Gated asset", "planned", true);
  const request = { token: portal.token };
  expect(await t.query(api.projectPortals.getByToken, request)).toEqual({
    access: "unpublished",
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  await owner.mutation(api.projectPortals.setPin, {
    portalId: portal.portalId,
    pin: "1234",
  });
  expect(await t.query(api.projectPortals.getByToken, request)).toEqual({
    access: "pin_required",
  });
  expect(
    await t.query(api.projectPortals.getByToken, { ...request, pin: "wrong" })
  ).toEqual({ access: "invalid_pin" });
  expect(
    await t.query(api.projectPortals.getByToken, { token: "crafted-token" })
  ).toEqual({ access: "invalid_token" });
  const unlocked = await t.query(api.projectPortals.getByToken, {
    ...request,
    pin: "1234",
  });
  expect(unlocked).toMatchObject({
    access: "active",
    stageAssets: [{ assets: [{ title: "Gated asset" }] }],
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "closed",
  });
  expect(
    await t.query(api.projectPortals.getByToken, { ...request, pin: "1234" })
  ).toEqual({ access: "closed" });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  await owner.mutation(api.projectPortals.updateSettings, {
    portalId: portal.portalId,
    changes: { expiresAt: "2020-01-01T00:00:00.000Z" },
  });
  expect(
    await t.query(api.projectPortals.getByToken, { ...request, pin: "1234" })
  ).toEqual({ access: "expired" });
});

test("serves visible Convex stage uploads without storage metadata", async () => {
  const { t, owner, portal, addLink } = await stageAssetPortalFixture();
  const assetId = await addLink("Hosted brief", "planned", true);
  const url = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(["Client brief"]));
    await ctx.db.patch(assetId, {
      provider: "convex",
      storageId,
      externalUrl: undefined,
      fileName: "internal-upload-name.txt",
    });
    return ctx.storage.getUrl(storageId);
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  const result = await t.query(api.projectPortals.getByToken, {
    token: portal.token,
  });
  if (result.access !== "active") throw new Error("Expected active portal");
  expect(result.stageAssets).toEqual([
    {
      stageLabel: "Planned",
      assets: [
        {
          id: assetId,
          kind: "raw_footage",
          title: "Hosted brief",
          stageLabel: "Planned",
          url,
        },
      ],
    },
  ]);
  expect(JSON.stringify(result)).not.toContain("internal-upload-name.txt");
  expect(JSON.stringify(result)).not.toContain("storageId");
});

test("publishes a PIN-gated portal with an allowlisted current-version projection", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(api.projectPortals.publish, {
    projectId: "project-portal",
    config: {
      publicNotes: "Client-facing note",
      showStartDate: false,
      showDueDate: true,
      selectedOutputIds: ["main-output"],
      expiresAt: null,
    },
  });
  expect(created.token).toHaveLength(64);
  await owner.mutation(api.projectPortals.setPin, {
    portalId: created.portalId,
    pin: "1234",
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: created.portalId,
    status: "open",
  });

  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toEqual({ access: "pin_required" });
  expect(
    await t.query(api.projectPortals.getByToken, {
      token: created.token,
      pin: "bad-pin",
    })
  ).toEqual({ access: "invalid_pin" });
  const publicView = await t.query(api.projectPortals.getByToken, {
    token: created.token,
    pin: "1234",
  });
  expect(publicView).toMatchObject({
    access: "active",
    project: {
      title: "Private Project",
      stage: "Review",
      progress: 75,
      publicNotes: "Client-facing note",
      startDate: null,
      dueDate: "2026-08-30",
    },
    outputs: [
      {
        id: "main-output",
        title: "Main Film",
        currentVersion: { id: "main-v1", title: "Client cut" },
      },
    ],
  });
  expect(publicView).not.toHaveProperty(
    "project.notes",
    "Internal notes must stay private."
  );
  expect(JSON.stringify(publicView)).not.toContain("Internal mix note");
  expect(JSON.stringify(publicView)).not.toContain("Internal Cut");
  expect(JSON.stringify(publicView)).not.toContain(created.token);
  expect(
    await owner.query(api.projectPortals.getForProject, {
      projectId: "project-portal",
    })
  ).toMatchObject({
    portal: { hasPin: true },
  });
  expect(
    await owner.query(api.projectPortals.getForProject, {
      projectId: "project-portal",
    })
  ).not.toHaveProperty("portal.token");
});

/** Starts a review with a custom approved-purpose stage and optional upload capacity. */
async function approvalFixture(withWorkspace = false) {
  const t = convexTest(schema, modules);
  const ids = await seedProject(t);
  await t.run(async (ctx) => {
    const project = await ctx.db.get(ids.projectId);
    if (!project) throw new Error("Project fixture missing");
    await ctx.db.patch(ids.projectId, {
      workflowStages: [
        ...project.workflowStages,
        {
          id: "client-signoff",
          label: "Client signed off",
          purpose: "approved",
        },
      ],
    });
    await ctx.db.patch(ids.outputId, { reviewState: "sent_to_client" });
    if (withWorkspace) {
      const createdAt = "2026-08-01T00:00:00.000Z";
      const workspaceId = await ctx.db.insert("teamWorkspaces", {
        ownerUserId: "owner",
        name: "Editor workspace",
        inviteCode: "APPROVAL",
        createdAt,
      });
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "owner",
        name: "Editor Taylor",
        email: "private@example.com",
        role: "Owner",
        status: "active",
        permissions: {
          viewProjects: true,
          editProjects: true,
          managePortal: true,
        },
        createdAt,
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
    }
  });
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const portal = await owner.mutation(api.projectPortals.publish, {
    projectId: "project-portal",
    config: {
      publicNotes: "Review this cut",
      showStartDate: false,
      showDueDate: false,
      selectedOutputIds: ["main-output"],
      expiresAt: null,
    },
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  const approval = {
    token: portal.token,
    outputId: "main-output",
    mediaVersionId: "main-v1",
    displayName: " Client Alex ",
  };
  return { t, owner, ids, portal, approval };
}

test("client approval locks the exact version, moves a custom stage, and records notification and audit history once", async () => {
  const { t, owner, ids, portal, approval } = await approvalFixture(true);
  await owner.mutation(api.projectPortals.setPin, {
    portalId: portal.portalId,
    pin: "1234",
  });
  await expect(
    t.mutation(api.projectPortals.approve, approval)
  ).rejects.toThrow("pin_required");
  await expect(
    t.mutation(api.projectPortals.approve, { ...approval, pin: "wrong" })
  ).rejects.toThrow("invalid_pin");
  const approved = await t.mutation(api.projectPortals.approve, {
    ...approval,
    pin: "1234",
  });
  expect(approved).toEqual({
    outputId: "main-output",
    mediaVersionId: "main-v1",
    approvedAt: expect.any(String),
    approvedByName: "Client Alex",
    isLocked: true,
  });
  await expect(
    t.mutation(api.projectPortals.approve, { ...approval, pin: "1234" })
  ).rejects.toThrow("already been approved");
  const rows = await t.run(async (ctx) => ({
    project: await ctx.db.get(ids.projectId),
    version: await ctx.db.get(ids.versionId),
    activity: await ctx.db
      .query("projectActivity")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", "project-portal")
      )
      .take(10),
    events: await ctx.db
      .query("portalEvents")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q.eq("portalId", portal.portalId)
      )
      .take(10),
  }));
  expect(rows.project).toMatchObject({
    workflowStageId: "client-signoff",
    status: "Review",
  });
  expect(rows.version).toMatchObject({
    locked: true,
    approvedAt: approved.approvedAt,
    approvedByName: "Client Alex",
  });
  expect(rows.activity).toMatchObject([
    {
      kind: "status_changed",
      actorName: "Client Alex",
      detail: "Media Version: main-v1",
    },
  ]);
  expect(rows.events).toMatchObject([
    {
      kind: "version_approved",
      displayName: "Client Alex",
      mediaVersionId: ids.versionId,
    },
  ]);
  const notifications = await owner.query(
    api.projectPortals.listApprovalNotifications,
    {}
  );
  expect(notifications).toMatchObject([
    {
      kind: "client_approval",
      userId: "owner",
      projectId: "project-portal",
      outputId: "main-output",
      mediaVersionId: "main-v1",
      read: false,
    },
  ]);
  expect(notifications).toHaveLength(1);
  const view = await t.query(api.projectPortals.getByToken, {
    token: portal.token,
    pin: "1234",
  });
  expect(view).toMatchObject({
    access: "active",
    editorDisplayName: "Editor Taylor",
    project: { title: "Private Project", stage: "Approved" },
    outputs: [
      {
        currentVersion: {
          id: "main-v1",
          isLocked: true,
          approved: true,
          approvedByName: "Client Alex",
          approvedAt: approved.approvedAt,
        },
      },
    ],
  });
  expect(JSON.stringify(view)).not.toContain("private@example.com");
});

test("locked versions reject comments, reopening, and file uploads including an omitted output association", async () => {
  const { t, owner, ids, approval } = await approvalFixture(true);
  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token: approval.token,
    outputId: "main-output",
    mediaVersionId: "main-v1",
    authorName: "Client Alex",
    body: "Trim intro",
    timestampSeconds: 5,
  });
  await owner.mutation(api.mediaVersionComments.setResolved, {
    commentId: comment.id,
    resolved: true,
  });
  const fileArgs = {
    projectId: "project-portal",
    projectOutputId: ids.outputId,
    category: "Deliverable" as const,
    title: "Notes",
    description: "",
    status: "sent_to_client" as const,
    clientVisible: true,
    downloadable: true,
    provider: "external" as const,
    externalUrl: "https://example.com/notes.txt",
    fileName: "notes.txt",
    mimeType: "text/plain",
    size: 5,
    notes: "",
  };
  const fileId = await owner.mutation(
    api.projectFiles.saveExternalVersion,
    fileArgs
  );
  const storageId = await t.run((ctx) =>
    ctx.storage.store(new Blob(["notes"], { type: "text/plain" }))
  );
  // Reserve before sign-off to prove finalization rechecks the lock.
  const reservation = await owner.mutation(api.projectFiles.generateUploadUrl, {
    projectId: "project-portal",
    size: 5,
  });
  await t.mutation(api.projectPortals.approve, approval);
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      token: approval.token,
      outputId: "main-output",
      mediaVersionId: "main-v1",
      authorName: "Client",
      body: "One more change",
    })
  ).rejects.toThrow("This version is approved and locked");
  await expect(
    t.mutation(api.mediaVersionComments.reopenPublicComment, {
      token: approval.token,
      commentId: comment.id,
    })
  ).rejects.toThrow("This version is approved and locked");
  await expect(
    owner.mutation(api.projectFiles.saveExternalVersion, fileArgs)
  ).rejects.toThrow("This version is approved and locked");
  const { projectOutputId: _outputId, ...withoutOutput } = fileArgs;
  await expect(
    owner.mutation(api.projectFiles.saveExternalVersion, {
      ...withoutOutput,
      projectFileId: fileId,
    })
  ).rejects.toThrow("This version is approved and locked");
  await expect(
    owner.mutation(api.projectFiles.saveStorageVersion, {
      projectId: "project-portal",
      projectOutputId: ids.outputId,
      storageId,
      reservationId: reservation.reservationId,
      category: "Deliverable",
      title: "Notes",
      description: "",
      status: "sent_to_client",
      clientVisible: true,
      downloadable: true,
      fileName: "notes.txt",
      mimeType: "text/plain",
      notes: "",
    })
  ).rejects.toThrow("This version is approved and locked");
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token: approval.token,
      })
    ).comments
  ).toMatchObject([{ id: comment.id, resolved: true }]);
});

test("approval notifies assigned Team editors while notifications remain private to each recipient", async () => {
  const { t, owner, ids, approval } = await approvalFixture(true);
  await t.run(async (ctx) => {
    const workspace = await ctx.db
      .query("teamWorkspaces")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", "owner"))
      .unique();
    if (!workspace) throw new Error("Workspace fixture missing");
    await ctx.db.patch(ids.projectId, {
      teamId: workspace._id,
      assigneeUserIds: ["editor", "inactive", "reviewer"],
    });
    await ctx.db.patch(ids.versionId, { createdByUserId: "editor" });
    for (const member of [
      { userId: "editor", role: "Editor", status: "active" },
      { userId: "inactive", role: "Editor", status: "invited" },
      { userId: "reviewer", role: "Reviewer", status: "active" },
    ] as const) {
      await ctx.db.insert("teamMembers", {
        ...member,
        teamId: workspace._id,
        email: `${member.userId}@example.com`,
        name: member.userId,
        permissions: {
          viewProjects: true,
          editProjects: member.role === "Editor",
        },
        createdAt: "2026-08-01",
      });
    }
  });
  await t.mutation(api.projectPortals.approve, approval);
  expect(
    await owner.query(api.projectPortals.listApprovalNotifications, {})
  ).toHaveLength(1);
  expect(
    await t
      .withIdentity({ tokenIdentifier: "editor" })
      .query(api.projectPortals.listApprovalNotifications, {})
  ).toMatchObject([
    {
      kind: "client_approval",
      userId: "editor",
      outputId: "main-output",
      mediaVersionId: "main-v1",
    },
  ]);
  for (const userId of ["inactive", "reviewer", "stranger"]) {
    expect(
      await t
        .withIdentity({ tokenIdentifier: userId })
        .query(api.projectPortals.listApprovalNotifications, {})
    ).toEqual([]);
  }
  await expect(
    t.query(api.projectPortals.listApprovalNotifications, {})
  ).rejects.toThrow("Not authenticated");
});

test.each([
  { role: "Reviewer", status: "active", viewProjects: true },
  { role: "Editor", status: "invited", viewProjects: true },
  { role: "Editor", status: "active", viewProjects: false },
] as const)(
  "team approval excludes an ineligible project owner: %j",
  async (access) => {
    const { t, owner, ids, approval } = await approvalFixture(true);
    await t.run(async (ctx) => {
      const member = await ctx.db.query("teamMembers").first();
      if (!member) throw new Error("Owner membership missing");
      await ctx.db.patch(ids.projectId, { teamId: member.teamId });
      await ctx.db.patch(member._id, {
        role: access.role,
        status: access.status,
        permissions: {
          ...member.permissions,
          viewProjects: access.viewProjects,
        },
      });
    });
    await t.mutation(api.projectPortals.approve, approval);
    expect(
      await owner.query(api.projectPortals.listApprovalNotifications, {})
    ).toEqual([]);
  }
);

test("repeated named views update one row and the name cap preserves existing visits", async () => {
  const { t, owner, portal } = await approvalFixture();
  vi.useFakeTimers();
  try {
    const start = Date.UTC(2026, 9, 21, 12);
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(start + i * 1000);
      await t.mutation(api.projectPortals.recordView, {
        token: portal.token,
        displayName: " Alex ",
      });
    }
    expect(
      await owner.query(api.projectPortals.listViews, {
        projectId: "project-portal",
      })
    ).toEqual([
      { displayName: "Alex", viewedAt: new Date(start + 9000).toISOString() },
    ]);
    const events = await t.run((ctx) =>
      ctx.db
        .query("portalEvents")
        .withIndex("by_portalId_and_kind_and_displayName", (q) =>
          q.eq("portalId", portal.portalId).eq("kind", "portal_viewed")
        )
        .take(201)
    );
    expect(events).toHaveLength(1);
    const event = events[0];
    if (!event) throw new Error("View missing");
    const { _id, _creationTime, ...fields } = event;
    await t.run(async (ctx) => {
      for (let i = 0; i < 199; i++) {
        await ctx.db.insert("portalEvents", {
          ...fields,
          displayName: `Client ${i}`,
        });
      }
    });
    vi.setSystemTime(start + 10_000);
    await t.mutation(api.projectPortals.recordView, {
      token: portal.token,
      displayName: "New name",
    });
    await t.mutation(api.projectPortals.recordView, {
      token: portal.token,
      displayName: "Alex",
    });
    const capped = await t.run((ctx) =>
      ctx.db
        .query("portalEvents")
        .withIndex("by_portalId_and_kind_and_displayName", (q) =>
          q.eq("portalId", portal.portalId).eq("kind", "portal_viewed")
        )
        .take(201)
    );
    expect(capped).toHaveLength(200);
    expect(capped.some((event) => event.displayName === "New name")).toBe(
      false
    );
    expect(
      capped.find((event) => event.displayName === "Alex")?.createdAt
    ).toBe(new Date(start + 10_000).toISOString());
  } finally {
    vi.useRealTimers();
  }
});

test("historical versions retain comments and approval while only the current shared cut can change", async () => {
  const { t, owner, approval } = await approvalFixture();
  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token: approval.token,
    outputId: "main-output",
    mediaVersionId: "main-v1",
    authorName: "Client Alex",
    body: "Original feedback",
    timestampSeconds: 9,
  });
  await t.mutation(api.projectPortals.approve, approval);
  await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
    outputId: "main-output",
    version: {
      id: "main-v2",
      url: "https://vimeo.com/123456789",
      title: "Second cut",
      notes: "Private second cut notes",
    },
  });
  await owner.mutation(api.projectOutputs.update, {
    outputId: "main-output",
    changes: { reviewState: "sent_to_client" },
  });
  await t.mutation(api.mediaVersionComments.addPublicComment, {
    token: approval.token,
    outputId: "main-output",
    mediaVersionId: "main-v2",
    authorName: "Client Alex",
    body: "Current feedback",
  });
  expect(
    await t.query(api.mediaVersionComments.listForPortal, {
      token: approval.token,
      outputId: "main-output",
      mediaVersionId: "main-v1",
    })
  ).toMatchObject({
    access: "active",
    comments: [
      { id: comment.id, body: "Original feedback", timestampSeconds: 9 },
    ],
  });
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token: approval.token,
      })
    ).comments
  ).toMatchObject([{ body: "Current feedback", mediaVersionId: "main-v2" }]);
  const view = await t.query(api.projectPortals.getByToken, {
    token: approval.token,
  });
  expect(view).toMatchObject({
    outputs: [
      {
        versions: [
          { id: "main-v2", isCurrent: true, isLocked: false, approved: false },
          {
            id: "main-v1",
            isCurrent: false,
            isLocked: true,
            approvedByName: "Client Alex",
          },
        ],
      },
    ],
  });
  expect(JSON.stringify(view)).not.toContain("Private second cut notes");
  await expect(
    t.mutation(api.projectPortals.approve, approval)
  ).rejects.toThrow("current shared Media Version");
  // Even an unlocked superseded cut stays read-only.
  await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
    outputId: "main-output",
    version: {
      id: "main-v3",
      url: "https://vimeo.com/123456789",
      title: "Third cut",
    },
  });
  const currentComments = await owner.query(
    api.mediaVersionComments.listForProject,
    { projectId: "project-portal" }
  );
  const oldComment = currentComments.find(
    (comment) => comment.mediaVersionId === "main-v2"
  );
  if (!oldComment) throw new Error("Expected superseded comment");
  await expect(
    t.mutation(api.mediaVersionComments.reopenPublicComment, {
      token: approval.token,
      commentId: oldComment.id,
    })
  ).rejects.toThrow("current shared Media Version");
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      token: approval.token,
      outputId: "main-output",
      mediaVersionId: "main-v2",
      authorName: "Client",
      body: "Late feedback",
    })
  ).rejects.toThrow("current shared Media Version");
});

test("approval requires a sent shared output and a configured approved-purpose stage", async () => {
  const { t, owner, ids, approval } = await approvalFixture();
  await owner.mutation(api.projectOutputs.update, {
    outputId: "main-output",
    changes: { reviewState: "draft" },
  });
  await expect(
    t.mutation(api.projectPortals.approve, approval)
  ).rejects.toThrow("sent to the client");
  await owner.mutation(api.projectOutputs.update, {
    outputId: "main-output",
    changes: { reviewState: "sent_to_client" },
  });
  await expect(
    t.mutation(api.projectPortals.approve, { ...approval, displayName: " " })
  ).rejects.toThrow("Display name is required");
  await t.run(async (ctx) => {
    const project = await ctx.db.get(ids.projectId);
    if (!project) throw new Error("Project fixture missing");
    await ctx.db.patch(ids.projectId, {
      workflowStages: project.workflowStages.filter(
        (stage) => stage.purpose !== "approved"
      ),
    });
  });
  await expect(
    t.mutation(api.projectPortals.approve, approval)
  ).rejects.toThrow("approved purpose");
  expect(await t.run((ctx) => ctx.db.get(ids.versionId))).not.toHaveProperty(
    "approvedAt"
  );
});

test("public history and approval reject hidden and other clients' outputs and comments", async () => {
  const { t, ids, approval } = await approvalFixture();
  const hiddenVersion = await t.run(async (ctx) => {
    await ctx.db.patch(ids.hiddenOutputId, { archived: false });
    const hiddenVersionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: ids.hiddenOutputId,
      id: "hidden-version",
      versionNumber: 1,
      source: { kind: "link", url: "https://example.com/secret" },
      title: "Secret cut",
      notes: "Secret notes",
      createdByUserId: "owner",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    await ctx.db.patch(ids.hiddenOutputId, {
      currentMediaVersionId: hiddenVersionId,
    });
    const otherOutput = await ctx.db.insert("projectOutputs", {
      ownerUserId: "other-owner",
      projectId: "other-project",
      id: "other-output",
      title: "Other client",
      description: "",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: "2026-08-01",
      updatedAt: "2026-08-01",
    });
    const otherVersion = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "other-owner",
      projectId: "other-project",
      outputId: otherOutput,
      id: "other-version",
      versionNumber: 1,
      source: { kind: "link", url: "https://example.com/other" },
      title: "Other client cut",
      notes: "",
      createdByUserId: "other-owner",
      createdAt: "2026-08-01",
    });
    await ctx.db.patch(otherOutput, { currentMediaVersionId: otherVersion });
    return { hiddenVersionId, otherOutput, otherVersion };
  });
  for (const target of [
    { outputId: "hidden-output", mediaVersionId: "hidden-version" },
    { outputId: "other-output", mediaVersionId: "other-version" },
    { outputId: "main-output", mediaVersionId: "other-version" },
  ]) {
    await expect(
      t.mutation(api.projectPortals.approve, { ...approval, ...target })
    ).rejects.toThrow("current shared Media Version");
    await expect(
      t.query(api.mediaVersionComments.listForPortal, {
        token: approval.token,
        ...target,
      })
    ).rejects.toThrow("Shared Media Version not found");
  }
  const hiddenComment = await t.run((ctx) =>
    ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: ids.hiddenOutputId,
      mediaVersionId: hiddenVersion.hiddenVersionId,
      authorName: "Private reviewer",
      body: "Private feedback",
      resolved: true,
      createdAt: "2026-08-01",
    })
  );
  await expect(
    t.mutation(api.mediaVersionComments.reopenPublicComment, {
      token: approval.token,
      commentId: hiddenComment,
    })
  ).rejects.toThrow("current shared Media Version");
  const view = JSON.stringify(
    await t.query(api.projectPortals.getByToken, { token: approval.token })
  );
  expect(view).not.toContain("Secret cut");
  expect(view).not.toContain("Other client");
  expect(
    JSON.stringify(
      await t.query(api.mediaVersionComments.listForPortal, {
        token: approval.token,
      })
    )
  ).not.toContain("Private feedback");
});

test("named views are editor-only and revoked tokens immediately lose reads and writes", async () => {
  const { t, owner, portal, approval } = await approvalFixture();
  await owner.mutation(api.projectPortals.setPin, {
    portalId: portal.portalId,
    pin: "1234",
  });
  const credentials = { token: portal.token, pin: "1234" };
  await expect(
    t.mutation(api.projectPortals.recordView, {
      token: portal.token,
      displayName: "Alex",
    })
  ).rejects.toThrow("pin_required");
  await t.mutation(api.projectPortals.recordView, {
    ...credentials,
    displayName: " Alex ",
  });
  const views = await owner.query(api.projectPortals.listViews, {
    projectId: "project-portal",
  });
  expect(views).toEqual([
    { displayName: "Alex", viewedAt: expect.any(String) },
  ]);
  await expect(
    t
      .withIdentity({ tokenIdentifier: "stranger" })
      .query(api.projectPortals.listViews, { projectId: "project-portal" })
  ).rejects.toThrow("Project access required");
  expect(
    JSON.stringify(await t.query(api.projectPortals.getByToken, credentials))
  ).not.toContain("viewedAt");
  for (const operation of ["close", "regenerate"] as const) {
    if (operation === "close") {
      await owner.mutation(api.projectPortals.setStatus, {
        portalId: portal.portalId,
        status: "closed",
      });
    } else {
      await owner.mutation(api.projectPortals.setStatus, {
        portalId: portal.portalId,
        status: "open",
      });
      await owner.mutation(api.projectPortals.regenerateToken, {
        portalId: portal.portalId,
      });
    }
    const access = operation === "close" ? "closed" : "invalid_token";
    expect(await t.query(api.projectPortals.getByToken, credentials)).toEqual({
      access,
    });
    expect(
      await t.query(api.mediaVersionComments.listForPortal, credentials)
    ).toEqual({ access, comments: [] });
    await expect(
      t.mutation(api.projectPortals.approve, { ...approval, pin: "1234" })
    ).rejects.toThrow(access);
    await expect(
      t.mutation(api.projectPortals.recordView, {
        ...credentials,
        displayName: "Alex",
      })
    ).rejects.toThrow(access);
  }
});

test("returns clear closed, expired, invalid-token states and invalidates regenerated tokens", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(api.projectPortals.publish, {
    projectId: "project-portal",
    config: {
      publicNotes: "",
      showStartDate: true,
      showDueDate: true,
      selectedOutputIds: [],
      expiresAt: null,
    },
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: created.portalId,
    status: "open",
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: created.portalId,
    status: "closed",
  });
  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toEqual({ access: "closed" });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: created.portalId,
    status: "open",
  });
  await owner.mutation(api.projectPortals.updateSettings, {
    portalId: created.portalId,
    changes: { expiresAt: "2020-01-01T00:00:00.000Z" },
  });
  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toEqual({ access: "expired" });
  const regenerated = await owner.mutation(api.projectPortals.regenerateToken, {
    portalId: created.portalId,
  });
  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toEqual({ access: "invalid_token" });
  expect(regenerated.token).not.toBe(created.token);
});

test("requires project edit access for portal management", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  await expect(
    t
      .withIdentity({ tokenIdentifier: "stranger" })
      .mutation(api.projectPortals.publish, {
        projectId: "project-portal",
        config: {
          publicNotes: "",
          showStartDate: false,
          showDueDate: false,
          selectedOutputIds: [],
          expiresAt: null,
        },
      })
  ).rejects.toThrow("Project access required");
});

test("reports the project revision allowance and the rounds a client used", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(api.projectPortals.publish, {
    projectId: "project-portal",
    config: {
      publicNotes: "",
      showStartDate: false,
      showDueDate: false,
      selectedOutputIds: ["main-output"],
      expiresAt: null,
    },
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: created.portalId,
    status: "open",
  });

  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toMatchObject({ access: "active", revisions: null });

  await owner.mutation(api.clientPortals.setProjectRevisionLimit, {
    projectId: "project-portal",
    maxRevisions: 3,
  });
  await t.run(async (ctx) => {
    const output = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId_and_archived", (q) =>
        q.eq("projectId", "project-portal").eq("archived", false)
      )
      .unique();
    if (!output) throw new Error("Expected the shared output");
    const version = await ctx.db
      .query("projectMediaVersions")
      .withIndex("by_outputId_and_versionNumber", (q) =>
        q.eq("outputId", output._id)
      )
      .first();
    if (!version) throw new Error("Expected the shared version");
    await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: output._id,
      mediaVersionId: version._id,
      authorName: "Client",
      body: "Trim the intro.",
      resolved: false,
      createdAt: "2026-08-03T00:00:00.000Z",
    });
    await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: output._id,
      id: "main-v2",
      versionNumber: 2,
      source: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      },
      title: "Second cut",
      notes: "",
      createdByUserId: "owner",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
  });

  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toMatchObject({ access: "active", revisions: { used: 1, limit: 3 } });

  await owner.mutation(api.clientPortals.setProjectRevisionLimit, {
    projectId: "project-portal",
    maxRevisions: null,
  });
  expect(
    await t.query(api.projectPortals.getByToken, { token: created.token })
  ).toMatchObject({ access: "active", revisions: null });
});

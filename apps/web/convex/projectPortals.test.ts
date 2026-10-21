/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
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

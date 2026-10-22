/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { v } from "convex/values";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import schema from "./schema";

const deleteR2 = vi.fn(async (_args: { key: string }) => null);
const modules = {
  ...import.meta.glob("./**/*.ts"),
  "./r2.ts": async () => ({
    deleteObject: internalAction({
      args: { key: v.string() },
      returns: v.null(),
      handler: async (_ctx, args) => deleteR2(args),
    }),
  }),
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  deleteR2.mockReset();
  deleteR2.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function fixture(r2 = false) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = new Date().toISOString();
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Studio",
      inviteCode: "DELETE",
      createdAt: now,
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner",
      role: "Owner",
      status: "active",
      permissions: {
        manageTeam: true,
        createProjects: true,
        editProjects: true,
        viewProjects: true,
      },
      createdAt: now,
    });
    const subscriptionId = await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan: "creator",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      retainedStorageBytes: 44,
      reservedStorageBytes: 30,
      updatedAt: now,
    });
    const project = {
      ownerUserId: "owner",
      id: "delete-this",
      teamId: workspaceId,
      profileId: "video-editor",
      title: "Private Project",
      clientId: "client",
      assigneeUserIds: [],
      workflowStages: [
        { id: "editing", label: "Editing", purpose: "editing" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workflowStageId: "editing",
      status: "In Progress",
      workType: "Client",
      startDate: "2026-10-01",
      dueDate: "2026-11-01",
      earnings: 100,
      paid: false,
      notes: "Private",
      archived: false,
      createdAt: now,
      updatedAt: now,
    } satisfies Parameters<typeof ctx.db.insert<"projects">>[1];
    const projectId = await ctx.db.insert("projects", project);
    const otherId = await ctx.db.insert("projects", {
      ...project,
      id: "keep-this",
    });
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: project.id,
      id: "output",
      title: "Cut",
      description: "",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    const versionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: project.id,
      outputId,
      id: "v1",
      versionNumber: 1,
      source: { kind: "link", url: "https://example.com/video" },
      title: "Cut",
      notes: "",
      createdByUserId: "owner",
      createdAt: now,
    });
    await ctx.db.patch(outputId, { currentMediaVersionId: versionId });
    const portalId = await ctx.db.insert("projectPortals", {
      ownerUserId: "owner",
      projectId: project.id,
      tokenHash: "hash",
      status: "open",
      publicNotes: "",
      showStartDate: false,
      showDueDate: false,
      selectedOutputIds: ["output"],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("portalEvents", {
      portalId,
      kind: "portal_viewed",
      displayName: "Client",
      title: "Viewed",
      body: "",
      createdAt: now,
    });
    const legacyPortalId = await ctx.db.insert("clientPortals", {
      ownerUserId: "owner",
      projectId: project.id,
      token: "legacy-token",
      title: "Legacy portal",
      clientName: "Client",
      projectType: "Video",
      status: "Review",
      sourceStatus: "In Progress",
      startDate: project.startDate,
      dueDate: project.dueDate,
      progress: 50,
      clientSummary: "Private summary",
      clientNotes: "Private notes",
      estimatedCompletion: "Soon",
      published: true,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("portalRevisions", {
      portalId: legacyPortalId,
      clientName: "Client",
      message: "Private request",
      status: "Submitted",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("portalEvents", {
      portalId: legacyPortalId,
      kind: "portal_viewed",
      title: "Viewed",
      body: "",
      createdAt: now,
    });
    const commentId = await ctx.db.insert("mediaVersionComments", {
      portalId,
      ownerUserId: "owner",
      projectId: project.id,
      outputId,
      mediaVersionId: versionId,
      authorName: "Client",
      body: "Private feedback",
      resolved: false,
      createdAt: now,
    });
    const transcriptId = await ctx.db.insert("transcripts", {
      mediaVersionId: versionId,
      uploadedBy: "owner",
      sourceName: "Private.srt",
    });
    for (let i = 0; i < 63; i++)
      await ctx.db.insert("transcriptSegments", {
        transcriptId,
        startSeconds: i,
        endSeconds: i + 1,
        text: "Private dialogue",
      });
    const runId = await ctx.db.insert("aiRuns", {
      workspaceId,
      requestedBy: "owner",
      projectId: project.id,
      feature: "revision_items",
      promptVersion: "1",
      modelTier: "default",
      requestHash: "private-hash",
      sourceIds: [],
      month: "2026-10",
      status: "queued",
    });
    await ctx.db.insert("revisionItems", {
      projectId: project.id,
      mediaVersionId: versionId,
      runId,
      sourceCommentIds: [commentId],
      timestamps: [],
      theme: "Edit",
      text: "Private draft",
      vague: false,
      clarifyingQuestion: null,
      possibleNewScope: false,
      status: "draft",
    });
    await ctx.db.insert("transcriptMatches", {
      transcriptId,
      commentId,
      segmentId: null,
      runId,
    });
    await ctx.db.insert("versionChangelogs", {
      projectId: project.id,
      mediaVersionId: versionId,
      runId,
      text: "Private changelog",
      sourceRevisionIds: [],
    });
    await ctx.db.insert("statusDrafts", {
      projectId: project.id,
      runId,
      requestedBy: "owner",
      channel: "email",
      text: "Private draft",
      sourceOutputIds: [],
      sourceCommentIds: [],
    });
    await ctx.db.insert("clientHubProjects", {
      workspaceId,
      projectId: project.id,
      clientId: "client",
      publishedAt: now,
    });
    await ctx.db.insert("resourceLinks", {
      userId: "owner",
      projectId: project.id,
      id: "resource",
      title: "Brief",
      url: "https://example.com",
      category: "brief",
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    for (let i = 0; i < 61; i++)
      await ctx.db.insert("projectActivity", {
        projectId: project.id,
        ownerUserId: "owner",
        actorUserId: "owner",
        actorName: "Owner",
        kind: "project_updated",
        message: "Private activity",
        createdAt: now,
      });
    const fileId = await ctx.db.insert("projectFiles", {
      projectId: project.id,
      ownerUserId: "owner",
      teamId: workspaceId,
      title: "Brief",
      description: "",
      category: "Asset",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      createdByUserId: "owner",
      createdByName: "Owner",
      createdAt: now,
      updatedAt: now,
    });
    const otherFileId = await ctx.db.insert("projectFiles", {
      projectId: "keep-this",
      ownerUserId: "owner",
      teamId: workspaceId,
      title: "Keep this file",
      description: "",
      category: "Asset",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      createdByUserId: "owner",
      createdByName: "Owner",
      createdAt: now,
      updatedAt: now,
    });
    const storageId = await ctx.storage.store(new Blob(["1234567890"]));
    const stageStorageId = await ctx.storage.store(
      new Blob(["12345678901234567890"])
    );
    const orphanStorageId = await ctx.storage.store(new Blob(["pending"]));
    const otherStorageId = await ctx.storage.store(
      new Blob(["Keep this file"])
    );
    const otherFileVersionId = await ctx.db.insert("projectFileVersions", {
      projectId: "keep-this",
      storageWorkspaceId: workspaceId,
      projectFileId: otherFileId,
      versionNumber: 1,
      provider: "convex",
      storageId: otherStorageId,
      fileName: "keep.txt",
      mimeType: "text/plain",
      size: 14,
      uploadedByUserId: "owner",
      uploadedByName: "Owner",
      uploadedAt: now,
      notes: "",
    });
    const fileVersionId = await ctx.db.insert("projectFileVersions", {
      projectId: project.id,
      storageWorkspaceId: workspaceId,
      projectFileId: fileId,
      versionNumber: 1,
      provider: r2 ? "r2" : "convex",
      storageId: r2 ? undefined : storageId,
      r2Key: r2 ? "private/object" : undefined,
      fileName: "brief.txt",
      mimeType: "text/plain",
      size: 10,
      uploadedByUserId: "owner",
      uploadedByName: "Owner",
      uploadedAt: now,
      notes: "",
    });
    await ctx.db.insert("projectStageAssets", {
      projectId: project.id,
      storageWorkspaceId: workspaceId,
      workflowStageId: "editing",
      ownerUserId: "owner",
      kind: "brief",
      title: "Stage brief",
      provider: "convex",
      storageId: stageStorageId,
      fileName: "stage.txt",
      mimeType: "text/plain",
      size: 20,
      clientVisible: false,
      archived: true,
      createdByUserId: "owner",
      createdByName: "Owner",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workspaceStorageReservations", {
      workspaceId,
      projectId: project.id,
      uploaderUserId: "owner",
      bytes: 30,
      storageId: orphanStorageId,
      stageUploadToken: "stale-upload",
      status: "pending",
      createdAt: now,
      expiresAt: Date.now() + 900_000,
    });
    await ctx.db.insert("workspaceStorageReservations", {
      workspaceId,
      projectId: project.id,
      uploaderUserId: "owner",
      bytes: 0,
      stageUploadToken: "stale-unbound-upload",
      status: "pending",
      createdAt: now,
      expiresAt: Date.now() + 900_000,
    });
    if (r2)
      await ctx.db.insert("r2UploadSessions", {
        projectId: project.id,
        projectFileId: fileId,
        key: "private/object",
        uploaderUserId: "owner",
        status: "completed",
        createdAt: now,
        expiresAt: Date.now() + 900_000,
      });
    const clientId = await ctx.db.insert("clients", {
      ownerUserId: "owner",
      id: "client",
      name: "Keep Client",
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    });
    const salaryBatchId = await ctx.db.insert("projectSalaryBatches", {
      ownerUserId: "owner",
      id: "batch",
      number: 1,
      workType: "Client",
      requiredProjectCount: 1,
      amount: 100,
      projectIds: [project.id],
      completedAt: now,
      paid: true,
    });
    return {
      projectId,
      otherId,
      outputId,
      versionId,
      portalId,
      legacyPortalId,
      transcriptId,
      fileId,
      fileVersionId,
      storageId,
      stageStorageId,
      orphanStorageId,
      otherStorageId,
      otherFileId,
      otherFileVersionId,
      subscriptionId,
      clientId,
      salaryBatchId,
      project,
    };
  });
  return { t, owner: t.withIdentity({ tokenIdentifier: "owner" }), ...ids };
}

test("only the authorized Project owner or manager can start deletion", async () => {
  const f = await fixture();
  await expect(
    f.t.mutation(api.projects.remove, { projectId: "delete-this" })
  ).rejects.toThrow("Not authenticated");
  await expect(
    f.t
      .withIdentity({ tokenIdentifier: "outsider" })
      .mutation(api.projects.remove, { projectId: "delete-this" })
  ).rejects.toThrow("Permission denied");
  expect(await f.t.run((ctx) => ctx.db.get(f.projectId))).not.toBeNull();
  expect(
    await f.t.run((ctx) => ctx.db.query("projectDeletions").collect())
  ).toEqual([]);
});

test("deletion revokes access immediately and removes related records, stored files and quota in batches", async () => {
  const f = await fixture();
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  expect(await f.t.run((ctx) => ctx.db.get(f.projectId))).toBeNull();
  expect((await f.t.run((ctx) => ctx.db.get(f.portalId)))?.status).toBe(
    "closed"
  );
  expect(await f.t.run((ctx) => ctx.db.get(f.legacyPortalId))).toMatchObject({
    published: false,
    enabled: false,
  });
  expect(
    await f.t.query(internal.stageAssets.uploadReservation, {
      token: "stale-upload",
    })
  ).toBeNull();
  await expect(
    f.t.mutation(internal.stageAssets.bindUpload, {
      token: "stale-unbound-upload",
      storageId: f.otherStorageId,
    })
  ).rejects.toThrow("Project not found");
  const p = f.project;
  await expect(
    f.owner.mutation(api.projects.create, {
      project: {
        id: p.id,
        teamId: p.teamId,
        assigneeUserIds: p.assigneeUserIds,
        profileId: p.profileId,
        title: p.title,
        clientId: p.clientId,
        workflowStages: p.workflowStages,
        workType: p.workType,
        startDate: p.startDate,
        dueDate: p.dueDate,
        earnings: p.earnings,
        notes: p.notes,
      },
    })
  ).rejects.toThrow("Deleted Project ids cannot be reused");
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  await f.t.run(async (ctx) => {
    for (const table of [
      "projectOutputs",
      "projectMediaVersions",
      "projectPortals",
      "clientPortals",
      "portalRevisions",
      "portalEvents",
      "mediaVersionComments",
      "transcripts",
      "transcriptSegments",
      "transcriptMatches",
      "revisionItems",
      "versionChangelogs",
      "aiRuns",
      "statusDrafts",
      "projectActivity",
      "projectFiles",
      "projectFileVersions",
      "projectStageAssets",
      "workspaceStorageReservations",
      "clientHubProjects",
      "resourceLinks",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      expect(
        rows.filter(
          (row) => !("projectId" in row) || row.projectId === "delete-this"
        ),
        table
      ).toEqual([]);
    }
    for (const storageId of [f.storageId, f.stageStorageId, f.orphanStorageId])
      expect(await ctx.storage.getUrl(storageId)).toBeNull();
    expect(await ctx.storage.getUrl(f.otherStorageId)).not.toBeNull();
    expect(await ctx.db.get(f.otherId)).not.toBeNull();
    expect(await ctx.db.get(f.otherFileId)).not.toBeNull();
    expect(await ctx.db.get(f.otherFileVersionId)).not.toBeNull();
    expect(await ctx.db.get(f.clientId)).not.toBeNull();
    expect(await ctx.db.get(f.salaryBatchId)).not.toBeNull();
    expect(await ctx.db.get(f.subscriptionId)).toMatchObject({
      retainedStorageBytes: 14,
      reservedStorageBytes: 0,
    });
    expect(await ctx.db.query("projectDeletions").first()).toMatchObject({
      projectId: "delete-this",
      completedAt: expect.any(Number),
    });
  });
});

test("interrupted cleanup resumes from its stored phase", async () => {
  const f = await fixture();
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.run(async (ctx) => {
    for (const job of await ctx.db.system
      .query("_scheduled_functions")
      .collect()) {
      if (job.state.kind === "pending") await ctx.scheduler.cancel(job._id);
    }
  });
  vi.setSystemTime(Date.now() + 5 * 60_000);
  await f.t.mutation(internal.projectDeletion.retryInterrupted, {});
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    await f.t.run((ctx) => ctx.db.query("projectDeletions").first())
  ).toMatchObject({ completedAt: expect.any(Number) });
  expect(await f.t.run((ctx) => ctx.db.get(f.fileId))).toBeNull();
});

test("native HTTP uploads remain bound and are removed if the Project is deleted before save", async () => {
  const f = await fixture();
  const upload = await f.owner.mutation(api.projectFiles.generateUploadUrl, {
    projectId: "delete-this",
    size: 7,
  });
  const url = new URL(upload.url);
  const response = await f.t.fetch(url.pathname + url.search, {
    method: "POST",
    body: new Blob(["pending"]),
  });
  expect(response.status).toBe(200);
  const reservation = await f.t.run((ctx) => ctx.db.get(upload.reservationId));
  const uploadedStorageId = reservation?.storageId;
  if (!uploadedStorageId)
    throw new Error("Upload bytes were not bound to their reservation");
  expect(
    await f.t.run((ctx) => ctx.storage.getUrl(uploadedStorageId))
  ).not.toBeNull();
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    await f.t.run((ctx) => ctx.storage.getUrl(uploadedStorageId))
  ).toBeNull();
  const lateResponse = await f.t.fetch(url.pathname + url.search, {
    method: "POST",
    body: new Blob(["pending"]),
  });
  expect(lateResponse.status).toBe(403);
});

test("released uncommitted stage bytes are deleted without releasing quota twice", async () => {
  const f = await fixture();
  await f.t.run(async (ctx) => {
    const reservation = await ctx.db
      .query("workspaceStorageReservations")
      .withIndex("by_storageId", (q) => q.eq("storageId", f.orphanStorageId))
      .first();
    if (!reservation) throw new Error("Reservation missing");
    await ctx.db.patch(reservation._id, { status: "released" });
    await ctx.db.patch(f.subscriptionId, { reservedStorageBytes: 17 });
  });
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    await f.t.run((ctx) => ctx.storage.getUrl(f.orphanStorageId))
  ).toBeNull();
  expect(await f.t.run((ctx) => ctx.db.get(f.subscriptionId))).toMatchObject({
    reservedStorageBytes: 17,
  });
});

test("personal Project deletion credits the upload Workspace after membership and ownership change", async () => {
  const f = await fixture();
  const otherSubscription = await f.t.run(async (ctx) => {
    await ctx.db.patch(f.projectId, { teamId: undefined });
    const membership = await ctx.db.query("teamMembers").first();
    if (!membership) throw new Error("Membership missing");
    await ctx.db.patch(membership._id, { status: "invited" });
    await ctx.db.patch(f.project.teamId, { ownerUserId: "new-owner" });
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "New Workspace",
      inviteCode: "NEW",
      createdAt: "2026-10-23",
    });
    const { _id: _memberId, _creationTime: _time, ...fields } = membership;
    await ctx.db.insert("teamMembers", { ...fields, teamId: workspaceId });
    const subscription = await ctx.db.get(f.subscriptionId);
    if (!subscription) throw new Error("Subscription missing");
    const { _id, _creationTime, ...sub } = subscription;
    return ctx.db.insert("workspaceSubscriptions", {
      ...sub,
      workspaceId,
      retainedStorageBytes: 200,
      reservedStorageBytes: 0,
    });
  });
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    (await f.t.run((ctx) => ctx.db.get(f.subscriptionId)))?.retainedStorageBytes
  ).toBe(14);
  expect(
    (await f.t.run((ctx) => ctx.db.get(otherSubscription)))
      ?.retainedStorageBytes
  ).toBe(200);
});

test("legacy files with unknown billing ownership do not credit an unrelated Workspace", async () => {
  const f = await fixture();
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.fileVersionId, { storageWorkspaceId: undefined });
    const asset = await ctx.db.query("projectStageAssets").first();
    if (!asset) throw new Error("Asset missing");
    await ctx.db.patch(asset._id, { storageWorkspaceId: undefined });
  });
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    await f.t.run((ctx) => ctx.db.query("projectDeletions").first())
  ).toMatchObject({
    unattributedStorageBytes: 30,
    completedAt: expect.any(Number),
  });
  expect(
    (await f.t.run((ctx) => ctx.db.get(f.subscriptionId)))?.retainedStorageBytes
  ).toBe(44);
  expect(await f.t.run((ctx) => ctx.storage.getUrl(f.storageId))).toBeNull();
});

test("confirmed brief results and stale resource snapshots cannot survive Project deletion", async () => {
  const f = await fixture();
  const runId = await f.t.run(async (ctx) => {
    const id = await ctx.db.insert("aiRuns", {
      workspaceId: f.project.teamId,
      requestedBy: "owner",
      feature: "brief_import",
      promptVersion: "1",
      modelTier: "default",
      requestHash: "brief",
      sourceIds: [],
      month: "2026-10",
      status: "succeeded",
      startedAt: 1,
      completedAt: 2,
      outputJson: "private brief",
      provider: "google",
      modelId: "test",
      inputTokens: 1,
      outputTokens: 1,
    });
    await ctx.db.insert("briefImports", {
      runId: id,
      projectId: "delete-this",
    });
    return id;
  });
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(await f.t.run((ctx) => ctx.db.get(runId))).toBeNull();
  await f.owner.mutation(api.resourceLinks.replaceAll, {
    resources: [
      {
        id: "stale",
        projectId: "delete-this",
        title: "Private resource",
        url: "https://example.com",
        category: "brief",
        notes: "private notes",
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
    ],
  });
  expect(await f.owner.query(api.resourceLinks.list, {})).toEqual([]);
});

test("R2 deletion retries failures and removes late signed uploads after their URL expires", async () => {
  const f = await fixture(true);
  deleteR2.mockRejectedValueOnce(new Error("R2 temporarily unavailable"));
  await f.owner.mutation(api.projects.remove, { projectId: "delete-this" });
  await f.t.finishInProgressScheduledFunctions();
  expect(await f.t.run((ctx) => ctx.db.get(f.fileVersionId))).not.toBeNull();
  expect(
    (await f.t.run((ctx) => ctx.db.get(f.subscriptionId)))?.retainedStorageBytes
  ).toBe(44);
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    deleteR2.mock.calls.filter(([args]) => args.key === "private/object").length
  ).toBeGreaterThanOrEqual(3);
  expect(await f.t.run((ctx) => ctx.db.get(f.fileVersionId))).toBeNull();
  expect(
    await f.t.run((ctx) => ctx.db.query("r2UploadSessions").collect())
  ).toEqual([]);
});

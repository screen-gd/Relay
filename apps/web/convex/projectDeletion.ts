import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";

const BATCH_SIZE = 25;
const RETRY_MS = 60_000;

// One indexed batch per transaction, including large comment and activity histories.
const projectRows = [
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("mediaVersionComments")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("projectFiles")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("projectActivity")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("projectComments")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("teamActivity")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("teamNotifications")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("clientHubProjects")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("resourceLinks")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("statusDrafts")
      .withIndex("by_projectId_and_requestedBy", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  async (ctx: MutationCtx, id: string) => {
    const imports = await ctx.db
      .query("briefImports")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE);
    for (const entry of imports) {
      const run = await ctx.db.get(entry.runId);
      if (run?.feature === "brief_import") await ctx.db.delete(run._id);
    }
    return imports;
  },
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("projectRevisionScopes")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("revisionRoundCorrections")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("changeOrderDrafts")
      .withIndex("by_projectId_and_requestedBy", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("aiRuns")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
  (ctx: MutationCtx, id: string) =>
    ctx.db
      .query("deadlineRiskFindings")
      .withIndex("by_projectId", (q) => q.eq("projectId", id))
      .take(BATCH_SIZE),
];

async function deleteRows(ctx: MutationCtx, rows: { _id: Id<TableNames> }[]) {
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length > 0;
}

export async function startProjectDeletion(
  ctx: MutationCtx,
  project: Doc<"projects">
) {
  const jobId = await ctx.db.insert("projectDeletions", {
    projectId: project.id,
    phase: 0,
    retryAfter: Date.now() + 5 * RETRY_MS,
  });
  // Revoke links in the same transaction as removing the Project from the workspace.
  const portal = await ctx.db
    .query("projectPortals")
    .withIndex("by_projectId", (q) => q.eq("projectId", project.id))
    .unique();
  if (portal) await ctx.db.patch(portal._id, { status: "closed" });
  const legacy = await ctx.db
    .query("clientPortals")
    .withIndex("by_projectId", (q) => q.eq("projectId", project.id))
    .unique();
  if (legacy)
    await ctx.db.patch(legacy._id, { enabled: false, published: false });
  await ctx.db.delete(project._id);
  await ctx.scheduler.runAfter(0, internal.projectDeletion.run, { jobId });
}

async function creditStorage(
  ctx: MutationCtx,
  workspaceId: Id<"teamWorkspaces"> | undefined,
  retained: number,
  reserved = 0
) {
  if (!workspaceId || (!retained && !reserved)) return;
  const subscription = await ctx.db
    .query("workspaceSubscriptions")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
    .unique();
  if (subscription)
    await ctx.db.patch(subscription._id, {
      retainedStorageBytes: Math.max(
        0,
        (subscription.retainedStorageBytes ?? 0) - retained
      ),
      reservedStorageBytes: Math.max(
        0,
        (subscription.reservedStorageBytes ?? 0) - reserved
      ),
      updatedAt: new Date().toISOString(),
    });
}

async function cleanMediaVersion(ctx: MutationCtx, projectId: string) {
  const version = await ctx.db
    .query("projectMediaVersions")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .first();
  if (!version) return false;
  const transcript = await ctx.db
    .query("transcripts")
    .withIndex("by_mediaVersionId", (q) => q.eq("mediaVersionId", version._id))
    .first();
  if (transcript) {
    if (
      await deleteRows(
        ctx,
        await ctx.db
          .query("transcriptSegments")
          .withIndex("by_transcriptId", (q) =>
            q.eq("transcriptId", transcript._id)
          )
          .take(BATCH_SIZE)
      )
    )
      return true;
    if (
      await deleteRows(
        ctx,
        await ctx.db
          .query("transcriptMatches")
          .withIndex("by_transcriptId", (q) =>
            q.eq("transcriptId", transcript._id)
          )
          .take(BATCH_SIZE)
      )
    )
      return true;
    await ctx.db.delete(transcript._id);
    return true;
  }
  if (
    await deleteRows(
      ctx,
      await ctx.db
        .query("revisionItems")
        .withIndex("by_mediaVersionId", (q) =>
          q.eq("mediaVersionId", version._id)
        )
        .take(BATCH_SIZE)
    )
  )
    return true;
  if (
    await deleteRows(
      ctx,
      await ctx.db
        .query("versionChangelogs")
        .withIndex("by_mediaVersionId", (q) =>
          q.eq("mediaVersionId", version._id)
        )
        .take(BATCH_SIZE)
    )
  )
    return true;
  await ctx.db.delete(version._id);
  return true;
}

async function cleanPortal(
  ctx: MutationCtx,
  projectId: string,
  legacy: boolean
) {
  const portal = legacy
    ? await ctx.db
        .query("clientPortals")
        .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
        .first()
    : await ctx.db
        .query("projectPortals")
        .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
        .first();
  if (!portal) return false;
  if (
    await deleteRows(
      ctx,
      await ctx.db
        .query("portalEvents")
        .withIndex("by_portalId_and_createdAt", (q) =>
          q.eq("portalId", portal._id)
        )
        .take(BATCH_SIZE)
    )
  )
    return true;
  const legacyId = ctx.db.normalizeId("clientPortals", portal._id);
  if (
    legacyId &&
    (await deleteRows(
      ctx,
      await ctx.db
        .query("portalRevisions")
        .withIndex("by_portalId_and_createdAt", (q) =>
          q.eq("portalId", legacyId)
        )
        .take(BATCH_SIZE)
    ))
  )
    return true;
  await ctx.db.delete(portal._id);
  return true;
}

const storageId = v.union(
  v.id("projectFileVersions"),
  v.id("projectStageAssets"),
  v.id("r2UploadSessions")
);
const batchResult = v.union(
  v.object({ kind: v.literal("done") }),
  v.object({ kind: v.literal("continue") }),
  v.object({ kind: v.literal("wait"), until: v.number() }),
  v.object({
    kind: v.literal("storage"),
    ids: v.array(storageId),
    keys: v.array(v.string()),
    phase: v.number(),
  })
);

export const nextBatch = internalMutation({
  args: { jobId: v.id("projectDeletions") },
  returns: batchResult,
  handler: async (ctx, { jobId }): Promise<Infer<typeof batchResult>> => {
    const job = await ctx.db.get(jobId);
    if (!job || job.completedAt !== undefined) return { kind: "done" };
    await ctx.db.patch(jobId, { retryAfter: Date.now() + 5 * RETRY_MS });
    const id = job.projectId;
    if (job.phase === 0 || job.phase === 1 || job.phase === 6) {
      const rows =
        job.phase === 0
          ? await ctx.db
              .query("projectFileVersions")
              .withIndex("by_projectId_and_uploadedAt", (q) =>
                q.eq("projectId", id)
              )
              .take(BATCH_SIZE)
          : job.phase === 1
            ? await ctx.db
                .query("projectStageAssets")
                .withIndex("by_projectId_and_createdAt", (q) =>
                  q.eq("projectId", id)
                )
                .take(BATCH_SIZE)
            : await ctx.db
                .query("r2UploadSessions")
                .withIndex("by_projectId", (q) => q.eq("projectId", id))
                .take(BATCH_SIZE);
      if (rows.length) {
        const until = Math.max(
          0,
          ...rows.map((row) =>
            "expiresAt" in row ? row.expiresAt + RETRY_MS : 0
          )
        );
        if (until > Date.now()) {
          await ctx.db.patch(jobId, { retryAfter: until + 5 * RETRY_MS });
          return { kind: "wait", until };
        }
        return {
          kind: "storage",
          ids: rows.map((row) => row._id),
          keys: rows.flatMap((row) =>
            "key" in row ? [row.key] : row.r2Key ? [row.r2Key] : []
          ),
          phase: job.phase,
        };
      }
    } else if (job.phase === 2) {
      if (await cleanMediaVersion(ctx, id)) return { kind: "continue" };
    } else if (job.phase === 3 || job.phase === 4) {
      if (await cleanPortal(ctx, id, job.phase === 4))
        return { kind: "continue" };
    } else if (job.phase === 5) {
      const reservations = await ctx.db
        .query("workspaceStorageReservations")
        .withIndex("by_projectId", (q) => q.eq("projectId", id))
        .take(BATCH_SIZE);
      if (reservations.length) {
        for (const reservation of reservations) {
          if (reservation.status === "pending") {
            await creditStorage(
              ctx,
              reservation.workspaceId,
              0,
              reservation.bytes
            );
          }
          if (
            reservation.status !== "committed" &&
            reservation.storageId &&
            (await ctx.db.system.get(reservation.storageId))
          )
            await ctx.storage.delete(reservation.storageId);
          await ctx.db.delete(reservation._id);
        }
        return { kind: "continue" };
      }
    } else {
      const query = projectRows[job.phase - 7];
      if (!query) {
        // Retain only the Project identifier so stale imports cannot resurrect its links.
        await ctx.db.patch(jobId, {
          workspaceId: undefined,
          completedAt: Date.now(),
        });
        return { kind: "done" };
      }
      if (await deleteRows(ctx, await query(ctx, id)))
        return { kind: "continue" };
    }
    await ctx.db.patch(jobId, { phase: job.phase + 1 });
    return { kind: "continue" };
  },
});

/** Recover a stored job if an action was interrupted before scheduling its successor. */
export const retryInterrupted = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("projectDeletions")
      .withIndex("by_completedAt_and_retryAfter", (q) =>
        q.eq("completedAt", undefined).lte("retryAfter", Date.now())
      )
      .take(BATCH_SIZE);
    for (const job of jobs) {
      await ctx.db.patch(job._id, { retryAfter: Date.now() + 5 * RETRY_MS });
      await ctx.scheduler.runAfter(0, internal.projectDeletion.run, {
        jobId: job._id,
      });
    }
    return null;
  },
});

export const finishStorageBatch = internalMutation({
  args: {
    jobId: v.id("projectDeletions"),
    ids: v.array(storageId),
    phase: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { jobId, ids, phase }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.phase !== phase || job.completedAt !== undefined)
      return null;
    if (ids.length > BATCH_SIZE) throw new Error("Deletion batch too large");
    let unattributed = 0;
    const retained = new Map<Id<"teamWorkspaces">, number>();
    for (const id of ids) {
      const row = await ctx.db.get(id);
      if (!row || row.projectId !== job.projectId) continue;
      if (
        "storageId" in row &&
        row.storageId &&
        (await ctx.db.system.get(row.storageId))
      )
        await ctx.storage.delete(row.storageId);
      if ("size" in row && (row.storageId || row.r2Key)) {
        const reservation =
          !row.storageWorkspaceId && row.storageId
            ? await ctx.db
                .query("workspaceStorageReservations")
                .withIndex("by_storageId", (q) =>
                  q.eq("storageId", row.storageId)
                )
                .first()
            : null;
        const workspaceId =
          row.storageWorkspaceId ??
          (reservation?.status === "committed"
            ? reservation.workspaceId
            : undefined);
        if (workspaceId)
          retained.set(
            workspaceId,
            (retained.get(workspaceId) ?? 0) + row.size
          );
        else unattributed += row.size;
      }
      await ctx.db.delete(id);
    }
    for (const [workspaceId, bytes] of retained)
      await creditStorage(ctx, workspaceId, bytes);
    if (unattributed)
      await ctx.db.patch(jobId, {
        unattributedStorageBytes:
          (job.unattributedStorageBytes ?? 0) + unattributed,
      });
    return null;
  },
});

export const run = internalAction({
  args: { jobId: v.id("projectDeletions") },
  returns: v.null(),
  handler: async (ctx, { jobId }): Promise<null> => {
    let delay = 0;
    try {
      const batch = await ctx.runMutation(internal.projectDeletion.nextBatch, {
        jobId,
      });
      if (batch.kind === "done") return null;
      if (batch.kind === "wait") delay = Math.max(0, batch.until - Date.now());
      if (batch.kind === "storage") {
        for (const key of batch.keys)
          await ctx.runAction(internal.r2.deleteObject, { key });
        await ctx.runMutation(internal.projectDeletion.finishStorageBatch, {
          jobId,
          ids: batch.ids,
          phase: batch.phase,
        });
      }
    } catch {
      // Keep the stored phase and media rows until object deletion succeeds.
      delay = RETRY_MS;
    }
    await ctx.scheduler.runAfter(delay, internal.projectDeletion.run, {
      jobId,
    });
    return null;
  },
});

import { v } from "convex/values";
import type { UserIdentity } from "convex/server";
import {
  env,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import schema from "./schema";
import type { Doc } from "./_generated/dataModel";
import { requireProjectAccess } from "./projectAccess";
import { recordProjectActivity } from "./projectActivity";
import {
  actorName,
  cleanText,
  commitStorageReservation,
  requireFileUploadCapability,
  reserveWorkspaceCapacity,
  validExternalUrl,
  validateSafeFile,
} from "./projectFiles";
import { stageAssetKindValidator } from "./stageAssetsValidators";
import type {
  ProjectActivityKind,
  TeamActivityKind,
} from "../src/lib/domain-values";

const MAX_STAGE_ASSETS_PER_PROJECT = 200;
const MAX_COUNTED_PROJECTS = 100;

type AssetActivityKind = ProjectActivityKind & TeamActivityKind;
type ProjectRecord = Pick<
  Doc<"projects">,
  "id" | "ownerUserId" | "teamId" | "workflowStages"
>;

/**
 * A stage id is only accepted while the Project still defines it, so an asset
 * never points at a stage that never existed. A deleted stage leaves its
 * existing assets on the Project unscoped rather than deleting them.
 */
function requireStage(
  project: ProjectRecord,
  workflowStageId: string | undefined
) {
  if (!workflowStageId) return null;
  const stage = project.workflowStages.find(
    (entry) => entry.id === workflowStageId
  );
  if (!stage) throw new Error("Workflow stage not found");
  return stage;
}

async function ensureAssetCapacity(ctx: MutationCtx, projectId: string) {
  const existing = await ctx.db
    .query("projectStageAssets")
    .withIndex("by_projectId_and_createdAt", (q) =>
      q.eq("projectId", projectId)
    )
    .take(MAX_STAGE_ASSETS_PER_PROJECT);
  if (existing.length >= MAX_STAGE_ASSETS_PER_PROJECT) {
    throw new Error("This project has reached its 200-asset limit");
  }
}

async function logAssetActivity(
  ctx: MutationCtx,
  project: ProjectRecord,
  identity: UserIdentity,
  kind: AssetActivityKind,
  message: string,
  detail?: string
) {
  const name = actorName(identity);
  await recordProjectActivity(ctx, {
    project: {
      id: project.id,
      ownerUserId: project.ownerUserId,
      teamId: project.teamId,
    },
    actorUserId: identity.tokenIdentifier,
    actorName: name,
    kind,
    message,
    detail,
  });
  if (project.teamId) {
    await ctx.db.insert("teamActivity", {
      teamId: project.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: name,
      kind,
      projectId: project.id,
      message,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Lists a Project's stage assets with a resolved URL per row, newest first.
 * Archived rows are hidden unless asked for. The client groups them by
 * `workflowStageId` in the Project's stage order and shows an unassigned
 * group for stages the Project no longer defines.
 */
export const listForProject = query({
  args: { projectId: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewProjects");
    const assets = await ctx.db
      .query("projectStageAssets")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("desc")
      .take(MAX_STAGE_ASSETS_PER_PROJECT);
    const visible = args.includeArchived
      ? assets
      : assets.filter((asset) => !asset.archived);
    return {
      assets: await Promise.all(
        visible.map(async (asset) => ({
          _id: asset._id,
          workflowStageId: asset.workflowStageId,
          kind: asset.kind,
          title: asset.title,
          provider: asset.provider,
          url: asset.storageId
            ? await ctx.storage.getUrl(asset.storageId)
            : (asset.externalUrl ?? null),
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          size: asset.size,
          clientVisible: asset.clientVisible,
          archived: asset.archived,
          createdByName: asset.createdByName,
          createdAt: asset.createdAt,
        }))
      ),
      limit: MAX_STAGE_ASSETS_PER_PROJECT,
    };
  },
});

/**
 * Board card counts for the Projects the viewer can see. Projects the viewer
 * cannot open are skipped rather than reported.
 */
export const countsForProjects = query({
  args: { projectIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};
    for (const projectId of args.projectIds.slice(0, MAX_COUNTED_PROJECTS)) {
      try {
        await requireProjectAccess(ctx, projectId, "viewProjects");
      } catch {
        continue;
      }
      const assets = await ctx.db
        .query("projectStageAssets")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", projectId)
        )
        .take(MAX_STAGE_ASSETS_PER_PROJECT);
      counts[projectId] = assets.filter((asset) => !asset.archived).length;
    }
    return counts;
  },
});

/**
 * Adds an external link asset. Links never touch Storage Quota, so they work
 * on Free exactly as they do on paid plans.
 */
export const addLinkAsset = mutation({
  args: {
    projectId: v.string(),
    workflowStageId: v.optional(v.string()),
    kind: stageAssetKindValidator,
    title: v.string(),
    clientVisible: v.optional(v.boolean()),
    externalUrl: v.string(),
  },
  returns: v.id("projectStageAssets"),
  handler: async (ctx, args) => {
    if (!validExternalUrl(args.externalUrl)) {
      throw new Error("Enter a valid http or https asset link");
    }
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    const stage = requireStage(project, args.workflowStageId);
    const title = cleanText(args.title, 160);
    if (!title) throw new Error("Asset title is required");
    await ensureAssetCapacity(ctx, project.id);
    const now = new Date().toISOString();
    const assetId = await ctx.db.insert("projectStageAssets", {
      projectId: project.id,
      workflowStageId: args.workflowStageId,
      ownerUserId: project.ownerUserId,
      teamId: project.teamId,
      kind: args.kind,
      title,
      provider: "external",
      externalUrl: args.externalUrl,
      fileName: "",
      mimeType: "",
      size: 0,
      clientVisible: args.clientVisible ?? false,
      archived: false,
      createdByUserId: identity.tokenIdentifier,
      createdByName: actorName(identity),
      createdAt: now,
      updatedAt: now,
    });
    await logAssetActivity(
      ctx,
      project,
      identity,
      "project_file_added",
      `${title} was added to ${stage?.label ?? "project"} assets.`,
      `Link · ${args.kind}`
    );
    return assetId;
  },
});

/**
 * Reserves hosted storage for a stage upload with the same capability and
 * quota check the project file upload uses. Free workspaces are refused here;
 * their links still go through `addLinkAsset`.
 */
export const generateUploadUrl = mutation({
  args: { projectId: v.string(), size: v.number() },
  returns: v.object({
    reservationId: v.id("workspaceStorageReservations"),
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    const { entitlement, workspaceId } = await requireFileUploadCapability(
      ctx,
      project
    );
    const reservationId = await reserveWorkspaceCapacity(
      ctx,
      project,
      workspaceId,
      identity.tokenIdentifier,
      args.size,
      entitlement.storageQuotaBytes
    );
    const token = crypto.randomUUID();
    await ctx.db.patch(reservationId, { stageUploadToken: token });
    return {
      reservationId,
      url: `${env.CONVEX_SITE_URL}/api/stage-assets/upload?token=${token}`,
    };
  },
});

export const uploadReservation = internalQuery({
  args: { token: v.string() },
  returns: v.union(schema.doc("workspaceStorageReservations"), v.null()),
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("workspaceStorageReservations")
      .withIndex("by_stageUploadToken", (q) =>
        q.eq("stageUploadToken", args.token)
      )
      .unique();
    if (!reservation) return null;
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", reservation.projectId))
      .first();
    return project ? reservation : null;
  },
});

/** Only the upload endpoint can bind newly stored bytes to a reservation. */
export const bindUpload = internalMutation({
  args: { token: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("workspaceStorageReservations")
      .withIndex("by_stageUploadToken", (q) =>
        q.eq("stageUploadToken", args.token)
      )
      .unique();
    if (
      !reservation ||
      reservation.status !== "pending" ||
      reservation.expiresAt <= Date.now() ||
      reservation.storageId
    )
      throw new Error("Upload reservation unavailable");
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", reservation.projectId))
      .first();
    if (!project) throw new Error("Project not found");
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata || metadata.size > reservation.bytes)
      throw new Error("Uploaded file exceeds the reserved size");
    await ctx.db.patch(reservation._id, {
      storageId: args.storageId,
      stageUploadToken: undefined,
    });
    return null;
  },
});

const uploadHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "cache-control": "no-store",
  "content-type": "application/json",
};

/** Keeps the direct-upload POST contract while recording server-side ownership. */
export const upload = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: uploadHeaders });
  const token = new URL(request.url).searchParams.get("token");
  if (!token)
    return new Response("{}", { status: 400, headers: uploadHeaders });
  const reservation = await ctx.runQuery(
    internal.stageAssets.uploadReservation,
    {
      token,
    }
  );
  if (
    !reservation ||
    reservation.status !== "pending" ||
    reservation.expiresAt <= Date.now() ||
    reservation.storageId
  )
    return new Response("{}", { status: 403, headers: uploadHeaders });
  const blob = await request.blob();
  if (blob.size > reservation.bytes)
    return new Response("{}", { status: 413, headers: uploadHeaders });
  const storageId = await ctx.storage.store(blob);
  try {
    await ctx.runMutation(internal.stageAssets.bindUpload, {
      token,
      storageId,
    });
  } catch {
    await ctx.storage.delete(storageId);
    return new Response("{}", { status: 403, headers: uploadHeaders });
  }
  return new Response(JSON.stringify({ storageId }), {
    status: 200,
    headers: uploadHeaders,
  });
});

/**
 * Saves a staged upload as an asset and commits its storage reservation in the
 * same transaction, so a failed save never keeps quota.
 */
export const addUploadedAsset = mutation({
  args: {
    projectId: v.string(),
    workflowStageId: v.optional(v.string()),
    kind: stageAssetKindValidator,
    title: v.string(),
    clientVisible: v.optional(v.boolean()),
    storageId: v.id("_storage"),
    reservationId: v.id("workspaceStorageReservations"),
    fileName: v.string(),
    mimeType: v.string(),
  },
  returns: v.id("projectStageAssets"),
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    await requireFileUploadCapability(ctx, project);
    const stage = requireStage(project, args.workflowStageId);
    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.projectId !== project.id ||
      reservation.uploaderUserId !== identity.tokenIdentifier ||
      reservation.storageId !== args.storageId
    )
      throw new Error("Uploaded file does not belong to this reservation");
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new Error("Uploaded file not found");
    const fileName = cleanText(args.fileName, 240) || "asset";
    const mimeType =
      cleanText(args.mimeType, 120) ||
      metadata.contentType ||
      "application/octet-stream";
    validateSafeFile(fileName, mimeType, metadata.size, "convex");
    const title = cleanText(args.title, 160) || cleanText(fileName, 160);
    if (!title) throw new Error("Asset title is required");
    const existing = await ctx.db
      .query("projectStageAssets")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (existing) {
      throw new Error(
        "This uploaded file is already attached to a stage asset"
      );
    }
    const projectFileVersion = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (projectFileVersion)
      throw new Error(
        "This uploaded file is already attached to a project version"
      );
    await ensureAssetCapacity(ctx, project.id);
    const now = new Date().toISOString();
    const assetId = await ctx.db.insert("projectStageAssets", {
      projectId: project.id,
      workflowStageId: args.workflowStageId,
      ownerUserId: project.ownerUserId,
      teamId: project.teamId,
      kind: args.kind,
      title,
      provider: "convex",
      storageWorkspaceId: reservation.workspaceId,
      storageId: args.storageId,
      fileName,
      mimeType,
      size: metadata.size,
      clientVisible: args.clientVisible ?? false,
      archived: false,
      createdByUserId: identity.tokenIdentifier,
      createdByName: actorName(identity),
      createdAt: now,
      updatedAt: now,
    });
    await commitStorageReservation(
      ctx,
      args.reservationId,
      project,
      identity.tokenIdentifier,
      metadata.size
    );
    await logAssetActivity(
      ctx,
      project,
      identity,
      "project_file_added",
      `${title} was added to ${stage?.label ?? "project"} assets.`,
      `${fileName} · convex · ${args.kind}`
    );
    return assetId;
  },
});

/**
 * Removes an asset from its stage by archiving the row. Uploaded bytes stay in
 * storage and the activity log keeps the removal, so history is not rewritten.
 */
export const removeAsset = mutation({
  args: { assetId: v.id("projectStageAssets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error("Stage asset not found");
    const { identity, project } = await requireProjectAccess(
      ctx,
      asset.projectId,
      "editProjects"
    );
    if (asset.archived) return null;
    const stage = project.workflowStages.find(
      (entry) => entry.id === asset.workflowStageId
    );
    await ctx.db.patch(args.assetId, {
      archived: true,
      clientVisible: false,
      updatedAt: new Date().toISOString(),
    });
    await logAssetActivity(
      ctx,
      project,
      identity,
      "project_file_removed",
      `${asset.title} was removed from ${stage?.label ?? "project"} assets.`
    );
    return null;
  },
});

/** Archived native uploads can be deleted without removing their Activity. */
export const permanentlyDeleteAsset = mutation({
  args: { assetId: v.id("projectStageAssets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return null;
    const { identity, project } = await requireProjectAccess(
      ctx,
      asset.projectId,
      "editProjects"
    );
    if (!asset.archived)
      throw new Error("Archive this asset before deleting it permanently");
    // Stage uploads currently create native objects only. Do not release an
    // R2 charge before its external object has been removed successfully.
    if (asset.r2Key)
      throw new Error(
        "This hosted asset needs operator cleanup before deletion"
      );
    if (asset.storageId && asset.size > 0) {
      const reservation = !asset.storageWorkspaceId
        ? await ctx.db
            .query("workspaceStorageReservations")
            .withIndex("by_storageId", (q) =>
              q.eq("storageId", asset.storageId)
            )
            .first()
        : null;
      const workspaceId =
        asset.storageWorkspaceId ??
        (reservation?.status === "committed"
          ? reservation.workspaceId
          : undefined);
      if (!workspaceId)
        throw new Error("Storage ownership needs operator reconciliation");
      const subscription = await ctx.db
        .query("workspaceSubscriptions")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
        .unique();
      if (!subscription) throw new Error("Workspace subscription missing");
      await ctx.db.patch(subscription._id, {
        retainedStorageBytes: Math.max(
          0,
          (subscription.retainedStorageBytes ?? 0) - asset.size
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    if (asset.storageId) await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(asset._id);
    await logAssetActivity(
      ctx,
      project,
      identity,
      "project_file_removed",
      `${asset.title} was permanently deleted from project assets.`
    );
    return null;
  },
});

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { completeAiRun, enqueueAiRun, requireAiEditor } from "./aiRuns";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";
import {
  briefInputSchema,
  cleanBriefDraft,
  redactBriefContacts,
  BRIEF_PDF_UNAVAILABLE_MESSAGE,
} from "./briefImportPrompt";
import { isR2Configured } from "./r2Settings";
import { DEFAULT_WORKFLOW_STAGES } from "../src/lib/workflow-templates";
import schema from "./schema";

async function creationAccess(
  ctx: MutationCtx | QueryCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const workspace = await requireAiEditor(
    ctx,
    workspaceId,
    identity.tokenIdentifier
  );
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", workspaceId).eq("userId", identity.tokenIdentifier)
    )
    .unique();
  if (!member?.permissions.createProjects || !member.permissions.editProjects)
    throw new Error("Project creation and edit permission required");
  if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
  return { workspace, identity };
}

export const workspace = query({
  args: { teamId: v.optional(v.id("teamWorkspaces")) },
  returns: v.union(v.null(), schema.doc("teamWorkspaces")),
  handler: async (ctx, { teamId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const found = teamId
      ? await ctx.db.get(teamId)
      : await ctx.db
          .query("teamWorkspaces")
          .withIndex("by_ownerUserId", (q) =>
            q.eq("ownerUserId", identity.tokenIdentifier)
          )
          .unique();
    if (!found) return null;
    try {
      await creationAccess(ctx, found._id);
      return found;
    } catch {
      return null;
    }
  },
});

/**
 * PDF brief import needs temporary R2 storage. Whether it ships is an
 * operational decision, so the option only shows up when the deployment has
 * R2 configured. The answer is a boolean; no env value leaves the server.
 */
export const pdfImportAvailable = query({
  args: {},
  returns: v.boolean(),
  handler: async (): Promise<boolean> => isR2Configured(),
});

const generateArgs = {
  workspaceId: v.id("teamWorkspaces"),
  inputJson: v.string(),
  modelTier: aiModelTierValidator,
};
const generateResult = v.object({ runId: v.id("aiRuns"), reused: v.boolean() });

export const generate = action({
  args: generateArgs,
  returns: generateResult,
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    if (args.inputJson.length > 60_000) throw new Error("Brief is too large");
    const input = briefInputSchema.parse(JSON.parse(args.inputJson));
    if (input.kind === "pdf" && !isR2Configured())
      throw new Error(BRIEF_PDF_UNAVAILABLE_MESSAGE);
    const sha256 =
      input.kind === "pdf"
        ? await ctx.runAction(internal.briefImportUploads.inspect, {
            workspaceId: args.workspaceId,
            uploadId: input.uploadId,
          })
        : undefined;
    return ctx.runMutation(internal.briefImport.enqueue, { ...args, sha256 });
  },
});

export const enqueue = internalMutation({
  args: { ...generateArgs, sha256: v.optional(v.string()) },
  returns: generateResult,
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"aiRuns">; reused: boolean }> => {
    const { identity } = await creationAccess(ctx, args.workspaceId);
    if (args.inputJson.length > 60_000) throw new Error("Brief is too large");
    const input = briefInputSchema.parse(JSON.parse(args.inputJson));
    let upload;
    if (input.kind === "text") input.text = redactBriefContacts(input.text);
    else {
      const uploadId = ctx.db.normalizeId("briefUploads", input.uploadId);
      upload = uploadId ? await ctx.db.get(uploadId) : null;
      if (
        !upload ||
        upload.workspaceId !== args.workspaceId ||
        upload.uploader !== identity.tokenIdentifier ||
        upload.expiresAt <= Date.now()
      )
        throw new Error("Brief upload access required or upload expired");
      if (!args.sha256 || !/^[a-f0-9]{64}$/.test(args.sha256))
        throw new Error("Verified PDF required");
      input.sha256 = args.sha256;
    }
    const result = await enqueueAiRun(
      ctx,
      {
        workspaceId: args.workspaceId,
        feature: "brief_import",
        promptVersion: "v1",
        modelTier: args.modelTier,
        sourceIds: [],
        inputJson: JSON.stringify(input),
        ...(input.kind === "pdf"
          ? {
              dedupeInputJson: JSON.stringify({
                kind: "pdf",
                sha256: input.sha256,
              }),
            }
          : {}),
      },
      internal.briefImportActions.run
    );
    if (upload?.runId && upload.runId !== result.runId)
      throw new Error("Upload already belongs to another run");
    if (upload && !result.reused)
      await ctx.db.patch(upload._id, {
        runId: result.runId,
        sha256: args.sha256,
      });
    return result;
  },
});

export const createUpload = internalMutation({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.object({ uploadId: v.id("briefUploads"), expiresAt: v.number() }),
  handler: async (ctx, { workspaceId }) => {
    const { identity } = await creationAccess(ctx, workspaceId);
    const expiresAt = Date.now() + 15 * 60_000;
    const uploadId = await ctx.db.insert("briefUploads", {
      workspaceId,
      uploader: identity.tokenIdentifier,
      expiresAt,
    });
    await ctx.scheduler.runAt(
      expiresAt + 60_000,
      internal.briefImportUploads.cleanup,
      { uploadId }
    );
    return { uploadId, expiresAt };
  },
});

export const attachMultipart = internalMutation({
  args: { uploadId: v.id("briefUploads"), multipartId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload || upload.expiresAt <= Date.now() || upload.multipartId)
      return false;
    await ctx.db.patch(args.uploadId, { multipartId: args.multipartId });
    return true;
  },
});

export const getUpload = internalQuery({
  args: { workspaceId: v.id("teamWorkspaces"), uploadId: v.string() },
  returns: schema.doc("briefUploads"),
  handler: async (ctx, { workspaceId, uploadId }) => {
    const { identity } = await creationAccess(ctx, workspaceId);
    const id = ctx.db.normalizeId("briefUploads", uploadId);
    const upload = id ? await ctx.db.get(id) : null;
    if (
      !upload ||
      upload.workspaceId !== workspaceId ||
      upload.uploader !== identity.tokenIdentifier
    )
      throw new Error("Brief upload access required or upload expired");
    return upload;
  },
});

export const uploadForRun = internalQuery({
  args: { runId: v.id("aiRuns"), uploadId: v.string(), sha256: v.string() },
  returns: schema.doc("briefUploads"),
  handler: async (ctx, { runId, uploadId, sha256 }) => {
    const run = await ctx.db.get(runId);
    const id = ctx.db.normalizeId("briefUploads", uploadId);
    const upload = id ? await ctx.db.get(id) : null;
    if (
      !run ||
      !upload ||
      upload.runId !== runId ||
      upload.sha256 !== sha256 ||
      upload.workspaceId !== run.workspaceId ||
      upload.uploader !== run.requestedBy
    )
      throw new Error("Brief upload does not belong to this run");
    return upload;
  },
});

export const cleanupTarget = internalQuery({
  args: { uploadId: v.id("briefUploads") },
  returns: v.union(
    v.null(),
    v.object({
      ready: v.boolean(),
      expiresAt: v.number(),
      multipartId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, { uploadId }) => {
    const upload = await ctx.db.get(uploadId);
    if (!upload) return null;
    const run = upload.runId ? await ctx.db.get(upload.runId) : null;
    return {
      expiresAt: upload.expiresAt,
      multipartId: upload.multipartId,
      ready: !run || run.status === "succeeded" || run.status === "failed",
    };
  },
});

export const finishCleanup = internalMutation({
  args: { uploadId: v.id("briefUploads") },
  returns: v.null(),
  handler: async (ctx, { uploadId }) => {
    if (await ctx.db.get(uploadId)) await ctx.db.delete(uploadId);
    return null;
  },
});

export const save = internalMutation({
  args: { completion: aiCompletionValidator },
  returns: v.boolean(),
  handler: async (ctx, { completion }): Promise<boolean> => {
    const run = await ctx.db.get(completion.runId);
    if (!run || run.status !== "running" || run.feature !== "brief_import")
      return false;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy
    );
    if (!workspace.aiEnabled) throw new Error("Workspace AI is disabled");
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_userId", (q) =>
        q.eq("teamId", run.workspaceId).eq("userId", run.requestedBy)
      )
      .unique();
    if (!member?.permissions.createProjects || !member.permissions.editProjects)
      throw new Error("Project creation and edit permission required");
    return completeAiRun(ctx, {
      ...completion,
      outputJson: JSON.stringify(
        cleanBriefDraft(JSON.parse(completion.outputJson))
      ),
    });
  },
});

export const canExecute = internalQuery({
  args: { runId: v.id("aiRuns") },
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.feature !== "brief_import") return false;
    try {
      const workspace = await requireAiEditor(
        ctx,
        run.workspaceId,
        run.requestedBy
      );
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", run.workspaceId).eq("userId", run.requestedBy)
        )
        .unique();
      return Boolean(
        workspace.aiEnabled &&
        member?.permissions.createProjects &&
        member.permissions.editProjects
      );
    } catch {
      return false;
    }
  },
});

export const confirm = mutation({
  args: {
    runId: v.id("aiRuns"),
    draftJson: v.string(),
    clientId: v.string(),
    personal: v.boolean(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Brief draft not found");
    const { identity } = await creationAccess(ctx, run.workspaceId);
    if (
      run.feature !== "brief_import" ||
      run.status !== "succeeded" ||
      run.requestedBy !== identity.tokenIdentifier
    )
      throw new Error("Completed brief draft required");
    const workspace = await ctx.db.get(run.workspaceId);
    if (args.personal && workspace?.ownerUserId !== identity.tokenIdentifier)
      throw new Error("Personal Workspace access required");
    const previous = await ctx.db
      .query("briefImports")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .unique();
    if (previous) return previous.projectId;
    if (args.draftJson.length > 30_000)
      throw new Error("Brief draft is too large");
    const draft = cleanBriefDraft(JSON.parse(args.draftJson));
    if (!draft.dueDate)
      throw new Error("Choose a project deadline before confirming");
    const id = `brief:${run._id}`;
    await ctx.runMutation(api.projects.create, {
      project: {
        id,
        teamId: args.personal ? undefined : run.workspaceId,
        assigneeUserIds: [],
        profileId: "video-editing",
        title: draft.title,
        clientId: args.clientId,
        workflowStages: DEFAULT_WORKFLOW_STAGES,
        workType: "Freelance",
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: draft.dueDate,
        earnings: 0,
        notes: draft.questions.length
          ? `Open questions\n${draft.questions.join("\n")}`
          : "",
      },
    });
    for (const [index, output] of draft.outputs.entries())
      await ctx.runMutation(api.projectOutputs.create, {
        projectId: id,
        output: {
          id: `${id}:output:${index + 1}`,
          title: output.title,
          description: output.specification,
          category: "Deliverable",
          dueDate: output.dueDate ?? undefined,
        },
      });
    await ctx.db.insert("briefImports", { runId: run._id, projectId: id });
    return id;
  },
});

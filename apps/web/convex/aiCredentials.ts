import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { authenticatedMember, requireAiEditor } from "./aiRuns";
import {
  aiModelTierValidator,
  aiProviderForTier,
  aiProviderValidator,
} from "./aiValidators";
import schema from "./schema";

type Provider = Infer<typeof aiProviderValidator>;

async function requireOwner(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const { workspace, member, userId } = await authenticatedMember(
    ctx,
    workspaceId
  );
  if (member.role !== "Owner" || workspace.ownerUserId !== userId) {
    throw new Error("Only the Workspace Owner can manage AI keys");
  }
}

async function encryptionKey() {
  const secret = process.env.AI_BYOK_ENCRYPTION_KEY;
  if (!secret || !/^[a-f\d]{64}$/i.test(secret)) {
    throw new Error(
      "AI key storage is not configured. Contact the workspace administrator."
    );
  }
  const bytes = Uint8Array.from({ length: 32 }, (_, index) =>
    parseInt(secret.slice(index * 2, index * 2 + 2), 16)
  );
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function additionalData(workspaceId: Id<"teamWorkspaces">, provider: Provider) {
  // Bind each encrypted key to its workspace and provider to prevent substitution.
  return new TextEncoder().encode(`${workspaceId}:${provider}`);
}

export async function encryptCredential(
  workspaceId: Id<"teamWorkspaces">,
  provider: Provider,
  apiKey: string
) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: additionalData(workspaceId, provider),
    },
    key,
    new TextEncoder().encode(apiKey)
  );
  return { ciphertext, iv: iv.buffer };
}

export async function decryptCredential(credential: Doc<"aiProviderKeys">) {
  const key = await encryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: credential.iv,
      additionalData: additionalData(
        credential.workspaceId,
        credential.provider
      ),
    },
    key,
    credential.ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

export const checkOwner = internalQuery({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.null(),
  handler: async (ctx, { workspaceId }) => {
    await requireOwner(ctx, workspaceId);
    return null;
  },
});

export const save = action({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    provider: aiProviderValidator,
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { workspaceId, provider, apiKey }) => {
    await ctx.runQuery(internal.aiCredentials.checkOwner, { workspaceId });
    const trimmed = apiKey.trim();
    if (
      trimmed.length < 16 ||
      trimmed.length > 1024 ||
      !/^[\x21-\x7e]+$/.test(trimmed)
    ) {
      throw new Error(
        "Enter a valid API key (16 to 1024 characters, without spaces)."
      );
    }
    const encrypted = await encryptCredential(workspaceId, provider, trimmed);
    await ctx.runMutation(internal.aiCredentials.store, {
      workspaceId,
      provider,
      ...encrypted,
    });
    return null;
  },
});

export const store = internalMutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    provider: aiProviderValidator,
    ciphertext: v.bytes(),
    iv: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.workspaceId);
    const existing = await ctx.db
      .query("aiProviderKeys")
      .withIndex("by_workspaceId_and_provider", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("provider", args.provider)
      )
      .unique();
    if (existing) await ctx.db.replace(existing._id, args);
    else await ctx.db.insert("aiProviderKeys", args);
    return null;
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("teamWorkspaces"), provider: aiProviderValidator },
  returns: v.null(),
  handler: async (ctx, { workspaceId, provider }) => {
    await requireOwner(ctx, workspaceId);
    const existing = await ctx.db
      .query("aiProviderKeys")
      .withIndex("by_workspaceId_and_provider", (q) =>
        q.eq("workspaceId", workspaceId).eq("provider", provider)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

export const getForRun = internalQuery({
  args: { runId: v.id("aiRuns"), modelTier: aiModelTierValidator },
  returns: v.union(v.null(), schema.doc("aiProviderKeys")),
  handler: async (ctx, { runId, modelTier }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "running" || run.modelTier !== modelTier)
      return null;
    const workspace = await requireAiEditor(
      ctx,
      run.workspaceId,
      run.requestedBy,
      run.projectId
    );
    if (!workspace.aiEnabled) return null;
    return ctx.db
      .query("aiProviderKeys")
      .withIndex("by_workspaceId_and_provider", (q) =>
        q
          .eq("workspaceId", run.workspaceId)
          .eq("provider", aiProviderForTier(modelTier))
      )
      .unique();
  },
});

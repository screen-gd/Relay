import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireProjectAccess } from "./projectAccess";
import { requireAiEditor } from "./aiRuns";

/** Requires project editing by an Owner/Editor and resolves the AI Workspace. */
export async function statusDraftAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: string
) {
  const access = await requireProjectAccess(ctx, projectId, "editProjects");
  if (
    access.membership &&
    !["Owner", "Editor"].includes(access.membership.role)
  )
    throw new Error("Only Owners and Editors can edit AI drafts");
  const workspaceId = access.project.teamId
    ? ctx.db.normalizeId("teamWorkspaces", access.project.teamId)
    : (
        await ctx.db
          .query("teamWorkspaces")
          .withIndex("by_ownerUserId", (q) =>
            q.eq("ownerUserId", access.identity.tokenIdentifier)
          )
          .unique()
      )?._id;
  if (!workspaceId) throw new Error("Workspace required");
  const workspace = await requireAiEditor(
    ctx,
    workspaceId,
    access.identity.tokenIdentifier,
    projectId
  );
  return { ...access, workspaceId, workspace };
}

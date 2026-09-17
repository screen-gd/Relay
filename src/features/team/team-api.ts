import { makeFunctionReference } from "convex/server";

export const updateWorkspaceSettings = makeFunctionReference<
  "mutation",
  {
    teamId: string;
    name: string;
    currencyCode: string;
    timeZone: string;
    defaultWorkflowTemplateId?: string;
    allowAllTeamProjects: boolean;
  },
  null
>("team:updateWorkspaceSettings");

export const updateMemberPermissions = makeFunctionReference<
  "mutation",
  {
    teamId: string;
    memberId: string;
    permissions: Record<string, boolean>;
  },
  null
>("team:updateMemberPermissions");

export const transferOwnership = makeFunctionReference<
  "mutation",
  { teamId: string; memberId: string },
  null
>("team:transferOwnership");

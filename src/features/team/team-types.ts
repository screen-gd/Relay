import type { Id } from "../../../convex/_generated/dataModel";

export type TeamWorkspaceContract = {
  _id: Id<"teamWorkspaces">;
  ownerUserId: string;
  name: string;
  inviteCode: string;
  allowAllTeamProjects?: boolean;
  currencyCode?: string;
  timeZone?: string;
  defaultWorkflowTemplateId?: string;
};

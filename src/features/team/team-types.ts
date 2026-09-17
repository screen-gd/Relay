export type TeamWorkspaceContract = {
  _id: string;
  ownerUserId: string;
  name: string;
  inviteCode: string;
  allowAllTeamProjects?: boolean;
  currencyCode?: string;
  timeZone?: string;
  defaultWorkflowTemplateId?: string;
};

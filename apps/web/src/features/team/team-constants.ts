import { TEAM_ROLE_VALUES } from "@/lib/domain-values";

export const TEAM_WORKSPACE_NAME_LIMIT = 80;
export const TEAM_CHAT_MESSAGE_LIMIT = 800;
export const TEAM_PROJECT_COMMENT_LIMIT = 1000;
export const TEAM_INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/;
export const TEAM_MEMBER_PERMISSION_LABELS = [
  ["viewProjects", "View Projects"],
  ["editProjects", "Edit Projects"],
  ["reviewProjects", "Reviews"],
  ["managePortal", "Client Portals"],
  ["manageFinance", "Finance"],
] as const;
export const teamRoleOptions = [...TEAM_ROLE_VALUES];

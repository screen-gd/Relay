/** Approved launch offers; checkout and hosted-media readiness are separate. */
export const CREATOR_MONTHLY_PRICE_USD = 9.99;
export const TEAM_MONTHLY_PRICE_USD = 29;
export const TEAM_INCLUDED_EDITOR_SEATS = 3;
export const EXTRA_EDITOR_MONTHLY_PRICE_USD = 9;
export const CREATOR_LAUNCH_STORAGE_GB = 25;
export const TEAM_LAUNCH_STORAGE_GB = 100;

/** Projects a Free workspace can have in progress at once. Delivered and archived Projects do not count. */
export const FREE_OPEN_PROJECT_LIMIT = 10;

/** Code on the ConvexError thrown when a Free workspace is at its limit. */
export const OPEN_PROJECT_LIMIT_CODE = "OPEN_PROJECT_LIMIT";

export const OPEN_PROJECT_LIMIT_MESSAGE = `Free workspaces can have ${FREE_OPEN_PROJECT_LIMIT} Projects in progress. Deliver or archive a Project, or upgrade to Creator for unlimited Projects.`;

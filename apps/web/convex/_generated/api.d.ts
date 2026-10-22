/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiCredentials from "../aiCredentials.js";
import type * as aiGeneration from "../aiGeneration.js";
import type * as aiRuns from "../aiRuns.js";
import type * as aiValidators from "../aiValidators.js";
import type * as billingParsing from "../billingParsing.js";
import type * as briefImport from "../briefImport.js";
import type * as briefImportActions from "../briefImportActions.js";
import type * as briefImportPrompt from "../briefImportPrompt.js";
import type * as briefImportUploads from "../briefImportUploads.js";
import type * as changeOrders from "../changeOrders.js";
import type * as changeOrdersActions from "../changeOrdersActions.js";
import type * as changeOrdersPrompt from "../changeOrdersPrompt.js";
import type * as changeOrdersValidators from "../changeOrdersValidators.js";
import type * as clientHub from "../clientHub.js";
import type * as clientPortals from "../clientPortals.js";
import type * as commentTimestamps from "../commentTimestamps.js";
import type * as creatorTrials from "../creatorTrials.js";
import type * as crons from "../crons.js";
import type * as deadlineRisk from "../deadlineRisk.js";
import type * as deadlineRiskRules from "../deadlineRiskRules.js";
import type * as domainValidators from "../domainValidators.js";
import type * as earnings from "../earnings.js";
import type * as earningsLedger from "../earningsLedger.js";
import type * as earningsQa from "../earningsQa.js";
import type * as earningsQaActions from "../earningsQaActions.js";
import type * as earningsQaPrompt from "../earningsQaPrompt.js";
import type * as earningsQaValidators from "../earningsQaValidators.js";
import type * as http from "../http.js";
import type * as mediaVersionComments from "../mediaVersionComments.js";
import type * as migrations from "../migrations.js";
import type * as projectAccess from "../projectAccess.js";
import type * as projectActivity from "../projectActivity.js";
import type * as projectDeletion from "../projectDeletion.js";
import type * as projectFiles from "../projectFiles.js";
import type * as projectGroups from "../projectGroups.js";
import type * as projectLifecycle from "../projectLifecycle.js";
import type * as projectOutputs from "../projectOutputs.js";
import type * as projectPortals from "../projectPortals.js";
import type * as projects from "../projects.js";
import type * as publicProfiles from "../publicProfiles.js";
import type * as r2 from "../r2.js";
import type * as resourceLinks from "../resourceLinks.js";
import type * as revisionItems from "../revisionItems.js";
import type * as revisionItemsActions from "../revisionItemsActions.js";
import type * as revisionItemsPrompt from "../revisionItemsPrompt.js";
import type * as revisionItemsValidators from "../revisionItemsValidators.js";
import type * as revisionRounds from "../revisionRounds.js";
import type * as revisionRoundsRules from "../revisionRoundsRules.js";
import type * as revisionScopeTables from "../revisionScopeTables.js";
import type * as riskDigest from "../riskDigest.js";
import type * as riskDigestActions from "../riskDigestActions.js";
import type * as riskDigestPrompt from "../riskDigestPrompt.js";
import type * as riskDigestValidators from "../riskDigestValidators.js";
import type * as salaryPlans from "../salaryPlans.js";
import type * as settings from "../settings.js";
import type * as stageAssets from "../stageAssets.js";
import type * as stageAssetsValidators from "../stageAssetsValidators.js";
import type * as statusDrafts from "../statusDrafts.js";
import type * as statusDraftsAccess from "../statusDraftsAccess.js";
import type * as statusDraftsActions from "../statusDraftsActions.js";
import type * as statusDraftsPrompt from "../statusDraftsPrompt.js";
import type * as statusDraftsValidators from "../statusDraftsValidators.js";
import type * as team from "../team.js";
import type * as transcripts from "../transcripts.js";
import type * as transcriptsActions from "../transcriptsActions.js";
import type * as transcriptsValidators from "../transcriptsValidators.js";
import type * as versionChangelog from "../versionChangelog.js";
import type * as versionChangelogActions from "../versionChangelogActions.js";
import type * as versionChangelogPrompt from "../versionChangelogPrompt.js";
import type * as versionChangelogValidators from "../versionChangelogValidators.js";
import type * as waitlist from "../waitlist.js";
import type * as workspaceClients from "../workspaceClients.js";
import type * as workspaceDiscovery from "../workspaceDiscovery.js";
import type * as workspaceSubscriptionProvisioning from "../workspaceSubscriptionProvisioning.js";
import type * as workspaceSubscriptionReconciliation from "../workspaceSubscriptionReconciliation.js";
import type * as workspaceSubscriptions from "../workspaceSubscriptions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiCredentials: typeof aiCredentials;
  aiGeneration: typeof aiGeneration;
  aiRuns: typeof aiRuns;
  aiValidators: typeof aiValidators;
  billingParsing: typeof billingParsing;
  briefImport: typeof briefImport;
  briefImportActions: typeof briefImportActions;
  briefImportPrompt: typeof briefImportPrompt;
  briefImportUploads: typeof briefImportUploads;
  changeOrders: typeof changeOrders;
  changeOrdersActions: typeof changeOrdersActions;
  changeOrdersPrompt: typeof changeOrdersPrompt;
  changeOrdersValidators: typeof changeOrdersValidators;
  clientHub: typeof clientHub;
  clientPortals: typeof clientPortals;
  commentTimestamps: typeof commentTimestamps;
  creatorTrials: typeof creatorTrials;
  crons: typeof crons;
  deadlineRisk: typeof deadlineRisk;
  deadlineRiskRules: typeof deadlineRiskRules;
  domainValidators: typeof domainValidators;
  earnings: typeof earnings;
  earningsLedger: typeof earningsLedger;
  earningsQa: typeof earningsQa;
  earningsQaActions: typeof earningsQaActions;
  earningsQaPrompt: typeof earningsQaPrompt;
  earningsQaValidators: typeof earningsQaValidators;
  http: typeof http;
  mediaVersionComments: typeof mediaVersionComments;
  migrations: typeof migrations;
  projectAccess: typeof projectAccess;
  projectActivity: typeof projectActivity;
  projectDeletion: typeof projectDeletion;
  projectFiles: typeof projectFiles;
  projectGroups: typeof projectGroups;
  projectLifecycle: typeof projectLifecycle;
  projectOutputs: typeof projectOutputs;
  projectPortals: typeof projectPortals;
  projects: typeof projects;
  publicProfiles: typeof publicProfiles;
  r2: typeof r2;
  resourceLinks: typeof resourceLinks;
  revisionItems: typeof revisionItems;
  revisionItemsActions: typeof revisionItemsActions;
  revisionItemsPrompt: typeof revisionItemsPrompt;
  revisionItemsValidators: typeof revisionItemsValidators;
  revisionRounds: typeof revisionRounds;
  revisionRoundsRules: typeof revisionRoundsRules;
  revisionScopeTables: typeof revisionScopeTables;
  riskDigest: typeof riskDigest;
  riskDigestActions: typeof riskDigestActions;
  riskDigestPrompt: typeof riskDigestPrompt;
  riskDigestValidators: typeof riskDigestValidators;
  salaryPlans: typeof salaryPlans;
  settings: typeof settings;
  stageAssets: typeof stageAssets;
  stageAssetsValidators: typeof stageAssetsValidators;
  statusDrafts: typeof statusDrafts;
  statusDraftsAccess: typeof statusDraftsAccess;
  statusDraftsActions: typeof statusDraftsActions;
  statusDraftsPrompt: typeof statusDraftsPrompt;
  statusDraftsValidators: typeof statusDraftsValidators;
  team: typeof team;
  transcripts: typeof transcripts;
  transcriptsActions: typeof transcriptsActions;
  transcriptsValidators: typeof transcriptsValidators;
  versionChangelog: typeof versionChangelog;
  versionChangelogActions: typeof versionChangelogActions;
  versionChangelogPrompt: typeof versionChangelogPrompt;
  versionChangelogValidators: typeof versionChangelogValidators;
  waitlist: typeof waitlist;
  workspaceClients: typeof workspaceClients;
  workspaceDiscovery: typeof workspaceDiscovery;
  workspaceSubscriptionProvisioning: typeof workspaceSubscriptionProvisioning;
  workspaceSubscriptionReconciliation: typeof workspaceSubscriptionReconciliation;
  workspaceSubscriptions: typeof workspaceSubscriptions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};

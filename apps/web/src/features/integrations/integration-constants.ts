import type { IntegrationConfig } from "@/lib/types";

export const emptyIntegrationConfig: IntegrationConfig = {
  connected: false,
  account: "",
  folder: "",
  channel: "",
  workspace: "",
  webhookUrl: "",
  connectedAt: "",
  lastSyncAt: "",
};

export const integrationNames = [
  "Google Drive",
  "Dropbox",
  "Slack",
  "Frame.io",
];

export const defaultIntegrationConfigs: Record<string, IntegrationConfig> =
  Object.fromEntries(
    integrationNames.map((name) => [name, { ...emptyIntegrationConfig }])
  );

export const integrationDescriptions: Record<string, string> = {
  "Google Drive": "Save Google Drive folder and file links for project assets.",
  Dropbox: "Save Dropbox folder and delivery package links.",
  Slack: "Save Slack channel or message links for project discussion.",
  "Frame.io": "Save Frame.io review links and approval pages.",
};

export const integrationIcons: Record<string, string> = {
  "Google Drive": "G",
  Dropbox: "D",
  Slack: "S",
  "Frame.io": "F",
};

export const integrationColors: Record<string, string> = {
  "Google Drive": "var(--brand-google-drive)",
  Dropbox: "var(--brand-dropbox)",
  Slack: "var(--brand-slack)",
  "Frame.io": "var(--brand-frame-io)",
};

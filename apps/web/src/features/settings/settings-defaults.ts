import type { SettingsState } from "@/lib/types";
import { defaultAccent } from "@/features/routes/shared/route-theme";
import { defaultIntegrationConfigs } from "@/features/integrations/integration-constants";

export const defaultProjectTags = [
  "Job / Salary",
  "Freelance",
  "Personal Channel",
];
const defaultSalaryWorkType = "Job / Salary";
export const defaultSalaryBatchSize = 20;
export const defaultSalaryBatchAmount = 10000;

const permissionKeys = [
  "Create and edit projects",
  "Upload media and assets",
  "Manage project stages",
  "Invite team members",
  "Manage app settings",
];

export const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  Owner: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  Editor: Object.fromEntries(
    permissionKeys.map((k) => [
      k,
      ["Create and edit projects", "Upload media and assets"].includes(k),
    ])
  ),
  Reviewer: Object.fromEntries(permissionKeys.map((k) => [k, false])),
};

export const defaultSettings: SettingsState = {
  studioName: "",
  profileName: "",
  profileUsername: "",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  publicActiveProjects: 0,
  publicDeliveredEdits: 0,
  publicTurnaroundDays: 3,
  timeZone: "UTC",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "USD",
  customClients: [],
  clients: [],
  customProjectTemplates: [],
  projectTags: [...defaultProjectTags],
  salaryWorkType: defaultSalaryWorkType,
  salaryBatchSize: defaultSalaryBatchSize,
  salaryBatchAmount: defaultSalaryBatchAmount,
  projectStages: ["Planned", "In Progress", "Client Review", "Delivered"],
  notifications: {
    "Project updates": false,
    "Feedback received": false,
    "Upcoming deadlines": false,
    Mentions: false,
    "Weekly summary": false,
  },
  integrationConfigs: structuredClone(defaultIntegrationConfigs),
  integrationLinks: {},
  teamRole: "",
  teamMembers: [],
  rolePermissions: structuredClone(defaultRolePermissions),
  theme: "Dark",
  accentColor: defaultAccent,
};

export function createDefaultSettings(): SettingsState {
  return structuredClone(defaultSettings);
}

export const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "SAR"];
export const currencyLabels: Record<string, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  INR: "INR (Rs)",
  AED: "AED (Dh)",
  SAR: "SAR (SR)",
};

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useWorkspaceProjectData } from "./use-workspace-project-data";
import { useOptionalAuth } from "@/lib/optional-auth";
import type {
  WorkItem,
  SettingsState,
  SalaryBatch,
  SalaryPlan,
  SalaryState,
  TeamMember,
  IntegrationConfig,
  ResourceLink,
  SavedProjectTemplate,
  ProjectGroup,
  WorkflowStage,
} from "./types";
import { WORKFLOW_STAGE_PURPOSE_VALUES } from "./types";
import { normalizeIntegrationLinks } from "./integrations";
import { normalizeClientRecords, projectClientName } from "./clients";
import {
  createWorkspaceBackup,
  parseWorkspaceBackup,
} from "./workspace-backup";
import {
  omitLegacySettings,
  settingsPatch,
  type SettingsSaveState,
} from "./settings-persistence";
import { normalizeProjectGroups } from "@/features/projects/project-domain";
import {
  getWorkflowStageStatus,
  moveProjectToStage,
  resolveProjectWorkflowStage,
} from "@/features/projects/project-domain";
import {
  createDefaultSettings,
  defaultRolePermissions,
  defaultSettings,
} from "@/features/settings/settings-defaults";
import {
  emptyIntegrationConfig,
  integrationNames,
} from "@/features/integrations/integration-constants";
import {
  isSalaryWorkType,
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
} from "@/features/routes/utils/work-type-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import { iso, todayDate } from "@/features/routes/utils/date-utils";
import { DEFAULT_PROFILE_ID } from "@/lib/profiles";
import type {
  ProjectWorkflowPort,
  ProjectStageTransitionResult,
} from "@/features/projects/project-workflow-port";
import { DEFAULT_WORKFLOW_STAGES } from "./workflow-templates";
import {
  sampleStudioProjects,
  sampleStudioResources,
  sampleStudioSettings,
} from "./sample-studio";

const cloudSettingsInput = (settings: SettingsState) => ({
  ...omitLegacySettings(settings),
  density: "Balanced",
});
import {
  FILE_CATEGORY_VALUES,
  FILE_STATUS_VALUES,
  LEGACY_TEAM_ROLE_VALUES,
  TEAM_ROLE_VALUES,
  normalizeStoredProjectStatus,
  type SettingsTeamRole,
  type StoredTeamRole,
} from "./domain-values";

const STORAGE_KEY = "video-editing-work-tracker:v1";
const SALARY_STORAGE_KEY = "video-editing-work-tracker:salary-batches:v1";
const SETTINGS_STORAGE_KEY = "video-editing-work-tracker:settings:v1";
const RESOURCES_STORAGE_KEY = "video-editing-work-tracker:resources:v1";
const PROJECT_GROUPS_STORAGE_KEY = "relay:project-groups:v1";

const teamRoleOptions: StoredTeamRole[] = [
  ...TEAM_ROLE_VALUES,
  ...LEGACY_TEAM_ROLE_VALUES,
];
const settingsTeamRoleOptions: SettingsTeamRole[] = ["", ...teamRoleOptions];
const LEGACY_DEMO_SETTINGS = {
  studioName: "Relay",
  profileName: "Jordan Lee",
  profileUsername: "jordanlee",
  profileTitle: "Video Editor & Storyteller",
  profileBio:
    "Clean, cinematic edits for creators, campaigns, and client stories.",
  profileLocation: "Los Angeles, CA",
};

type ToastState = { message: string; tone: "success" | "info" | "warning" };
type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

function isLegacyDemoSettings(value: unknown) {
  if (!isPlainRecord(value)) return false;
  return (
    value.studioName === LEGACY_DEMO_SETTINGS.studioName &&
    value.profileName === LEGACY_DEMO_SETTINGS.profileName &&
    value.profileUsername === LEGACY_DEMO_SETTINGS.profileUsername &&
    value.profileTitle === LEGACY_DEMO_SETTINGS.profileTitle &&
    value.profileBio === LEGACY_DEMO_SETTINGS.profileBio &&
    value.profileLocation === LEGACY_DEMO_SETTINGS.profileLocation
  );
}

function readJson(key: string, fallback: unknown): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isProjectAuthorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /permission|team access|required|not authenticated/i.test(message);
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function freshDefaultSettings(): SettingsState {
  return createDefaultSettings();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasProperty<Key extends PropertyKey>(
  value: object,
  key: Key
): value is Record<Key, unknown> {
  return key in value;
}

function stringSetting(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function optionSetting<Value extends string>(
  value: unknown,
  options: readonly Value[],
  fallback: Value
): Value {
  if (typeof value !== "string") return fallback;
  return options.find((option) => option === value) ?? fallback;
}

function colorSetting(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

function positiveIntegerSetting(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function positiveMoneySetting(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function stringListSetting(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : [...fallback];
}

function booleanRecordSetting(
  value: unknown,
  fallback: Record<string, boolean>
) {
  const record = { ...fallback };
  if (!isPlainRecord(value)) return record;
  for (const key of Object.keys(record)) {
    if (typeof value[key] === "boolean") {
      record[key] = value[key];
    }
  }
  return record;
}

function parseWorkflowStages(value: unknown): WorkflowStage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): WorkflowStage[] => {
    if (!isPlainRecord(candidate)) return [];
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const label =
      typeof candidate.label === "string" ? candidate.label.trim() : "";
    const purpose = candidate.purpose;
    const normalizedPurpose = WORKFLOW_STAGE_PURPOSE_VALUES.find(
      (value) => value === purpose
    );
    if (!id || !label || !normalizedPurpose) {
      return [];
    }
    return [
      {
        id: id.slice(0, 80),
        label: label.slice(0, 80),
        purpose: normalizedPurpose,
      },
    ];
  });
}

function normalizeStoredItem(value: unknown): WorkItem | null {
  if (!isPlainRecord(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : "";
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim()
      : "";
  if (!id || !title) return null;
  const profileId = stringSetting(value.profileId, DEFAULT_PROFILE_ID);
  return {
    id,
    teamId:
      typeof value.teamId === "string" && value.teamId.trim()
        ? value.teamId
        : undefined,
    ownerUserId:
      typeof value.ownerUserId === "string" && value.ownerUserId.trim()
        ? value.ownerUserId
        : undefined,
    assigneeUserIds: Array.isArray(value.assigneeUserIds)
      ? value.assigneeUserIds.flatMap((id): string[] =>
          typeof id === "string" && id.trim() ? [id] : []
        )
      : [],
    profileId: profileId === "video-editing" ? DEFAULT_PROFILE_ID : profileId,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    title,
    client: typeof value.client === "string" ? value.client : "",
    clientId: typeof value.clientId === "string" ? value.clientId : undefined,
    projectGroupId:
      typeof value.projectGroupId === "string"
        ? value.projectGroupId
        : undefined,
    salaryPlanId:
      typeof value.salaryPlanId === "string" && value.salaryPlanId.trim()
        ? value.salaryPlanId
        : undefined,
    archived: value.archived === true,
    status: normalizeStoredProjectStatus(value.status),
    workType: stringSetting(value.workType, "Job / Salary"),
    startDate: stringSetting(value.startDate, iso(todayDate())),
    dueDate: stringSetting(value.dueDate, iso(todayDate())),
    earnings:
      typeof value.earnings === "number" && Number.isFinite(value.earnings)
        ? Math.max(0, value.earnings)
        : 0,
    paid: typeof value.paid === "boolean" ? value.paid : false,
    paidDate: typeof value.paidDate === "string" ? value.paidDate : "",
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : undefined,
    workflowStageId:
      typeof value.workflowStageId === "string"
        ? value.workflowStageId
        : undefined,
    notes: typeof value.notes === "string" ? value.notes : "",
    templateId:
      typeof value.templateId === "string" && value.templateId.trim()
        ? value.templateId.trim().slice(0, 80)
        : undefined,
    templateProjectType:
      typeof value.templateProjectType === "string" &&
      value.templateProjectType.trim()
        ? value.templateProjectType.trim().slice(0, 80)
        : undefined,
    workflowStages: Array.isArray(value.workflowStages)
      ? parseWorkflowStages(value.workflowStages).slice(0, 12)
      : undefined,
    templateDeliverables: Array.isArray(value.templateDeliverables)
      ? value.templateDeliverables
          .flatMap(
            (deliverable): NonNullable<WorkItem["templateDeliverables"]> => {
              if (
                !isPlainRecord(deliverable) ||
                typeof deliverable.title !== "string" ||
                !deliverable.title.trim()
              )
                return [];
              const category = optionSetting(
                deliverable.category,
                FILE_CATEGORY_VALUES,
                "Deliverable"
              );
              const initialStatus = optionSetting(
                deliverable.initialStatus,
                FILE_STATUS_VALUES,
                "draft"
              );
              return [
                { title: deliverable.title.trim(), category, initialStatus },
              ];
            }
          )
          .slice(0, 12)
      : undefined,
    checklistItems: Array.isArray(value.checklistItems)
      ? value.checklistItems
          .flatMap((entry): string[] =>
            typeof entry === "string" && entry.trim() ? [entry.trim()] : []
          )
          .slice(0, 20)
      : undefined,
    checklistCompleted: booleanRecordSetting(value.checklistCompleted, {}),
    integrationLinks: normalizeIntegrationLinks(value.integrationLinks),
  };
}

function normalizeSalaryState(value: unknown): SalaryState {
  const batches =
    isPlainRecord(value) && Array.isArray(value.batches) ? value.batches : [];
  return {
    batches: batches.flatMap((batch, index): SalaryBatch[] => {
      if (!isPlainRecord(batch)) return [];
      const number =
        typeof batch.number === "number" && Number.isFinite(batch.number)
          ? Math.max(1, Math.floor(batch.number))
          : index + 1;
      return [
        {
          id:
            typeof batch.id === "string" && batch.id.trim()
              ? batch.id
              : `batch-${number}`,
          number,
          completedDate: stringSetting(batch.completedDate, iso(todayDate())),
          archived:
            typeof batch.archived === "boolean" ? batch.archived : false,
          archivedDate:
            typeof batch.archivedDate === "string" ? batch.archivedDate : "",
          amount:
            typeof batch.amount === "number" && Number.isFinite(batch.amount)
              ? Math.max(0, batch.amount)
              : undefined,
          paid: typeof batch.paid === "boolean" ? batch.paid : false,
          paidDate: typeof batch.paidDate === "string" ? batch.paidDate : "",
          projectIds: Array.isArray(batch.projectIds)
            ? batch.projectIds.flatMap((id): string[] =>
                typeof id === "string" ? [id] : []
              )
            : undefined,
          requiredProjectCount:
            typeof batch.requiredProjectCount === "number"
              ? Math.max(1, Math.floor(batch.requiredProjectCount))
              : undefined,
          workType:
            typeof batch.workType === "string" ? batch.workType : undefined,
          salaryPlanId:
            typeof batch.salaryPlanId === "string"
              ? batch.salaryPlanId
              : undefined,
          clientId:
            typeof batch.clientId === "string" ? batch.clientId : undefined,
          clientName:
            typeof batch.clientName === "string" ? batch.clientName : undefined,
          planStartDate:
            typeof batch.planStartDate === "string"
              ? batch.planStartDate
              : undefined,
          planNotes:
            typeof batch.planNotes === "string" ? batch.planNotes : undefined,
          received:
            typeof batch.received === "boolean" ? batch.received : undefined,
          receivedAt:
            typeof batch.receivedAt === "string" ? batch.receivedAt : undefined,
          correctionNote:
            typeof batch.correctionNote === "string"
              ? batch.correctionNote
              : undefined,
        },
      ];
    }),
  };
}

function normalizeIntegrationConfig(value: unknown): IntegrationConfig {
  if (!isPlainRecord(value)) return { ...emptyIntegrationConfig };
  return {
    connected: typeof value.connected === "boolean" ? value.connected : false,
    account: typeof value.account === "string" ? value.account.trim() : "",
    folder: typeof value.folder === "string" ? value.folder.trim() : "",
    channel: typeof value.channel === "string" ? value.channel.trim() : "",
    workspace:
      typeof value.workspace === "string" ? value.workspace.trim() : "",
    webhookUrl:
      typeof value.webhookUrl === "string" ? value.webhookUrl.trim() : "",
    connectedAt: typeof value.connectedAt === "string" ? value.connectedAt : "",
    lastSyncAt: typeof value.lastSyncAt === "string" ? value.lastSyncAt : "",
  };
}

function normalizeCustomProjectTemplates(
  value: unknown
): SavedProjectTemplate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((template): SavedProjectTemplate[] => {
      if (!isPlainRecord(template)) return [];
      const name =
        typeof template.name === "string"
          ? template.name.trim().slice(0, 80)
          : "";
      if (!name) return [];
      const rawId =
        typeof template.id === "string" && template.id.trim()
          ? template.id.trim()
          : `custom-${name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}`;
      const id = rawId.startsWith("custom-")
        ? rawId.slice(0, 80)
        : `custom-${rawId}`.slice(0, 80);
      if (seen.has(id)) return [];
      seen.add(id);
      const deliverables = Array.isArray(template.deliverables)
        ? template.deliverables
            .flatMap((deliverable): SavedProjectTemplate["deliverables"] => {
              if (
                !isPlainRecord(deliverable) ||
                typeof deliverable.title !== "string" ||
                !deliverable.title.trim()
              )
                return [];
              const category = optionSetting(
                deliverable.category,
                FILE_CATEGORY_VALUES,
                "Deliverable"
              );
              const initialStatus = optionSetting(
                deliverable.initialStatus,
                FILE_STATUS_VALUES,
                "draft"
              );
              return [
                {
                  title: deliverable.title.trim().slice(0, 120),
                  category,
                  initialStatus,
                },
              ];
            })
            .slice(0, 12)
        : [];
      return [
        {
          id,
          name,
          description:
            typeof template.description === "string"
              ? template.description.trim().slice(0, 220)
              : "Custom workflow template.",
          projectType:
            typeof template.projectType === "string" &&
            template.projectType.trim()
              ? template.projectType.trim().slice(0, 80)
              : "Custom project",
          workType: template.workType === "channel" ? "channel" : "freelance",
          durationDays: Math.max(
            1,
            Math.min(120, Math.floor(Number(template.durationDays) || 7))
          ),
          workflowStages: parseWorkflowStages(template.workflowStages).slice(
            0,
            12
          ),
          deliverables,
          checklistItems: Array.isArray(template.checklistItems)
            ? template.checklistItems
                .flatMap((entry): string[] =>
                  typeof entry === "string" && entry.trim()
                    ? [entry.trim().slice(0, 120)]
                    : []
                )
                .slice(0, 20)
            : [],
          custom: true,
          updatedAt:
            typeof template.updatedAt === "string"
              ? template.updatedAt
              : new Date().toISOString(),
        },
      ];
    })
    .slice(0, 24);
}
function normalizeIntegrationConfigs(
  value: unknown
): Record<string, IntegrationConfig> {
  const configs: Record<string, IntegrationConfig> = {};
  for (const name of integrationNames) {
    configs[name] = { ...emptyIntegrationConfig };
  }

  if (isPlainRecord(value)) {
    for (const name of integrationNames) {
      if (isPlainRecord(value[name])) {
        configs[name] = normalizeIntegrationConfig(value[name]);
      }
    }
  }

  return configs;
}

function normalizeRolePermissions(
  value: unknown
): Record<string, Record<string, boolean>> {
  const result = structuredClone(defaultRolePermissions);
  if (!isPlainRecord(value)) return result;

  for (const [role, defaults] of Object.entries(defaultRolePermissions)) {
    const storedRolePermissions = value[role];
    if (!isPlainRecord(storedRolePermissions)) continue;
    const rolePerms: Record<string, boolean> = {};
    for (const permission of Object.keys(defaults)) {
      const storedPermission = storedRolePermissions[permission];
      rolePerms[permission] =
        typeof storedPermission === "boolean"
          ? storedPermission
          : (defaults[permission] ?? false);
    }
    result[role] = rolePerms;
  }
  return result;
}

function mergeSettings(stored: unknown): SettingsState {
  const r = isPlainRecord(stored) ? stored : {};
  const projectTags = stringListSetting(
    r.projectTags,
    defaultSettings.projectTags
  );
  const storedSalaryWorkType =
    typeof r.salaryWorkType === "string" ? r.salaryWorkType.trim() : "";
  const salaryWorkType =
    projectTags.find(
      (tag) => tag.toLowerCase() === storedSalaryWorkType.toLowerCase()
    ) ??
    projectTags.find(
      (tag) =>
        tag.toLowerCase() === defaultSettings.salaryWorkType.toLowerCase()
    ) ??
    projectTags[0];
  return {
    ...defaultSettings,
    studioName: stringSetting(r.studioName, defaultSettings.studioName),
    profileName: stringSetting(r.profileName, defaultSettings.profileName),
    profileUsername: stringSetting(
      r.profileUsername,
      defaultSettings.profileUsername
    ),
    profileTitle: stringSetting(r.profileTitle, defaultSettings.profileTitle),
    profileBio: stringSetting(r.profileBio, defaultSettings.profileBio),
    profileLocation: stringSetting(
      r.profileLocation,
      defaultSettings.profileLocation
    ),
    profileImageUrl:
      typeof r.profileImageUrl === "string"
        ? r.profileImageUrl.trim()
        : defaultSettings.profileImageUrl,
    publicActiveProjects: Math.max(
      0,
      Math.floor(
        Number(r.publicActiveProjects ?? defaultSettings.publicActiveProjects)
      )
    ),
    publicDeliveredEdits: Math.max(
      0,
      Math.floor(
        Number(r.publicDeliveredEdits ?? defaultSettings.publicDeliveredEdits)
      )
    ),
    publicTurnaroundDays: positiveIntegerSetting(
      r.publicTurnaroundDays,
      defaultSettings.publicTurnaroundDays
    ),
    timeZone: optionSetting(
      r.timeZone,
      ["UTC", "Pacific Time", "Eastern Time", "Asia/Dubai"],
      defaultSettings.timeZone
    ),
    dateFormat: optionSetting(
      r.dateFormat,
      ["Month Day, Year", "Day Month Year", "YYYY-MM-DD"],
      defaultSettings.dateFormat
    ),
    weekStart: optionSetting(
      r.weekStart,
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      defaultSettings.weekStart
    ),
    currencyCode: optionSetting(
      r.currencyCode,
      ["USD", "EUR", "GBP", "INR", "AED", "SAR"],
      defaultSettings.currencyCode
    ),
    customClients: stringListSetting(
      r.customClients,
      defaultSettings.customClients
    ),
    clients: normalizeClientRecords(
      r.clients,
      stringListSetting(r.customClients, defaultSettings.customClients)
    ),
    customProjectTemplates: normalizeCustomProjectTemplates(
      r.customProjectTemplates
    ),
    projectTags,
    salaryWorkType,
    salaryBatchSize: positiveIntegerSetting(
      r.salaryBatchSize,
      defaultSettings.salaryBatchSize
    ),
    salaryBatchAmount: positiveMoneySetting(
      r.salaryBatchAmount,
      defaultSettings.salaryBatchAmount
    ),
    teamRole: optionSetting(
      r.teamRole,
      settingsTeamRoleOptions,
      defaultSettings.teamRole
    ),
    theme: optionSetting(
      r.theme,
      ["Light", "Dark", "System"],
      defaultSettings.theme
    ),
    accentColor: colorSetting(r.accentColor, defaultSettings.accentColor),
    projectStages: Array.isArray(r.projectStages)
      ? r.projectStages.flatMap((s): string[] =>
          typeof s === "string" && s.trim() ? [s.trim()] : []
        )
      : defaultSettings.projectStages,
    teamMembers: Array.isArray(r.teamMembers)
      ? r.teamMembers.flatMap((m: unknown): TeamMember[] => {
          if (!isPlainRecord(m) || typeof m.name !== "string" || !m.name.trim())
            return [];
          return [
            {
              id:
                typeof m.id === "string" && m.id.trim()
                  ? m.id
                  : `member-${m.name.trim().toLowerCase().replace(/\s+/g, "-")}`,
              name: m.name.trim(),
              role: optionSetting(m.role, teamRoleOptions, "Editor"),
              email: typeof m.email === "string" ? m.email.trim() : "",
            },
          ];
        })
      : defaultSettings.teamMembers,
    notifications: booleanRecordSetting(
      r.notifications,
      defaultSettings.notifications
    ),
    integrationConfigs: normalizeIntegrationConfigs(r.integrationConfigs),
    integrationLinks: normalizeIntegrationLinks(r.integrationLinks),
    rolePermissions: normalizeRolePermissions(r.rolePermissions),
  };
}

function readInitialSettings(): SettingsState {
  if (typeof window === "undefined") return freshDefaultSettings();
  const stored = readJson(SETTINGS_STORAGE_KEY, {});
  if (isLegacyDemoSettings(stored)) {
    removeKey(SETTINGS_STORAGE_KEY);
    return freshDefaultSettings();
  }
  return mergeSettings(stored);
}

function readInitialItems(): WorkItem[] {
  if (typeof window === "undefined") return [];
  const stored = readJson(STORAGE_KEY, []);
  const storedItems = Array.isArray(stored) ? stored : [];
  return normalizeWorkItems(storedItems);
}

function normalizeSalaryPlans(value: unknown): SalaryPlan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): SalaryPlan[] => {
    if (
      !isPlainRecord(candidate) ||
      typeof candidate._id !== "string" ||
      typeof candidate.clientId !== "string"
    )
      return [];
    const requiredProjectCount = Number(candidate.requiredProjectCount);
    const amount = Number(candidate.amount);
    if (
      !Number.isInteger(requiredProjectCount) ||
      requiredProjectCount < 1 ||
      !Number.isFinite(amount) ||
      amount < 0
    )
      return [];
    return [
      {
        id: candidate._id,
        clientId: candidate.clientId,
        requiredProjectCount,
        amount,
        startDate:
          typeof candidate.startDate === "string" ? candidate.startDate : "",
        notes: typeof candidate.notes === "string" ? candidate.notes : "",
        archived: candidate.archived === true,
        createdAt:
          typeof candidate.createdAt === "string"
            ? candidate.createdAt
            : undefined,
        updatedAt:
          typeof candidate.updatedAt === "string"
            ? candidate.updatedAt
            : undefined,
      },
    ];
  });
}

function normalizeProjectSalaryBatches(value: unknown): SalaryBatch[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((batch): SalaryBatch[] => {
    if (
      !isPlainRecord(batch) ||
      typeof batch.id !== "string" ||
      typeof batch.number !== "number" ||
      typeof batch.completedAt !== "string"
    )
      return [];
    return [
      {
        id: batch.id,
        number: batch.number,
        completedDate: batch.completedAt.slice(0, 10),
        archived: false,
        archivedDate: "",
        amount: typeof batch.amount === "number" ? batch.amount : 0,
        paid: batch.paid === true,
        paidDate: typeof batch.paidAt === "string" ? batch.paidAt : "",
        projectIds: Array.isArray(batch.projectIds)
          ? batch.projectIds.flatMap((id): string[] =>
              typeof id === "string" ? [id] : []
            )
          : [],
        requiredProjectCount:
          typeof batch.requiredProjectCount === "number"
            ? batch.requiredProjectCount
            : undefined,
        workType:
          typeof batch.workType === "string" ? batch.workType : undefined,
        salaryPlanId:
          typeof batch.salaryPlanId === "string"
            ? batch.salaryPlanId
            : undefined,
        clientId:
          typeof batch.clientId === "string" ? batch.clientId : undefined,
        clientName:
          typeof batch.clientName === "string" ? batch.clientName : undefined,
        planStartDate:
          typeof batch.planStartDate === "string"
            ? batch.planStartDate
            : undefined,
        planNotes:
          typeof batch.planNotes === "string" ? batch.planNotes : undefined,
        received:
          typeof batch.received === "boolean" ? batch.received : undefined,
        receivedAt:
          typeof batch.receivedAt === "string" ? batch.receivedAt : undefined,
        correctionNote:
          typeof batch.correctionNote === "string"
            ? batch.correctionNote
            : undefined,
      },
    ];
  });
}

function projectSalaryBatchInput(batch: SalaryBatch) {
  if (
    !batch.projectIds?.length ||
    !batch.requiredProjectCount ||
    !batch.workType
  )
    throw new Error("Salary Batch snapshot is incomplete");
  return {
    id: batch.id,
    number: batch.number,
    workType: batch.workType,
    requiredProjectCount: batch.requiredProjectCount,
    amount: batch.amount ?? 0,
    projectIds: batch.projectIds,
    completedAt: `${batch.completedDate}T00:00:00.000Z`,
    paid: batch.paid ?? false,
    paidAt: batch.paidDate || undefined,
  };
}

function recoverLegacySalaryBatches(
  batches: SalaryBatch[],
  projects: WorkItem[],
  settings: SettingsState
) {
  const linkedProjectIds = new Set(
    batches.flatMap((batch) => batch.projectIds ?? [])
  );
  const availableProjects = projects
    .filter(
      (project) =>
        isSalaryWorkType(project.workType, settings) &&
        isDoneStatus(project.status) &&
        !linkedProjectIds.has(project.id)
    )
    .sort(
      (left, right) =>
        left.dueDate.localeCompare(right.dueDate) ||
        left.id.localeCompare(right.id)
    );
  let offset = 0;

  return batches.map((batch) => {
    if (batch.projectIds?.length) return batch;
    const requiredProjectCount =
      batch.requiredProjectCount ??
      normalizedSalaryBatchSize(settings.salaryBatchSize);
    const projectIds = availableProjects
      .slice(offset, offset + requiredProjectCount)
      .map((project) => project.id);
    if (projectIds.length !== requiredProjectCount) {
      throw new Error(
        `Salary Batch ${batch.number} cannot be linked to enough delivered Projects.`
      );
    }
    offset += requiredProjectCount;
    return {
      ...batch,
      projectIds,
      requiredProjectCount,
      workType: batch.workType ?? settings.salaryWorkType,
    };
  });
}

function readInitialProjectGroups(
  clients: readonly import("./types").Client[]
): ProjectGroup[] {
  if (typeof window === "undefined") return [];
  return normalizeProjectGroups(
    readJson(PROJECT_GROUPS_STORAGE_KEY, []),
    clients
  );
}

function normalizeWorkItems(items: unknown[]): WorkItem[] {
  return items.flatMap((item) => {
    const normalized = normalizeStoredItem(item);
    return normalized ? [normalized] : [];
  });
}

function normalizeResourceLink(value: unknown): ResourceLink | null {
  if (!isPlainRecord(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : "";
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim()
      : "";
  const url =
    typeof value.url === "string" && value.url.trim() ? value.url.trim() : "";
  if (!id || !title || !url) return null;
  const now = new Date().toISOString();
  return {
    id,
    title,
    url,
    category:
      typeof value.category === "string" && value.category.trim()
        ? value.category.trim()
        : "Other",
    projectId:
      typeof value.projectId === "string" ? value.projectId.trim() : "",
    notes: typeof value.notes === "string" ? value.notes : "",
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : now,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt
        ? value.updatedAt
        : now,
  };
}

function normalizeResourceLinks(value: unknown): ResourceLink[] {
  const resources = Array.isArray(value) ? value : [];
  return resources.flatMap((resource) => {
    const normalized = normalizeResourceLink(resource);
    return normalized ? [normalized] : [];
  });
}

function mergeResourceLinks(...groups: ResourceLink[][]): ResourceLink[] {
  const seen = new Set<string>();
  const merged: ResourceLink[] = [];
  for (const resource of groups.flat()) {
    const key = resource.id || resource.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(resource);
  }
  return merged;
}

function readInitialResources(): ResourceLink[] {
  if (typeof window === "undefined") return [];
  return normalizeResourceLinks(readJson(RESOURCES_STORAGE_KEY, []));
}

function localDeliveryEffect(
  project: WorkItem,
  items: WorkItem[],
  batches: SalaryBatch[],
  settings: SettingsState
) {
  if (project.teamId || project.workType !== settings.salaryWorkType) {
    return {
      result: { kind: "client" as const, earned: project.earnings },
      projectIds: [],
    };
  }
  const requiredProjectCount = normalizedSalaryBatchSize(
    settings.salaryBatchSize
  );
  const settledIds = new Set(
    batches.flatMap((batch) => batch.projectIds ?? [])
  );
  const contributors = items
    .filter(
      (item) =>
        !item.teamId &&
        item.workType === settings.salaryWorkType &&
        (item.id === project.id || isDoneStatus(item.status)) &&
        !settledIds.has(item.id)
    )
    .sort((left, right) =>
      (left.completedAt ?? left.createdAt ?? "").localeCompare(
        right.completedAt ?? right.createdAt ?? ""
      )
    )
    .slice(0, requiredProjectCount);
  const batchCreated = contributors.length === requiredProjectCount;
  return {
    result: {
      kind: "salary" as const,
      progress: batchCreated ? 0 : contributors.length,
      requiredProjectCount,
      amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
      batchCreated,
    },
    projectIds: contributors.map((item) => item.id),
  };
}

function readObjectString(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const candidate = hasProperty(value, key) ? value[key] : undefined;
  return typeof candidate === "string" ? candidate : "";
}

function readFirstObjectString(value: unknown, keys: string[]) {
  for (const key of keys) {
    const candidate = readObjectString(value, key).trim();
    if (candidate) return candidate;
  }
  return "";
}

function isGitHubExternalAccount(value: unknown) {
  const providerText = [
    readObjectString(value, "provider"),
    readObjectString(value, "providerId"),
    readObjectString(value, "strategy"),
  ]
    .join(" ")
    .toLowerCase();
  return providerText.includes("github");
}

function deriveAuthProfile(user: ReturnType<typeof useUser>["user"]) {
  if (!user) {
    return { profileName: "", profileUsername: "", profileImageUrl: "" };
  }

  const externalAccountsRaw = hasProperty(user, "externalAccounts")
    ? user.externalAccounts
    : undefined;
  const externalAccounts = Array.isArray(externalAccountsRaw)
    ? externalAccountsRaw
    : [];
  const githubAccount = externalAccounts.find(isGitHubExternalAccount);

  const profileName =
    readFirstObjectString(githubAccount, ["name", "fullName", "displayName"]) ||
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username?.trim() ||
    "";
  const profileUsername =
    readFirstObjectString(githubAccount, [
      "username",
      "login",
      "screenName",
      "externalId",
      "providerUserId",
    ]) ||
    user.username?.trim() ||
    "";
  const profileImageUrl =
    readFirstObjectString(githubAccount, [
      "imageUrl",
      "avatarUrl",
      "picture",
      "profileImageUrl",
    ]) ||
    user.imageUrl?.trim() ||
    "";

  return { profileName, profileUsername, profileImageUrl };
}

function shouldUseAuthProfileValue(
  field: keyof Pick<
    SettingsState,
    "profileName" | "profileUsername" | "profileImageUrl"
  >,
  current: string,
  authValue: string
) {
  const trimmed = current.trim();
  const legacyValue =
    field === "profileImageUrl" ? "" : LEGACY_DEMO_SETTINGS[field];
  if (!authValue.trim()) return false;
  if (!trimmed) return true;
  if (trimmed === defaultSettings[field]) return true;
  if (legacyValue && trimmed === legacyValue) return true;
  return false;
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(window.atob(padded));
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function diagnoseConvexAuthToken(getToken: ClerkGetToken) {
  try {
    const token = await getToken({ template: "convex", skipCache: true });
    if (!token) {
      return "Clerk is not returning a Convex JWT. Create a Clerk JWT template named convex, then sign out and back in.";
    }

    const claims = decodeJwtPayload(token);
    const audience = typeof claims?.aud === "string" ? claims.aud : "";
    const issuer = typeof claims?.iss === "string" ? claims.iss : "";

    if (audience && audience !== "convex") {
      return `Clerk Convex JWT has audience ${audience}, expected convex. Fix the Clerk JWT template audience.`;
    }

    if (!issuer) {
      return "Clerk returned a Convex JWT, but it has no issuer claim. Check the Clerk JWT template.";
    }

    return `Clerk returned a Convex JWT, but Convex rejected it. Set CLERK_JWT_ISSUER_DOMAIN in Convex to ${issuer}.`;
  } catch {
    return "Clerk could not create a Convex JWT. Check that the Clerk JWT template named convex exists.";
  }
}

interface DataContextValue {
  items: WorkItem[];
  setItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  settings: SettingsState;
  settingsSaveState: SettingsSaveState;
  retrySettingsSave: () => void;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  resourceLinks: ResourceLink[];
  setResourceLinks: React.Dispatch<React.SetStateAction<ResourceLink[]>>;
  salaryBatches: SalaryBatch[];
  salaryPlans: SalaryPlan[];
  reconcileSalaryBatches: (items: WorkItem[]) => void;
  updateSalaryBatchPayment: (batchId: string, paid: boolean) => void;
  exportBackup: () => string;
  importBackup: (source: string) => Promise<{
    projects: number;
    clients: number;
    projectGroups: number;
    resources: number;
    salaryBatches: number;
  }>;
  isAuthEnabled: boolean;
  isSignedIn: boolean;
  isAuthLoaded: boolean;
  toast: ToastState | null;
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>;
}

const DataContext = createContext<DataContextValue | null>(null);
const ProjectWorkflowContext = createContext<ProjectWorkflowPort | null>(null);

type ProjectGroupsContextValue = {
  groups: ProjectGroup[];
  saveGroup: (group: ProjectGroup) => void;
  setGroupArchived: (groupId: string, archived: boolean) => void;
};

const ProjectGroupsContext = createContext<ProjectGroupsContextValue | null>(
  null
);

export function DataProvider({
  children,
  mode = "local",
  authEnabled = false,
}: {
  children: React.ReactNode;
  mode?: "local" | "cloud" | "sample";
  authEnabled?: boolean;
}) {
  if (mode === "cloud") {
    return <CloudDataProvider>{children}</CloudDataProvider>;
  }
  if (mode === "sample") {
    return <SampleDataProvider>{children}</SampleDataProvider>;
  }
  return (
    <LocalDataProvider authEnabled={authEnabled}>{children}</LocalDataProvider>
  );
}

function SampleDataProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const immutableItems = useCallback<
    React.Dispatch<React.SetStateAction<WorkItem[]>>
  >(() => {
    setToast({
      message:
        "The sample studio is read-only. Start your workspace to make changes.",
      tone: "info",
    });
  }, []);
  const immutableSettings = useCallback<
    React.Dispatch<React.SetStateAction<SettingsState>>
  >(() => undefined, []);
  const immutableResources = useCallback<
    React.Dispatch<React.SetStateAction<ResourceLink[]>>
  >(() => undefined, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value: DataContextValue = {
    items: sampleStudioProjects,
    setItems: immutableItems,
    settings: sampleStudioSettings,
    settingsSaveState: "local",
    retrySettingsSave: () => undefined,
    setSettings: immutableSettings,
    resourceLinks: sampleStudioResources,
    setResourceLinks: immutableResources,
    salaryBatches: [],
    salaryPlans: [],
    reconcileSalaryBatches: () => undefined,
    updateSalaryBatchPayment: () =>
      setToast({
        message: "Payment state is fixed in the read-only sample.",
        tone: "info",
      }),
    exportBackup: () =>
      createWorkspaceBackup({
        projects: sampleStudioProjects,
        clients: sampleStudioSettings.clients,
        projectGroups: [],
        resources: sampleStudioResources,
        salaryBatches: [],
        settings: { ...sampleStudioSettings },
      }),
    importBackup: async () => {
      throw new Error("The sample workspace is read-only.");
    },
    isAuthEnabled: false,
    isSignedIn: false,
    isAuthLoaded: true,
    toast,
    setToast,
  };

  return (
    <ProjectWorkflowContext.Provider
      value={{
        previewStage: async () => ({ kind: "none" }),
        transitionStage: async () => ({ kind: "none" }),
      }}
    >
      <ProjectGroupsContext.Provider
        value={{
          groups: [],
          saveGroup: () => undefined,
          setGroupArchived: () => undefined,
        }}
      >
        <DataContext.Provider value={value}>{children}</DataContext.Provider>
      </ProjectGroupsContext.Provider>
    </ProjectWorkflowContext.Provider>
  );
}

function LocalDataProvider({
  children,
  authEnabled,
}: {
  children: React.ReactNode;
  authEnabled: boolean;
}) {
  const { isLoaded, isSignedIn } = useOptionalAuth();
  const [items, setItemsState] = useState<WorkItem[]>([]);
  const [projectGroups, setProjectGroupsState] = useState<ProjectGroup[]>([]);
  const [settings, setSettingsState] = useState<SettingsState>(() =>
    freshDefaultSettings()
  );
  const [resourceLinks, setResourceLinksState] = useState<ResourceLink[]>([]);
  const [salaryBatches, setSalaryBatches] = useState<SalaryBatch[]>([]);
  const [salaryPlans] = useState<SalaryPlan[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setItemsState(readInitialItems());
    const nextSettings = readInitialSettings();
    setSettingsState(nextSettings);
    setProjectGroupsState(readInitialProjectGroups(nextSettings.clients));
    setResourceLinksState(readInitialResources());
    setSalaryBatches(
      normalizeSalaryState(readJson(SALARY_STORAGE_KEY, { batches: [] }))
        .batches
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const setItems = useCallback((updater: React.SetStateAction<WorkItem[]>) => {
    setItemsState((prev: WorkItem[]) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setSettings = useCallback(
    (updater: React.SetStateAction<SettingsState>) => {
      setSettingsState((prev: SettingsState) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeJson(SETTINGS_STORAGE_KEY, omitLegacySettings(next));
        return next;
      });
    },
    []
  );

  const setResourceLinks = useCallback(
    (updater: React.SetStateAction<ResourceLink[]>) => {
      setResourceLinksState((prev: ResourceLink[]) => {
        const next = normalizeResourceLinks(
          typeof updater === "function" ? updater(prev) : updater
        );
        writeJson(RESOURCES_STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  const reconcileSalaryBatches = useCallback(
    (projects: WorkItem[]) => {
      setSalaryBatches((prev: SalaryBatch[]) => {
        const requiredProjectCount = normalizedSalaryBatchSize(
          settings.salaryBatchSize
        );
        const settledProjectIds = new Set(
          prev.flatMap((batch) => batch.projectIds ?? [])
        );
        const unsettledProjects = projects
          .filter(
            (item) =>
              isSalaryWorkType(item.workType, settings) &&
              isDoneStatus(item.status) &&
              !settledProjectIds.has(item.id)
          )
          .sort(
            (a, b) =>
              a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)
          );
        const completedBatchCount = Math.floor(
          unsettledProjects.length / requiredProjectCount
        );
        if (!completedBatchCount) return prev;
        const next = [...prev];
        for (
          let batchIndex = 0;
          batchIndex < completedBatchCount;
          batchIndex += 1
        ) {
          const n = next.length + 1;
          next.push({
            id: `batch-${n}`,
            number: n,
            completedDate: iso(todayDate()),
            archived: false,
            archivedDate: "",
            amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
            paid: false,
            paidDate: "",
            projectIds: unsettledProjects
              .slice(
                batchIndex * requiredProjectCount,
                (batchIndex + 1) * requiredProjectCount
              )
              .map((project) => project.id),
            requiredProjectCount,
            workType: settings.salaryWorkType,
          });
        }
        writeJson(SALARY_STORAGE_KEY, { batches: next });
        return next;
      });
    },
    [settings]
  );

  const updateSalaryBatchPayment = useCallback(
    (batchId: string, paid: boolean) => {
      setSalaryBatches((prev) => {
        const next = prev.map((batch) =>
          batch.id === batchId
            ? { ...batch, paid, paidDate: paid ? iso(todayDate()) : "" }
            : batch
        );
        writeJson(SALARY_STORAGE_KEY, { batches: next });
        return next;
      });
    },
    []
  );

  const previewProjectStage = useCallback(
    async (input: {
      projectId: string;
      stageId: string;
    }): Promise<ProjectStageTransitionResult> => {
      const project = items.find((item) => item.id === input.projectId);
      if (!project) throw new Error("Project not found");
      return getWorkflowStageStatus(project, input.stageId) === "Delivered"
        ? localDeliveryEffect(project, items, salaryBatches, settings).result
        : { kind: "none" };
    },
    [items, salaryBatches, settings]
  );

  const transitionProjectStage = useCallback(
    async (input: {
      projectId: string;
      stageId: string;
    }): Promise<ProjectStageTransitionResult> => {
      const project = items.find((item) => item.id === input.projectId);
      if (!project) throw new Error("Project not found");
      const stageId = resolveProjectWorkflowStage(project, input.stageId);
      const status = getWorkflowStageStatus(project, stageId);
      const changedAt = new Date().toISOString();
      const completedAt =
        status === "Delivered"
          ? project.status === "Delivered"
            ? (project.completedAt ?? changedAt)
            : changedAt
          : undefined;
      const nextItems = items.map((item) =>
        item.id === input.projectId
          ? moveProjectToStage(item, stageId, changedAt)
          : item
      );
      let nextBatches = salaryBatches;
      let result: ProjectStageTransitionResult = { kind: "none", completedAt };
      if (status === "Delivered") {
        const effect = localDeliveryEffect(
          project,
          nextItems,
          salaryBatches,
          settings
        );
        if (effect.result.kind === "client") {
          result = { ...effect.result, completedAt };
        } else {
          if (effect.result.batchCreated) {
            const number =
              salaryBatches.reduce(
                (highest, batch) => Math.max(highest, batch.number),
                0
              ) + 1;
            nextBatches = [
              ...salaryBatches,
              {
                id: `batch-${number}`,
                number,
                completedDate: changedAt.slice(0, 10),
                archived: false,
                archivedDate: "",
                amount: effect.result.amount,
                paid: false,
                paidDate: "",
                projectIds: effect.projectIds,
                requiredProjectCount: effect.result.requiredProjectCount,
                workType: project.workType,
              },
            ];
          }
          result = { ...effect.result, completedAt };
        }
      }
      setItemsState(nextItems);
      setSalaryBatches(nextBatches);
      writeJson(STORAGE_KEY, nextItems);
      if (nextBatches !== salaryBatches)
        writeJson(SALARY_STORAGE_KEY, { batches: nextBatches });
      return result;
    },
    [items, salaryBatches, settings]
  );

  const setProjectGroups = useCallback(
    (updater: React.SetStateAction<ProjectGroup[]>) => {
      setProjectGroupsState((previous) => {
        const next = normalizeProjectGroups(
          typeof updater === "function" ? updater(previous) : updater,
          settings.clients
        );
        writeJson(PROJECT_GROUPS_STORAGE_KEY, next);
        return next;
      });
    },
    [settings.clients]
  );

  const exportBackup = useCallback(
    () =>
      createWorkspaceBackup({
        projects: items,
        clients: settings.clients,
        projectGroups,
        resources: resourceLinks,
        salaryBatches,
        settings: { ...settings },
      }),
    [items, projectGroups, resourceLinks, salaryBatches, settings]
  );
  const importBackup = useCallback(async (source: string) => {
    const backup = parseWorkspaceBackup(source);
    const nextItems = normalizeWorkItems(backup.projects);
    const nextSettings = mergeSettings({
      ...backup.settings,
      clients: normalizeClientRecords(backup.clients),
    });
    const nextProjectGroups = normalizeProjectGroups(
      backup.projectGroups,
      nextSettings.clients
    );
    const nextResources = normalizeResourceLinks(backup.resources);
    const nextBatches = normalizeSalaryState({
      batches: backup.salaryBatches,
    }).batches;
    setItemsState(nextItems);
    setSettingsState(nextSettings);
    setProjectGroupsState(nextProjectGroups);
    setResourceLinksState(nextResources);
    setSalaryBatches(nextBatches);
    writeJson(STORAGE_KEY, nextItems);
    writeJson(SETTINGS_STORAGE_KEY, omitLegacySettings(nextSettings));
    writeJson(PROJECT_GROUPS_STORAGE_KEY, nextProjectGroups);
    writeJson(RESOURCES_STORAGE_KEY, nextResources);
    writeJson(SALARY_STORAGE_KEY, { batches: nextBatches });
    return {
      projects: nextItems.length,
      clients: nextSettings.clients.length,
      projectGroups: nextProjectGroups.length,
      resources: nextResources.length,
      salaryBatches: nextBatches.length,
    };
  }, []);

  const resolvedItems = useMemo(
    () =>
      items.map((project) => ({
        ...project,
        client: projectClientName(project, settings.clients),
      })),
    [items, settings.clients]
  );
  const value: DataContextValue = {
    items: resolvedItems,
    setItems,
    settings,
    settingsSaveState: "local",
    retrySettingsSave: () => undefined,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    salaryPlans,
    reconcileSalaryBatches,
    updateSalaryBatchPayment,
    exportBackup,
    importBackup,
    isAuthEnabled: authEnabled,
    isSignedIn: authEnabled && Boolean(isSignedIn),
    isAuthLoaded: authEnabled ? isLoaded : true,
    toast,
    setToast,
  };

  return (
    <ProjectWorkflowContext.Provider
      value={{
        previewStage: previewProjectStage,
        transitionStage: transitionProjectStage,
      }}
    >
      <ProjectGroupsContext.Provider
        value={{
          groups: projectGroups,
          saveGroup: (group) =>
            setProjectGroups((current) =>
              current.some((item) => item.id === group.id)
                ? current.map((item) => (item.id === group.id ? group : item))
                : [group, ...current]
            ),
          setGroupArchived: (groupId, archived) =>
            setProjectGroups((current) =>
              current.map((group) =>
                group.id === groupId ? { ...group, archived } : group
              )
            ),
        }}
      >
        <DataContext.Provider value={value}>{children}</DataContext.Provider>
      </ProjectGroupsContext.Provider>
    </ProjectWorkflowContext.Provider>
  );
}

function CloudDataProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const { isSignedIn, user, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const [items, setItemsState] = useState<WorkItem[]>([]);
  const [projectGroups, setProjectGroupsState] = useState<ProjectGroup[]>([]);
  const [settings, setSettingsState] = useState<SettingsState>(() =>
    freshDefaultSettings()
  );
  const [resourceLinks, setResourceLinksState] = useState<ResourceLink[]>([]);
  const [salaryBatches, setSalaryBatches] = useState<SalaryBatch[]>([]);
  const [salaryPlans, setSalaryPlans] = useState<SalaryPlan[]>([]);
  const [ready, setReady] = useState(false);
  const [cloudInitialized, setCloudInitialized] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const initializationToken = useRef(0);
  const authMode = isSignedIn ? `signed-in:${user?.id ?? "loading"}` : "guest";
  const previousAuthMode = useRef(authMode);

  // Always call hooks — Convex handles unauthenticated state gracefully
  const { projects: convexItems, batches: convexProjectBatches } =
    useWorkspaceProjectData(convexAuthenticated);
  const convexProjectGroups = useQuery(api.projectGroups.list, {});
  const convexSettings = useQuery(api.settings.get, {});

  const convexSalaryPlans = useQuery(api.salaryPlans.list, {});
  const convexResources = useQuery(api.resourceLinks.list, {});
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const setProjectPayment = useMutation(api.projects.setPayment);
  const setProjectArchived = useMutation(api.projects.setArchived);
  const upsertProjectGroup = useMutation(api.projectGroups.upsert);
  const deleteProject = useMutation(api.projects.remove);
  const upsertSettings = useMutation(api.settings.upsert);
  const patchSettings = useMutation(api.settings.patch);
  const [settingsSaveState, setSettingsSaveState] =
    useState<SettingsSaveState>("saved");
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pendingSettings = useRef<Array<ReturnType<typeof settingsPatch>>>([]);
  const savingSettings = useRef(false);
  const retrySettingsSave = useCallback(async () => {
    if (savingSettings.current || !pendingSettings.current.length) return;
    const edits = pendingSettings.current;
    savingSettings.current = true;
    setSettingsSaveState("saving");
    try {
      while (edits === pendingSettings.current && edits.length) {
        await patchSettings(edits[0]);
        edits.shift();
      }
      if (edits !== pendingSettings.current) return;
      setSettingsSaveState("saved");
      removeKey(SETTINGS_STORAGE_KEY);
    } catch {
      if (edits !== pendingSettings.current) return;
      setSettingsSaveState("error");
      writeJson(SETTINGS_STORAGE_KEY, omitLegacySettings(settingsRef.current));
    } finally {
      if (edits === pendingSettings.current) savingSettings.current = false;
    }
  }, [patchSettings]);

  const setProjectSalaryBatchPaid = useMutation(
    api.projects.setSalaryBatchPaid
  );
  const importProjectSalaryBatches = useMutation(
    api.projects.importSalaryBatches
  );
  const transitionCloudProjectStage = useMutation(api.projects.transitionStage);
  const replaceAllResources = useMutation(api.resourceLinks.replaceAll);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (previousAuthMode.current === authMode) return;
    previousAuthMode.current = authMode;
    pendingSettings.current = [];
    savingSettings.current = false;
    setSettingsSaveState("saved");
    initializationToken.current += 1;
    setReady(false);
    setCloudInitialized(false);
  }, [authMode, clerkLoaded]);

  // Guest mode: load from localStorage
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;

    const stored = readInitialItems();
    const nextSettings = readInitialSettings();
    setItemsState(stored);
    setSettingsState(nextSettings);
    setProjectGroupsState(readInitialProjectGroups(nextSettings.clients));
    setResourceLinksState(readInitialResources());

    const salState = normalizeSalaryState(
      readJson(SALARY_STORAGE_KEY, { batches: [] })
    );
    setSalaryBatches(salState.batches);
    setReady(true);
  }, [clerkLoaded, isSignedIn]);

  // Signed-in mode: initialise from Convex, migrate if needed
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    if (convexAuthLoading) return;

    if (!convexAuthenticated) {
      if (ready) return;
      const nextSettings = readInitialSettings();
      setItemsState(readInitialItems());
      setSettingsState(nextSettings);
      setProjectGroupsState(readInitialProjectGroups(nextSettings.clients));
      setResourceLinksState(readInitialResources());
      setSalaryBatches(
        normalizeSalaryState(readJson(SALARY_STORAGE_KEY, { batches: [] }))
          .batches
      );
      setSalaryPlans([]);
      let cancelled = false;
      void diagnoseConvexAuthToken(getToken).then((message) => {
        if (!cancelled) setToast({ tone: "warning", message });
      });
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    if (
      convexItems === undefined ||
      convexProjectGroups === undefined ||
      convexSettings === undefined ||
      convexProjectBatches === undefined ||
      convexSalaryPlans === undefined ||
      convexResources === undefined
    )
      return;
    if (cloudInitialized) return;

    const loadedItems = normalizeWorkItems(convexItems);
    const loadedSettings = convexSettings;
    const normalizedLoadedSettings = loadedSettings
      ? mergeSettings(loadedSettings)
      : readInitialSettings();
    const loadedProjectGroups = normalizeProjectGroups(
      convexProjectGroups,
      normalizedLoadedSettings.clients
    );
    const loadedBatches = normalizeProjectSalaryBatches(convexProjectBatches);
    const loadedSalaryPlans = normalizeSalaryPlans(convexSalaryPlans);
    const loadedResources = normalizeResourceLinks(convexResources);
    let cancelled = false;
    const token = initializationToken.current + 1;
    initializationToken.current = token;

    async function initializeCloudData() {
      const localItems = readInitialItems();
      const localSettings = readJson(SETTINGS_STORAGE_KEY, {});
      const localBatches = normalizeSalaryState(
        readJson(SALARY_STORAGE_KEY, { batches: [] })
      );
      const localResources = readInitialResources();
      const mergedLocalSettings =
        isPlainRecord(localSettings) && Object.keys(localSettings).length > 0
          ? mergeSettings(localSettings)
          : readInitialSettings();
      const localProjectGroups = readInitialProjectGroups(
        mergedLocalSettings.clients
      );
      let nextItems: WorkItem[] = loadedItems;
      let nextSettings = loadedSettings
        ? mergeSettings(loadedSettings)
        : mergedLocalSettings;
      let nextProjectGroups = loadedProjectGroups;
      let nextBatches: SalaryBatch[] = loadedBatches;
      let nextResources: ResourceLink[] = mergeResourceLinks(
        loadedResources,
        localResources
      );
      let syncFailed = false;

      if (!loadedSettings) {
        try {
          await upsertSettings(cloudSettingsInput(mergedLocalSettings));
          removeKey(SETTINGS_STORAGE_KEY);
          nextSettings = mergedLocalSettings;
        } catch {
          syncFailed = true;
          nextSettings = mergedLocalSettings;
        }
      }

      if (loadedProjectGroups.length === 0 && localProjectGroups.length > 0) {
        try {
          await Promise.all(
            localProjectGroups.map((group) => upsertProjectGroup({ group }))
          );
          removeKey(PROJECT_GROUPS_STORAGE_KEY);
          nextProjectGroups = localProjectGroups;
        } catch {
          syncFailed = true;
          nextProjectGroups = localProjectGroups;
        }
      }

      if (loadedItems.length === 0 && localItems.length > 0) {
        try {
          await Promise.all(
            localItems.map((project) =>
              createProject({
                project: cloudProjectInput(
                  project,
                  mergedLocalSettings.clients,
                  loadedSalaryPlans
                ),
              })
            )
          );
          removeKey(STORAGE_KEY);
          nextItems = localItems;
        } catch {
          syncFailed = true;
          nextItems = localItems;
        }
      }

      if (loadedBatches.length === 0 && localBatches.batches.length > 0) {
        try {
          const recoveredBatches = recoverLegacySalaryBatches(
            localBatches.batches,
            nextItems,
            nextSettings
          );
          await importProjectSalaryBatches({
            batches: recoveredBatches.map(projectSalaryBatchInput),
          });
          removeKey(SALARY_STORAGE_KEY);
          nextBatches = recoveredBatches;
        } catch {
          syncFailed = true;
          nextBatches = localBatches.batches;
        }
      }

      if (localResources.length > 0) {
        try {
          await replaceAllResources({ resources: nextResources });
          removeKey(RESOURCES_STORAGE_KEY);
        } catch {
          syncFailed = true;
          nextResources = mergeResourceLinks(localResources, loadedResources);
        }
      }

      if (syncFailed) {
        if (!cancelled) {
          setToast({
            tone: "warning",
            message:
              "Cloud sync is not available. Your data is still saved on this device.",
          });
        }
      }

      if (cancelled || initializationToken.current !== token) return;
      setItemsState(nextItems);
      setSettingsState(nextSettings);
      setProjectGroupsState(nextProjectGroups);
      setResourceLinksState(nextResources);
      setSalaryBatches(nextBatches);
      setSalaryPlans(loadedSalaryPlans);
      setCloudInitialized(true);
      setReady(true);
    }

    void initializeCloudData();
    return () => {
      cancelled = true;
    };
  }, [
    clerkLoaded,
    isSignedIn,
    convexAuthLoading,
    convexAuthenticated,
    cloudInitialized,
    getToken,
    ready,
    convexItems,
    convexProjectGroups,
    convexSettings,
    convexProjectBatches,
    convexSalaryPlans,
    convexResources,
    createProject,
    upsertProjectGroup,
    importProjectSalaryBatches,
    replaceAllResources,
    upsertSettings,
  ]);

  // Keep signed-in workspaces live after the initial cloud load. Team project
  // changes from other members arrive through Convex subscriptions here.
  useEffect(() => {
    if (
      !clerkLoaded ||
      !isSignedIn ||
      !convexAuthenticated ||
      !cloudInitialized ||
      convexItems === undefined ||
      convexProjectGroups === undefined ||
      convexResources === undefined ||
      convexProjectBatches === undefined ||
      convexSalaryPlans === undefined
    )
      return;
    setItemsState(normalizeWorkItems(convexItems));
    setProjectGroupsState(
      normalizeProjectGroups(convexProjectGroups, settings.clients)
    );
    setResourceLinksState(normalizeResourceLinks(convexResources));
    setSalaryBatches(normalizeProjectSalaryBatches(convexProjectBatches));
    setSalaryPlans(normalizeSalaryPlans(convexSalaryPlans));
  }, [
    clerkLoaded,
    cloudInitialized,
    convexAuthenticated,
    convexItems,
    convexProjectBatches,
    convexProjectGroups,
    convexResources,
    convexSalaryPlans,
    isSignedIn,
    settings.clients,
  ]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !user || !ready) return;

    const authProfile = deriveAuthProfile(user);
    if (
      !authProfile.profileName &&
      !authProfile.profileUsername &&
      !authProfile.profileImageUrl
    )
      return;

    const current = settingsRef.current;
    const next: SettingsState = {
      ...current,
      profileName: shouldUseAuthProfileValue(
        "profileName",
        current.profileName,
        authProfile.profileName
      )
        ? authProfile.profileName
        : current.profileName,
      profileUsername: shouldUseAuthProfileValue(
        "profileUsername",
        current.profileUsername,
        authProfile.profileUsername
      )
        ? authProfile.profileUsername
        : current.profileUsername,
      profileImageUrl: shouldUseAuthProfileValue(
        "profileImageUrl",
        current.profileImageUrl,
        authProfile.profileImageUrl
      )
        ? authProfile.profileImageUrl
        : current.profileImageUrl,
    };

    const changed =
      next.profileName !== current.profileName ||
      next.profileUsername !== current.profileUsername ||
      next.profileImageUrl !== current.profileImageUrl;

    if (changed) {
      if (convexAuthenticated) {
        pendingSettings.current.push(settingsPatch(current, next));
        void retrySettingsSave();
      } else {
        writeJson(SETTINGS_STORAGE_KEY, omitLegacySettings(next));
      }
    }

    if (changed) {
      settingsRef.current = next;
      setSettingsState(next);
    }
  }, [
    clerkLoaded,
    convexAuthenticated,
    isSignedIn,
    ready,
    retrySettingsSave,
    user,
  ]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Unified items setter
  const setItems = useCallback(
    (updater: React.SetStateAction<WorkItem[]>) => {
      setItemsState((prev: WorkItem[]) => {
        const next = normalizeWorkItems(
          typeof updater === "function" ? updater(prev) : updater
        );
        if (isSignedIn && convexAuthenticated) {
          const previousById = new Map(prev.map((item) => [item.id, item]));
          const nextIds = new Set(next.map((item) => item.id));
          const newItems = next.filter((item) => !previousById.has(item.id));
          const changedItems = next.filter(
            (item) =>
              previousById.has(item.id) &&
              JSON.stringify(previousById.get(item.id)) !== JSON.stringify(item)
          );
          const removedIds = [
            ...new Set(
              prev
                .filter((item) => !nextIds.has(item.id))
                .map((item) => item.id)
            ),
          ];
          const writes = [
            ...newItems.map((project) =>
              createProject({
                project: cloudProjectInput(
                  project,
                  settings.clients,
                  salaryPlans
                ),
              })
            ),
            ...changedItems.flatMap((project) => {
              const previous = previousById.get(project.id);
              if (!previous) return [];
              return [
                updateProject({
                  projectId: project.id,
                  changes: cloudProjectChanges(project),
                }),
                ...(previous.paid !== project.paid
                  ? [
                      setProjectPayment({
                        projectId: project.id,
                        paid: Boolean(project.paid),
                      }),
                    ]
                  : []),
                ...(previous.archived !== project.archived
                  ? [
                      setProjectArchived({
                        projectId: project.id,
                        archived: project.archived ?? false,
                      }),
                    ]
                  : []),
              ];
            }),
            ...removedIds.map((projectId) => deleteProject({ projectId })),
          ];
          Promise.allSettled(writes)
            .then((results) => {
              const failure = results.find(
                (result): result is PromiseRejectedResult =>
                  result.status === "rejected"
              );
              if (failure) throw failure.reason;
            })
            .catch((error) => {
              if (isProjectAuthorizationError(error)) {
                setItemsState(prev);
                setToast({
                  tone: "warning",
                  message:
                    "Project change was not allowed by your team permissions.",
                });
                return;
              }
              writeJson(STORAGE_KEY, next);
              setToast({
                tone: "warning",
                message:
                  "Cloud sync failed. Projects are saved locally for now.",
              });
            });
        } else {
          writeJson(STORAGE_KEY, next);
        }
        return next;
      });
    },
    [
      convexAuthenticated,
      createProject,
      deleteProject,
      isSignedIn,
      setProjectArchived,
      setProjectPayment,
      salaryPlans,
      settings.clients,
      updateProject,
    ]
  );

  // Keep network effects outside React state updaters. Retries retain only the intended edits.
  const setSettings = useCallback(
    (updater: React.SetStateAction<SettingsState>) => {
      const previous = settingsRef.current;
      const next = typeof updater === "function" ? updater(previous) : updater;
      settingsRef.current = next;
      setSettingsState(next);
      if (isSignedIn && convexAuthenticated) {
        const patch = settingsPatch(previous, next);
        if (Object.keys(patch.changes).length || patch.clients?.length) {
          pendingSettings.current.push(patch);
          void retrySettingsSave();
        }
      } else {
        writeJson(SETTINGS_STORAGE_KEY, omitLegacySettings(next));
        setSettingsSaveState("local");
      }
    },
    [convexAuthenticated, isSignedIn, retrySettingsSave]
  );

  useEffect(() => {
    if (!cloudInitialized || !convexSettings || pendingSettings.current.length)
      return;
    const next = mergeSettings(convexSettings);
    settingsRef.current = next;
    setSettingsState(next);
  }, [cloudInitialized, convexSettings, settingsSaveState]);

  const setResourceLinks = useCallback(
    (updater: React.SetStateAction<ResourceLink[]>) => {
      setResourceLinksState((prev: ResourceLink[]) => {
        const next = normalizeResourceLinks(
          typeof updater === "function" ? updater(prev) : updater
        );
        if (isSignedIn && convexAuthenticated) {
          replaceAllResources({ resources: next }).catch(() => {
            writeJson(RESOURCES_STORAGE_KEY, next);
            setToast({
              tone: "warning",
              message:
                "Cloud sync failed. Resources are saved locally for now.",
            });
          });
        } else {
          writeJson(RESOURCES_STORAGE_KEY, next);
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, replaceAllResources]
  );

  const reconcileSalaryBatches = useCallback(
    (projects: WorkItem[]) => {
      setSalaryBatches((prev: SalaryBatch[]) => {
        const requiredProjectCount = normalizedSalaryBatchSize(
          settings.salaryBatchSize
        );
        const settledProjectIds = new Set(
          prev.flatMap((batch) => batch.projectIds ?? [])
        );
        const unsettledProjects = projects
          .filter(
            (workItem) =>
              isSalaryWorkType(workItem.workType, settings) &&
              isDoneStatus(workItem.status) &&
              !settledProjectIds.has(workItem.id)
          )
          .sort((left, right) =>
            (left.completedAt ?? left.createdAt ?? "").localeCompare(
              right.completedAt ?? right.createdAt ?? ""
            )
          );
        const completedBatchCount = Math.floor(
          unsettledProjects.length / requiredProjectCount
        );
        if (!completedBatchCount) return prev;
        const next = [...prev];
        for (
          let batchIndex = 0;
          batchIndex < completedBatchCount;
          batchIndex += 1
        ) {
          const n = next.length + 1;
          next.push({
            id: `batch-${n}`,
            number: n,
            completedDate: iso(todayDate()),
            archived: false,
            archivedDate: "",
            amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
            paid: false,
            paidDate: "",
            projectIds: unsettledProjects
              .slice(
                batchIndex * requiredProjectCount,
                (batchIndex + 1) * requiredProjectCount
              )
              .map((project) => project.id),
            requiredProjectCount,
            workType: settings.salaryWorkType,
          });
        }
        const normalizedNext = normalizeSalaryState({ batches: next }).batches;
        if (!isSignedIn || !convexAuthenticated) {
          writeJson(SALARY_STORAGE_KEY, { batches: normalizedNext });
        }
        return normalizedNext;
      });
    },
    [convexAuthenticated, isSignedIn, settings]
  );

  const updateSalaryBatchPayment = useCallback(
    (batchId: string, paid: boolean) => {
      setSalaryBatches((prev) => {
        const next = normalizeSalaryState({
          batches: prev.map((batch) =>
            batch.id === batchId
              ? { ...batch, paid, paidDate: paid ? iso(todayDate()) : "" }
              : batch
          ),
        }).batches;
        if (isSignedIn && convexAuthenticated) {
          setProjectSalaryBatchPaid({ batchId, paid }).catch(() => {
            writeJson(SALARY_STORAGE_KEY, { batches: next });
            setToast({
              tone: "warning",
              message:
                "Cloud sync failed. The payout status is saved locally for now.",
            });
          });
        } else {
          writeJson(SALARY_STORAGE_KEY, { batches: next });
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, setProjectSalaryBatchPaid]
  );

  const transitionProjectStage = useCallback(
    (input: { projectId: string; stageId: string }) =>
      transitionCloudProjectStage(input),
    [transitionCloudProjectStage]
  );
  const previewProjectStage = useCallback(
    (input: { projectId: string; stageId: string }) =>
      convex.query(api.projects.previewStage, input),
    [convex]
  );

  const setProjectGroups = useCallback(
    (updater: React.SetStateAction<ProjectGroup[]>) => {
      setProjectGroupsState((previous) => {
        const next = normalizeProjectGroups(
          typeof updater === "function" ? updater(previous) : updater,
          settings.clients
        );
        if (isSignedIn && convexAuthenticated) {
          const previousById = new Map(
            previous.map((group) => [group.id, group])
          );
          const changed = next.filter(
            (group) =>
              JSON.stringify(previousById.get(group.id)) !==
              JSON.stringify(group)
          );
          Promise.all(
            changed.map((group) => upsertProjectGroup({ group }))
          ).catch(() => {
            writeJson(PROJECT_GROUPS_STORAGE_KEY, next);
            setToast({
              tone: "warning",
              message:
                "Cloud sync failed. Project Groups are saved locally for now.",
            });
          });
        } else {
          writeJson(PROJECT_GROUPS_STORAGE_KEY, next);
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, settings.clients, upsertProjectGroup]
  );

  const exportBackup = useCallback(
    () =>
      createWorkspaceBackup({
        projects: items,
        clients: settings.clients,
        projectGroups,
        resources: resourceLinks,
        salaryBatches,
        settings: { ...settings },
      }),
    [items, projectGroups, resourceLinks, salaryBatches, settings]
  );
  const importBackup = useCallback(
    async (source: string) => {
      if (
        items.length ||
        settings.clients.length ||
        projectGroups.length ||
        resourceLinks.length ||
        salaryBatches.length
      )
        throw new Error("Cloud import requires an empty Workspace.");
      const backup = parseWorkspaceBackup(source);
      const nextItems = normalizeWorkItems(backup.projects);
      const nextSettings = mergeSettings({
        ...backup.settings,
        clients: normalizeClientRecords(backup.clients),
      });
      const nextProjectGroups = normalizeProjectGroups(
        backup.projectGroups,
        nextSettings.clients
      );
      const nextResources = normalizeResourceLinks(backup.resources);
      const nextBatches = recoverLegacySalaryBatches(
        normalizeSalaryState({ batches: backup.salaryBatches }).batches,
        nextItems,
        nextSettings
      );
      if (isSignedIn && convexAuthenticated) {
        await upsertSettings(cloudSettingsInput(nextSettings));
        await Promise.all(
          nextProjectGroups.map((group) => upsertProjectGroup({ group }))
        );
        await Promise.all(
          nextItems.map((project) =>
            createProject({
              project: cloudProjectInput(
                project,
                nextSettings.clients,
                salaryPlans
              ),
            })
          )
        );
        await Promise.all([
          ...(nextBatches.length
            ? [
                importProjectSalaryBatches({
                  batches: nextBatches.map(projectSalaryBatchInput),
                }),
              ]
            : []),
          replaceAllResources({ resources: nextResources }),
        ]);
      }
      setItemsState(nextItems);
      setSettingsState(nextSettings);
      setProjectGroupsState(nextProjectGroups);
      setResourceLinksState(nextResources);
      setSalaryBatches(nextBatches);
      return {
        projects: nextItems.length,
        clients: nextSettings.clients.length,
        projectGroups: nextProjectGroups.length,
        resources: nextResources.length,
        salaryBatches: nextBatches.length,
      };
    },
    [
      convexAuthenticated,
      createProject,
      importProjectSalaryBatches,
      isSignedIn,
      items.length,
      projectGroups.length,
      replaceAllResources,
      resourceLinks.length,
      salaryBatches.length,
      salaryPlans,
      settings.clients.length,
      upsertProjectGroup,
      upsertSettings,
    ]
  );

  const resolvedItems = useMemo(
    () =>
      items.map((project) => ({
        ...project,
        client: projectClientName(project, settings.clients),
      })),
    [items, settings.clients]
  );
  const value: DataContextValue = {
    items: resolvedItems,
    setItems,
    settings,
    settingsSaveState: isSignedIn ? settingsSaveState : "local",
    retrySettingsSave,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    salaryPlans,
    reconcileSalaryBatches,
    updateSalaryBatchPayment,
    exportBackup,
    importBackup,
    isAuthEnabled: true,
    isSignedIn: !!isSignedIn,
    isAuthLoaded: clerkLoaded && ready && (!isSignedIn || !convexAuthLoading),
    toast,
    setToast,
  };

  return (
    <ProjectWorkflowContext.Provider
      value={{
        previewStage: previewProjectStage,
        transitionStage: transitionProjectStage,
      }}
    >
      <ProjectGroupsContext.Provider
        value={{
          groups: projectGroups,
          saveGroup: (group) =>
            setProjectGroups((current) =>
              current.some((item) => item.id === group.id)
                ? current.map((item) => (item.id === group.id ? group : item))
                : [group, ...current]
            ),
          setGroupArchived: (groupId, archived) =>
            setProjectGroups((current) =>
              current.map((group) =>
                group.id === groupId ? { ...group, archived } : group
              )
            ),
        }}
      >
        <DataContext.Provider value={value}>{children}</DataContext.Provider>
      </ProjectGroupsContext.Provider>
    </ProjectWorkflowContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}

function cloudProjectInput(
  item: WorkItem,
  clients: readonly import("./types").Client[],
  salaryPlans: readonly SalaryPlan[]
) {
  const clientId =
    item.clientId ?? clients.find((client) => client.name === item.client)?.id;
  if (!clientId)
    throw new Error(`${item.title} needs a saved Client before it can sync.`);
  const workflowStages = item.workflowStages?.length
    ? item.workflowStages
    : DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }));
  const salaryPlanId =
    item.salaryPlanId &&
    salaryPlans.some(
      (plan) => plan.id === item.salaryPlanId && plan.clientId === clientId
    )
      ? (item.salaryPlanId as Id<"salaryPlans">)
      : undefined;
  return {
    id: item.id,
    teamId: item.teamId,
    assigneeUserIds: item.assigneeUserIds ?? [],
    profileId: item.profileId,
    title: item.title,
    clientId,
    salaryPlanId,
    projectGroupId: item.projectGroupId,
    workflowStages,
    workType: item.workType,
    startDate: item.startDate,
    dueDate: item.dueDate,
    earnings: item.earnings,
    notes: item.notes,
    templateId: item.templateId,
    templateProjectType: item.templateProjectType,
    starterOutputs: item.templateDeliverables?.map((output) => ({
      title: output.title,
      category: output.category,
      reviewState: output.initialStatus,
    })),
  };
}

function cloudProjectChanges(item: WorkItem) {
  return {
    title: item.title,
    clientId: item.clientId,
    projectGroupId: item.projectGroupId ?? null,
    assigneeUserIds: item.assigneeUserIds ?? [],
    workType: item.workType,
    startDate: item.startDate,
    dueDate: item.dueDate,
    earnings: item.earnings,
    notes: item.notes,
  };
}

export function useProjectWorkflow(): ProjectWorkflowPort {
  const ctx = useContext(ProjectWorkflowContext);
  if (!ctx)
    throw new Error("useProjectWorkflow must be used within a DataProvider");
  return ctx;
}

export function useProjectGroups(): ProjectGroupsContextValue {
  const ctx = useContext(ProjectGroupsContext);
  if (!ctx)
    throw new Error("useProjectGroups must be used within a DataProvider");
  return ctx;
}

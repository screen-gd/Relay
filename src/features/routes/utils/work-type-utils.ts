import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import type { SettingsState, WorkItem } from "@/lib/types";
import {
  defaultProjectTags,
  defaultSalaryBatchAmount,
  defaultSalaryBatchSize,
} from "@/features/settings/settings-defaults";

const profile = getProfile(DEFAULT_PROFILE_ID);

export function defaultProjectNotes(settings: SettingsState) {
  const stages = settings.projectStages
    .filter((stage) => stage.trim())
    .join(" -> ");
  const stageLine = stages ? `Production checklist: ${stages}.` : "";
  return stageLine;
}

export function normalizedSalaryBatchSize(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.floor(number)
    : defaultSalaryBatchSize;
}

export function normalizedSalaryBatchAmount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0
    ? number
    : defaultSalaryBatchAmount;
}

export function projectWorkTypeOptions(
  settings: SettingsState,
  projects: WorkItem[] = []
) {
  const values = [
    ...settings.projectTags,
    settings.salaryWorkType,
    ...projects.map((project) => project.workType),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : [...defaultProjectTags];
}

export function isSalaryWorkType(value: string, settings: SettingsState) {
  return (
    value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase()
  );
}

export function canonicalWorkType(value: string, options: string[]) {
  const trimmed = value.trim();
  return (
    options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ??
    trimmed
  );
}

export function findExistingClientName(value: string, clientOptions: string[]) {
  const key = value.trim().toLowerCase();
  if (!key) return "";
  return clientOptions.find((client) => client.toLowerCase() === key) ?? "";
}

export function canonicalClientName(
  value: string,
  clientOptions: string[],
  forceExistingCapitalization = true
) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const existing = findExistingClientName(trimmed, clientOptions);
  return existing && forceExistingCapitalization ? existing : trimmed;
}

export function getTypeConfig(label: string, settings: SettingsState) {
  if (isSalaryWorkType(label, settings))
    return { label, earningsMode: "batch" as const };
  return (
    profile.typeOptions.find(
      (type) => type.label.toLowerCase() === label.toLowerCase()
    ) ?? { label, earningsMode: "manual" as const }
  );
}

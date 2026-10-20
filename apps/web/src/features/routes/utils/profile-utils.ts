import type { SettingsState } from "@/lib/types";
import { isDoneStatus } from "./status-utils";

const MIN_PUBLIC_SLUG_LENGTH = 2;

export function profileDisplayName(settings: SettingsState) {
  return settings.profileName.trim() || "Your Profile";
}

export function displayUsername(settings: SettingsState) {
  if (!settings.profileUsername.trim()) return "";
  return settings.profileUsername.startsWith("@")
    ? settings.profileUsername
    : `@${settings.profileUsername}`;
}

export function sanitizeUsername(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "");
  return cleaned.replace(/[^a-z0-9._-]/g, "");
}

export function publicProfileSlug(settings: SettingsState) {
  const slug = sanitizeUsername(
    settings.profileUsername ||
      settings.profileName ||
      settings.studioName ||
      "editor"
  ).slice(0, 40);
  return slug.length >= MIN_PUBLIC_SLUG_LENGTH ? slug : "editor";
}

export function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function profileStatusLabel(status: string) {
  if (isDoneStatus(status)) return "Delivered";
  if (status === "In Progress") return "Review";
  if (status === "Planned") return "Scheduled";
  return "Revision";
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidProfileImageSource(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("data:image/") || isValidUrl(trimmed);
}

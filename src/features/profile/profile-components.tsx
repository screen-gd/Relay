"use client";

import { FolderOpen } from "@/components/icons";
import { PageEmptyState } from "@/components/workspace-page";
import {
  initials,
  profileDisplayName,
} from "@/features/routes/utils/profile-utils";
import type { SettingsState } from "@/lib/types";

export function ProfileMetric({
  icon,
  label,
  sublabel,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  return (
    <div
      className="rounded-md bg-[var(--surface-fill)] p-4"
      aria-label={`${label} ${sublabel}: ${value}`}
    >
      <span
        aria-hidden="true"
        className="mb-2 grid w-6 place-items-center text-[var(--text-meta)] [&_svg]:size-4"
      >
        {icon}
      </span>
      <dd className="text-metric font-mono font-semibold tabular-nums">
        {value}
      </dd>
      <dt className="mt-2 text-meta text-[var(--text-meta)]">{label}</dt>
      <dd className="mt-1 text-meta text-[var(--text-meta)]">{sublabel}</dd>
    </div>
  );
}

export function PublicProfileAvatar({
  settings,
  size,
}: {
  settings: SettingsState;
  size: number;
}) {
  const imageUrl = settings.profileImageUrl.trim();
  const displayName = profileDisplayName(settings);

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-fill)] text-meta font-semibold text-[var(--text-primary)]"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="size-full object-cover"
        />
      ) : (
        <span role="img" aria-label={`${displayName} profile avatar`}>
          {initials(settings.profileName)}
        </span>
      )}
    </div>
  );
}

export function ProfileDetail({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-body">
      <span
        aria-hidden="true"
        className="grid w-5 shrink-0 place-items-center [&_svg]:size-4"
      >
        {icon}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

export function ProfileEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <PageEmptyState icon={<FolderOpen />} title={title} description={body} />
  );
}

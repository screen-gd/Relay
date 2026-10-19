"use client";

import type { SettingsState } from "@/lib/types";
import {
  profileDisplayName,
  initials,
} from "@/features/routes/utils/profile-utils";

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
      className="bg-page px-4 py-3"
      aria-label={`${label} ${sublabel}: ${value}`}
    >
      <dt className="text-text-2 type-label-sm">
        {label} {sublabel}
      </dt>
      <dd className="mt-1 text-text-1 type-heading data">{value}</dd>
    </div>
  );
}

export function PublicProfileAvatar({
  settings,
  size,
  fontSize,
}: {
  settings: SettingsState;
  size: number;
  fontSize: number;
}) {
  const imageUrl = settings.profileImageUrl.trim();
  const displayName = profileDisplayName(settings);

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border bg-muted font-semibold text-foreground"
      style={{ width: size, height: size, fontSize }}
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
    <span className="flex min-w-0 items-center gap-2 type-body-sm">
      <span
        aria-hidden="true"
        className="grid w-5 shrink-0 place-items-center [&_svg]:size-[17px]"
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
    <div className="grid justify-items-center px-4 py-10 text-center">
      <h3 className="type-heading-xs">{title}</h3>
      <p className="mt-2 max-w-[440px] text-muted-foreground type-body-sm">
        {body}
      </p>
    </div>
  );
}

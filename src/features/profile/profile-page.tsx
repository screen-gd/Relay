"use client";

import { projectStatusTone } from "@/lib/project-status-style";
import { useRef, useState } from "react";
import { RelayBrand } from "@/app/relay-brand";
import {
  accent,
  successColor,
  warningColor,
} from "@/features/routes/shared/route-theme";
import type { SettingsState, WorkItem } from "@/lib/types";
import {
  ContentSection,
  PageEmptyState,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  ToggleGroup as OwnedToggleGroup,
  ToggleGroupItem as OwnedToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  CircleCheckBig,
  Clock3,
  Globe2,
  MapPin,
  Play,
  Share2,
  Trash2,
  Upload,
} from "@/components/icons";
import { useProfileController } from "./profile-controller";
import { copyText } from "@/features/routes/shared/clipboard";
import {
  dateTime,
  daysBetween,
  formatDate,
  iso,
  todayDate,
} from "@/features/routes/utils/date-utils";
import { money, publicMetric } from "@/features/routes/utils/number-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import {
  displayUsername,
  initials,
  isValidProfileImageSource,
  profileDisplayName,
  profileStatusLabel,
  publicProfileSlug,
  sanitizeUsername,
} from "@/features/routes/utils/profile-utils";
import {
  ProfileDetail,
  ProfileEmptyState,
  ProfileMetric,
  PublicProfileAvatar,
} from "./profile-components";

export function OrganizationProfilePage({
  projects,
  settings,
  stats,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  stats: {
    active: number;
    delivered: number;
    earned: number;
    salaryEdits: number;
  };
}) {
  const membersByRole = settings.teamMembers.reduce<Record<string, number>>(
    (roles, member) => {
      roles[member.role] = (roles[member.role] || 0) + 1;
      return roles;
    },
    {}
  );
  const activeProjects = projects
    .filter((project) => !isDoneStatus(project.status))
    .slice(0, 6);

  return (
    <WorkspacePage family="administration">
      <PageHeader
        title="Organization profile"
        description="Your team, its projects, and active work."
      />
      <PageContent className="space-y-5">
        <MetricStrip columns={4} aria-label="Organization metrics">
          <MetricItem
            label="Studio"
            value={settings.studioName}
            supporting="Local tracker"
          />
          <MetricItem
            label="Team members"
            value={String(settings.teamMembers.length)}
            supporting={`${Object.keys(membersByRole).length} active roles`}
          />
          <MetricItem
            label="Active work"
            value={String(stats.active)}
            supporting={`${stats.delivered} delivered`}
          />
          <MetricItem
            label="Tracked value"
            value={money(stats.earned, settings.currencyCode)}
            supporting={`${stats.salaryEdits} salary edits`}
          />
        </MetricStrip>

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
          <ContentSection
            title="Team access"
            titleId="organization-team-heading"
            description="Members and their roles in this workspace."
            bodyMode="flush"
          >
            {settings.teamMembers.length ? (
              <ul
                aria-label="Organization team members"
                className="max-h-[min(460px,55dvh)] overflow-y-auto overscroll-contain"
              >
                {settings.teamMembers.map((member) => (
                  <li
                    key={member.id}
                    className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rule-row px-4 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-7 place-items-center rounded-full bg-tile text-text-1 type-label-sm"
                    >
                      {initials(member.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-text-1 type-label">
                        {member.name}
                      </span>
                      <span className="mt-0.5 block truncate text-text-3 type-label-sm">
                        {member.email || "No email saved"}
                      </span>
                    </span>
                    <OwnedBadge variant="secondary">{member.role}</OwnedBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                compact
                title="No team members yet"
                description="Add members on the Team page to list them here."
              />
            )}
          </ContentSection>
          <ContentSection
            title="Active work"
            titleId="organization-work-heading"
            description="The current queue across the studio."
            bodyMode="flush"
          >
            {activeProjects.length ? (
              <ul
                aria-label="Active organization projects"
                className="max-h-[min(460px,55dvh)] overflow-y-auto overscroll-contain"
              >
                {activeProjects.map((project) => (
                  <li
                    key={project.id}
                    className="grid items-center gap-x-4 gap-y-1 rule-row px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_110px_auto]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-text-1 type-label">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block truncate text-text-3 type-label-sm">
                        {project.client || project.workType}
                      </span>
                    </span>
                    <time
                      dateTime={project.dueDate}
                      className="text-text-2 type-label-sm data"
                    >
                      {formatDate(project.dueDate, settings.dateFormat)}
                    </time>
                    <OrganizationStatusBadge status={project.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                compact
                title="No active work"
                description="Active projects show up here once they are planned."
              />
            )}
          </ContentSection>
        </div>
      </PageContent>
    </WorkspacePage>
  );
}

function OrganizationStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      className={projectStatusTone(isDoneStatus(status) ? "Delivered" : status)}
    >
      {status}
    </OwnedBadge>
  );
}

export function ProfileDesignPage({
  projects,
  settings,
}: {
  projects: WorkItem[];
  settings: SettingsState;
}) {
  const { isSignedIn, publishPublicProfile } = useProfileController();
  const timeline = [...projects]
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate))
    .slice(0, 5);
  const publicActiveProjects = publicMetric(settings.publicActiveProjects);
  const publicDeliveredEdits = publicMetric(settings.publicDeliveredEdits);
  const publicTurnaroundDays = Math.max(
    1,
    publicMetric(settings.publicTurnaroundDays, 3)
  );
  const currentTurnaround = `${publicTurnaroundDays}`;
  const [shareCopied, setShareCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function shareProfile() {
    const slug = publicProfileSlug(settings);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/u/${slug}`;
    const text = `${profileDisplayName(settings)} - ${settings.profileTitle || "Video Editor"}`;
    try {
      if (!isSignedIn) throw new Error("Sign in to publish a public profile.");
      setShareMessage("");
      await publishPublicProfile({
        slug,
        studioName: settings.studioName,
        profileName: profileDisplayName(settings),
        profileUsername: slug,
        profileTitle: settings.profileTitle,
        profileBio: settings.profileBio,
        profileLocation: settings.profileLocation,
        profileImageUrl: settings.profileImageUrl,
        timeZone: settings.timeZone,
        activeProjects: publicActiveProjects,
        deliveredEdits: publicDeliveredEdits,
        avgTurnaroundDays: publicTurnaroundDays,
        projects: timeline.map((project) => ({
          title: project.title,
          status: project.status,
          workType: project.workType,
          dueDate: project.dueDate,
        })),
      });
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      if (await copyText(url)) {
        setShareCopied(true);
        setShareMessage(`Public profile published: /u/${slug}`);
        window.setTimeout(() => setShareCopied(false), 1400);
      }
    } catch (error) {
      setShareCopied(false);
      setShareMessage(
        error instanceof Error
          ? error.message
          : "Could not publish public profile."
      );
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl bg-page px-4 py-5 text-text-1 md:px-8 md:py-7">
      <header className="flex flex-col items-stretch justify-between gap-4 pb-5 shadow-[inset_0_-1px_0_var(--line-row)] sm:flex-row sm:items-center">
        <RelayBrand compact subtitle="Video editing tracker" />
        <OwnedButton type="button" variant="outline" onClick={shareProfile}>
          <Share2 aria-hidden="true" />
          {shareCopied ? "Link copied" : "Share profile"}
        </OwnedButton>
      </header>
      {shareMessage ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-end type-label-sm ${shareMessage.startsWith("Public profile") ? "text-text-2" : "text-fail-text"}`}
        >
          {shareMessage}
        </p>
      ) : null}

      <main className="mt-5">
        <section
          aria-labelledby="public-profile-name"
          className="grid items-center gap-8 rounded-frame bg-well p-5 md:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.8fr)] lg:gap-12"
        >
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <PublicProfileAvatar settings={settings} size={128} fontSize={36} />
            <div>
              <h1 id="public-profile-name" className="type-heading-lg">
                {profileDisplayName(settings)}
              </h1>
              {displayUsername(settings) ? (
                <p className="mt-1.5 text-text-2 type-label">
                  {displayUsername(settings)}
                </p>
              ) : null}
              <p className="mt-2 type-heading-xs">{settings.profileTitle}</p>
              <p className="mt-4 max-w-[420px] text-muted-foreground type-body">
                {settings.profileBio}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
                <ProfileDetail
                  icon={<MapPin />}
                  text={settings.profileLocation}
                />
                <ProfileDetail icon={<Globe2 />} text={settings.timeZone} />
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-soft bg-line-row shadow-[0_0_0_1px_var(--line-row)]">
            <ProfileMetric
              icon={<Play />}
              label="Active"
              sublabel="projects"
              value={String(publicActiveProjects)}
            />
            <ProfileMetric
              icon={<CircleCheckBig />}
              label="Delivered"
              sublabel="edits"
              value={String(publicDeliveredEdits)}
            />
            <ProfileMetric
              icon={<Clock3 />}
              label="Turnaround"
              sublabel="average"
              value={`${currentTurnaround}d`}
            />
          </dl>
        </section>

        <section
          aria-labelledby="recent-work-heading"
          className="mt-5 grid items-start gap-6 rounded-frame bg-well p-5 md:p-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-10"
        >
          <div className="xl:sticky xl:top-6">
            <h2 id="recent-work-heading" className="type-heading-sm">
              Recent work
            </h2>
            <p className="mt-2 max-w-[230px] text-muted-foreground type-body-sm">
              Recent delivery history and near-term work from the tracker.
            </p>
          </div>
          {timeline.length ? (
            <ol
              className="rounded-soft bg-page shadow-[0_0_0_1px_var(--line-frame)]"
              aria-label="Recent project timeline"
            >
              {timeline.map((project) => (
                <li
                  key={project.id}
                  className="grid items-start gap-3 rule-row px-4 py-4 md:grid-cols-[110px_minmax(0,1fr)_100px] md:gap-5"
                >
                  <div>
                    <p className="text-text-1 type-label-sm">
                      {profileStatusLabel(project.status)}
                    </p>
                    <time
                      dateTime={project.dueDate}
                      className="mt-1 block text-muted-foreground type-label-sm"
                    >
                      {formatDate(project.dueDate, settings.dateFormat)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <h3 className="type-heading-xs">{project.title}</h3>
                    <p className="mt-1 text-muted-foreground type-body-sm">
                      {project.client || project.workType}
                    </p>
                    <p className="mt-2 max-w-[620px] text-muted-foreground type-body-sm">
                      {project.notes || "No notes saved for this project."}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="type-label">
                      {Math.max(
                        1,
                        daysBetween(project.startDate, project.dueDate)
                      )}{" "}
                      days
                    </p>
                    <p className="mt-1 text-muted-foreground type-label-sm">
                      turnaround
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ProfileEmptyState
              title="No projects available"
              body="Projects will appear here once the tracker has saved records."
            />
          )}
        </section>
      </main>
      <footer className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-text-3 type-label-sm">
        <span>Shared from {settings.studioName}</span>
        <span>Updated {formatDate(iso(todayDate()), settings.dateFormat)}</span>
      </footer>
    </div>
  );
}

export function ProfileEditPage({
  settings,
  setSettings,
}: {
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrlError =
    settings.profileImageUrl.trim() &&
    !isValidProfileImageSource(settings.profileImageUrl)
      ? "Use an http(s) image URL or upload an image file."
      : undefined;

  async function uploadProfileImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettings({ ...settings, profileImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <WorkspacePage family="administration">
      <PageHeader
        title="Edit profile"
        description="Update the identity shown on your public profile."
      />

      <PageContent className="space-y-5">
        <MasterDetail
          master={
            <ContentSection aria-label="Profile photo" title="Photo">
              <div className="grid place-items-center">
                <ProfileEditAvatar settings={settings} />
              </div>
              <OwnedInput
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                onChange={uploadProfileImage}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  Upload photo
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  disabled={!settings.profileImageUrl}
                  onClick={() =>
                    setSettings({ ...settings, profileImageUrl: "" })
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Clear
                </OwnedButton>
              </div>
              <p className="mx-auto mt-4 max-w-[260px] text-center text-text-2 type-body-sm">
                Upload an image or paste an image URL. The photo shows wherever
                your profile appears.
              </p>
            </ContentSection>
          }
          detail={
            <div className="grid min-w-0 content-start gap-4">
              <ContentSection
                title="Identity"
                description="How you appear on your public profile."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldLayout label="Name">
                    <OwnedInput
                      value={settings.profileName}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          profileName: event.target.value,
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout
                    label="Username"
                    description={`Public profile: /u/${publicProfileSlug(settings)}`}
                  >
                    <OwnedInput
                      value={settings.profileUsername}
                      placeholder="@yourname"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          profileUsername: sanitizeUsername(event.target.value),
                        })
                      }
                    />
                  </FieldLayout>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldLayout label="Title">
                    <OwnedInput
                      value={settings.profileTitle}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          profileTitle: event.target.value,
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout label="Image URL" error={imageUrlError}>
                    <OwnedInput
                      inputMode="url"
                      value={settings.profileImageUrl}
                      placeholder="https://example.com/photo.jpg"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          profileImageUrl: event.target.value.trim(),
                        })
                      }
                    />
                  </FieldLayout>
                </div>

                <FieldLayout label="Bio">
                  <OwnedTextarea
                    rows={3}
                    value={settings.profileBio}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileBio: event.target.value,
                      })
                    }
                  />
                </FieldLayout>
                <FieldLayout label="Location">
                  <OwnedInput
                    value={settings.profileLocation}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileLocation: event.target.value,
                      })
                    }
                  />
                </FieldLayout>
              </ContentSection>
              <ContentSection
                title="Public stats"
                description="Shown on your public profile. They do not have to match your private totals."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FieldLayout label="Active projects">
                    <OwnedInput
                      type="number"
                      min={0}
                      step={1}
                      value={publicMetric(settings.publicActiveProjects)}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicActiveProjects: publicMetric(
                            Number(event.target.value)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout label="Delivered edits">
                    <OwnedInput
                      type="number"
                      min={0}
                      step={1}
                      value={publicMetric(settings.publicDeliveredEdits)}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicDeliveredEdits: publicMetric(
                            Number(event.target.value)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout label="Turnaround days">
                    <OwnedInput
                      type="number"
                      min={1}
                      step={1}
                      value={Math.max(
                        1,
                        publicMetric(settings.publicTurnaroundDays, 3)
                      )}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicTurnaroundDays: Math.max(
                            1,
                            publicMetric(Number(event.target.value), 3)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                </div>
              </ContentSection>

              <ContentSection title="Time and dates">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileEditSelect
                    label="Time zone"
                    value={settings.timeZone}
                    options={[
                      "Asia/Dubai",
                      "Pacific Time",
                      "Eastern Time",
                      "UTC",
                    ]}
                    onChange={(value) =>
                      setSettings({ ...settings, timeZone: value })
                    }
                  />
                  <ProfileEditSelect
                    label="Date format"
                    value={settings.dateFormat}
                    options={[
                      "Month Day, Year",
                      "Day Month Year",
                      "YYYY-MM-DD",
                    ]}
                    onChange={(value) =>
                      setSettings({ ...settings, dateFormat: value })
                    }
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 type-label">Week starts on</legend>
                  <OwnedToggleGroup
                    type="single"
                    value={settings.weekStart}
                    aria-label="Week starts on"
                    onValueChange={(value) => {
                      if (value) setSettings({ ...settings, weekStart: value });
                    }}
                    className="flex h-(--control) w-full"
                  >
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <OwnedToggleGroupItem
                          key={day}
                          value={day}
                          className="flex-1"
                        >
                          {day}
                        </OwnedToggleGroupItem>
                      )
                    )}
                  </OwnedToggleGroup>
                </fieldset>
              </ContentSection>
            </div>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function ProfileEditAvatar({ settings }: { settings: SettingsState }) {
  const imageUrl = settings.profileImageUrl.trim();

  return (
    <div className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-full bg-tile text-text-1 type-display">
      {imageUrl ? (
        <img
          className="size-full object-cover"
          src={imageUrl}
          alt={profileDisplayName(settings)}
        />
      ) : (
        <span aria-hidden="true">{initials(settings.profileName)}</span>
      )}
    </div>
  );
}

function ProfileEditSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <OwnedSelect
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((candidate) => candidate === nextValue);
        if (option) onChange(option);
      }}
    >
      <FieldLayout label={label}>
        <OwnedSelectTrigger className="w-full">
          <OwnedSelectValue>{value}</OwnedSelectValue>
        </OwnedSelectTrigger>
      </FieldLayout>
      <OwnedSelectContent position="popper">
        {options.map((option) => (
          <OwnedSelectItem key={option} value={option}>
            {option}
          </OwnedSelectItem>
        ))}
      </OwnedSelectContent>
    </OwnedSelect>
  );
}

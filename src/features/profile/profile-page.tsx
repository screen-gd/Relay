"use client";

import { RelayBrand } from "@/app/relay-brand";
import {
  BadgeDollarSign,
  Building2,
  CircleCheckBig,
  Clock3,
  FolderKanban,
  Globe2,
  MapPin,
  Play,
  Share2,
  Trash2,
  Upload,
  Users,
} from "@/components/icons";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import {
  TabsTrigger as OwnedChoiceTab,
  Tabs as OwnedChoiceTabs,
  TabsList as OwnedChoiceTabsList,
} from "@/components/ui/tabs";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  ContentSection,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { copyText } from "@/features/routes/shared/clipboard";
import {
  dateTime,
  daysBetween,
  formatDate,
  iso,
  todayDate,
} from "@/features/routes/utils/date-utils";
import { money, publicMetric } from "@/features/routes/utils/number-utils";
import {
  displayUsername,
  initials,
  isValidProfileImageSource,
  profileDisplayName,
  profileStatusLabel,
  publicProfileSlug,
  sanitizeUsername,
} from "@/features/routes/utils/profile-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import { projectStatusTone } from "@/lib/project-status-style";
import type { SettingsState, WorkItem } from "@/lib/types";
import { useRef, useState } from "react";
import {
  ProfileDetail,
  ProfileEmptyState,
  ProfileMetric,
  PublicProfileAvatar,
} from "./profile-components";
import { useProfileController } from "./profile-controller";

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
        title="Organization Profile"
        description="Your team, its projects, and active work."
      />
      <PageContent className="">
        <MetricStrip columns={4} aria-label="Organization metrics">
          <MetricItem
            icon={<Building2 aria-hidden="true" />}
            label="Studio"
            value={settings.studioName}
            supporting="Local tracker"
          />
          <MetricItem
            icon={<Users aria-hidden="true" />}
            label="Team Members"
            value={String(settings.teamMembers.length)}
            supporting={`${Object.keys(membersByRole).length} active roles`}
          />
          <MetricItem
            icon={<FolderKanban aria-hidden="true" />}
            label="Active Work"
            value={String(stats.active)}
            supporting={`${stats.delivered} delivered`}
          />
          <MetricItem
            icon={<BadgeDollarSign aria-hidden="true" />}
            label="Tracked Value"
            value={money(stats.earned, settings.currencyCode)}
            supporting={`${stats.salaryEdits} salary edits`}
          />
        </MetricStrip>

        <SplitPane
          ratio="balanced"
          primary={
            <section
              aria-labelledby="organization-team-heading"
              className="rounded-md p-4 text-[var(--text-primary)]"
            >
              <div className="flex items-center gap-2">
                <Users
                  className="size-5 text-[var(--text-primary)]"
                  aria-hidden="true"
                />
                <h2
                  id="organization-team-heading"
                  className="text-metric font-semibold"
                >
                  Team access
                </h2>
              </div>
              <p className="mt-2 text-body text-[var(--text-meta)]">
                Members and permissions are stored locally for this team.
              </p>
              {settings.teamMembers.length ? (
                <ul
                  aria-label="Organization team members"
                  className="mt-4 max-h-[min(460px,55dvh)] space-y-3 overflow-y-auto overscroll-contain pr-1"
                >
                  {settings.teamMembers.map((member) => (
                    <li
                      key={member.id}
                      className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-transparent p-3"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-9 place-items-center rounded-md bg-[var(--surface-active)] text-body font-semibold text-[var(--text-primary)]"
                      >
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-body font-semibold">
                          {member.name}
                        </span>
                        <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                          {member.email || "No email saved"}
                        </span>
                      </span>
                      <OwnedBadge variant="secondary" className="">
                        {member.role}
                      </OwnedBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <OrganizationEmptyState
                  icon={<Users aria-hidden="true" />}
                  title="No team members yet"
                  body="Add team members from the Team page to populate this organization view."
                />
              )}
            </section>
          }
          secondary={
            <section
              aria-labelledby="organization-work-heading"
              className="rounded-md p-4 text-[var(--text-primary)]"
            >
              <div className="flex items-center gap-2">
                <FolderKanban
                  className="size-5 text-[var(--text-primary)]"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="organization-work-heading"
                    className="text-metric font-semibold"
                  >
                    Active organization work
                  </h2>
                  <p className="mt-1 text-body text-[var(--text-meta)]">
                    Current queue across the studio.
                  </p>
                </div>
              </div>
              {activeProjects.length ? (
                <ul
                  aria-label="Active organization projects"
                  className="mt-4 max-h-[min(460px,55dvh)] overflow-y-auto overscroll-contain pr-1"
                >
                  {activeProjects.map((project) => (
                    <li
                      key={project.id}
                      className="grid items-center gap-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_130px] md:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body font-semibold">
                          {project.title}
                        </span>
                        <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                          {project.client || project.workType}
                        </span>
                      </span>
                      <time
                        dateTime={project.dueDate}
                        className="text-body text-[var(--text-meta)]"
                      >
                        {formatDate(project.dueDate, settings.dateFormat)}
                      </time>
                      <OrganizationStatusBadge status={project.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <OrganizationEmptyState
                  icon={<FolderKanban aria-hidden="true" />}
                  title="No active organization work"
                  body="Active projects appear here after new work is planned."
                />
              )}
            </section>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function OrganizationEmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-4 grid min-h-40 place-items-center rounded-md bg-transparent p-6 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-md bg-[var(--surface-active)] text-[var(--text-primary)] [&_svg]:size-5">
          {icon}
        </span>
        <h3 className="mt-3 text-body font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-body text-[var(--text-meta)]">
          {body}
        </p>
      </div>
    </div>
  );
}

function OrganizationStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      variant={
        isDoneStatus(status)
          ? "default"
          : status === "Cancelled"
            ? "destructive"
            : status === "In Progress"
              ? "secondary"
              : "secondary"
      }
      className=""
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
    <div className="mx-auto min-h-dvh w-full max-w-[1480px] bg-background px-4 py-4 text-[var(--text-primary)] md:px-8 md:py-8 xl:px-10">
      <header className="flex flex-col items-stretch justify-between gap-4 pb-4 sm:flex-row sm:items-center">
        <RelayBrand compact subtitle="Video editing tracker" />
        <OwnedButton
          type="button"
          variant="secondary"
          className=""
          onClick={shareProfile}
        >
          <Share2 aria-hidden="true" />
          {shareCopied ? "Published + Copied" : "Share Profile"}
        </OwnedButton>
      </header>
      {shareMessage ? (
        <p
          role="status"
          aria-live="polite"
          className={`mb-1 text-right text-body ${shareMessage.startsWith("Public profile") ? "text-[var(--text-primary)]" : "text-[var(--status-danger)]"}`}
        >
          {shareMessage}
        </p>
      ) : null}

      <main className="mt-4">
        <section
          aria-labelledby="public-profile-name"
          className="grid items-center gap-8 rounded-md p-4 text-[var(--text-primary)] md:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(420px,0.8fr)] lg:gap-12"
        >
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <PublicProfileAvatar settings={settings} size={128} />
            <div>
              <h1
                id="public-profile-name"
                className="text-display font-semibold"
              >
                {profileDisplayName(settings)}
              </h1>
              {displayUsername(settings) ? (
                <p className="mt-2 text-body font-semibold text-[var(--text-primary)]">
                  {displayUsername(settings)}
                </p>
              ) : null}
              <p className="mt-2 text-body">{settings.profileTitle}</p>
              <p className="mt-4 max-w-[420px] text-body text-[var(--text-meta)]">
                {settings.profileBio}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[var(--text-meta)]">
                <ProfileDetail
                  icon={<MapPin />}
                  text={settings.profileLocation}
                />
                <ProfileDetail icon={<Globe2 />} text={settings.timeZone} />
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 rounded-md bg-transparent py-4">
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
          className="mt-10 grid items-start gap-6 rounded-md p-4 text-[var(--text-primary)] md:p-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-12"
        >
          <div className="xl:sticky xl:top-6">
            <h2 id="recent-work-heading" className="text-metric font-semibold">
              Recent work
            </h2>
            <p className="mt-2 max-w-[230px] text-body text-[var(--text-meta)]">
              Recent delivery history and near-term work from the tracker.
            </p>
          </div>
          {timeline.length ? (
            <ol
              className="relative md:pl-6"
              aria-label="Recent project timeline"
            >
              {timeline.map((project) => (
                <li
                  key={project.id}
                  className="relative grid items-start gap-3 py-4 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_130px] md:gap-4"
                >
                  <div>
                    <OwnedBadge status={projectStatusTone(project.status)}>
                      {profileStatusLabel(project.status)}
                    </OwnedBadge>
                    <time
                      dateTime={project.dueDate}
                      className="mt-1 block text-meta text-[var(--text-meta)]"
                    >
                      {formatDate(project.dueDate, settings.dateFormat)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-title font-semibold">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-body text-[var(--text-meta)]">
                      {project.client || project.workType}
                    </p>
                    <p className="mt-2 max-w-[620px] text-body text-[var(--text-meta)]">
                      {project.notes || "No notes saved for this project."}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-body font-semibold">
                      {Math.max(
                        1,
                        daysBetween(project.startDate, project.dueDate)
                      )}{" "}
                      days
                    </p>
                    <p className="mt-1 text-meta text-[var(--text-meta)]">
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
      <footer className="mt-6 text-center text-body text-[var(--text-meta)]">
        Shared from {settings.studioName} - Video Editing Tracker &nbsp; |
        &nbsp; Updated {formatDate(iso(todayDate()), settings.dateFormat)},{" "}
        {todayDate().getFullYear()}
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
        title="Edit Profile"
        description="Update the identity shown on your public profile."
      />

      <PageContent className="">
        <MasterDetail
          master={
            <section
              aria-label="Profile photo"
              className="rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-4 sm:p-6"
            >
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
                  variant="secondary"
                  className=""
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  Upload Photo
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="secondary"
                  disabled={!settings.profileImageUrl}
                  onClick={() =>
                    setSettings({ ...settings, profileImageUrl: "" })
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Clear
                </OwnedButton>
              </div>
              <p className="mx-auto mt-4 max-w-[260px] text-center text-body text-[var(--text-meta)]">
                Upload an image or paste an image URL below. The latest saved
                photo will appear anywhere your profile is shown.
              </p>
            </section>
          }
          detail={
            <section className="grid gap-4 p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLayout label="Profile Name">
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
                <FieldLayout label="Profile Title">
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
                <FieldLayout label="Profile Image URL" error={imageUrlError}>
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

              <FieldLayout label="Profile Bio">
                <OwnedTextarea
                  rows={3}
                  value={settings.profileBio}
                  onChange={(event) =>
                    setSettings({ ...settings, profileBio: event.target.value })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Profile Location">
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

              <ContentSection
                title="Public Profile Stats"
                description="Shown on your public profile. They don't have to match your private totals."
                className=""
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FieldLayout label="Active Projects">
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
                  <FieldLayout label="Delivered Edits">
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
                  <FieldLayout label="Turnaround Days">
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

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileEditSelect
                  label="Time Zone"
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
                  label="Date Format"
                  value={settings.dateFormat}
                  options={["Month Day, Year", "Day Month Year", "YYYY-MM-DD"]}
                  onChange={(value) =>
                    setSettings({ ...settings, dateFormat: value })
                  }
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-body font-medium">
                  Week Start Day
                </legend>
                <OwnedChoiceTabs
                  value={settings.weekStart}
                  aria-label="Week Start Day"
                  onValueChange={(value) => {
                    if (value) setSettings({ ...settings, weekStart: value });
                  }}
                >
                  <OwnedChoiceTabsList aria-label="Week start day">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <OwnedChoiceTab key={day} value={day}>
                          {day}
                        </OwnedChoiceTab>
                      )
                    )}
                  </OwnedChoiceTabsList>
                </OwnedChoiceTabs>
              </fieldset>
            </section>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function ProfileEditAvatar({ settings }: { settings: SettingsState }) {
  const imageUrl = settings.profileImageUrl.trim();

  return (
    <div className="grid size-40 shrink-0 place-items-center overflow-hidden rounded-full bg-transparent text-meta font-semibold text-[var(--text-primary)]">
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

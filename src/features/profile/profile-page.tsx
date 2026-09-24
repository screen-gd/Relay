"use client";

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
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { Card as OwnedCard } from "@/components/ui/card";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
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
} from "lucide-react";
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

function projectTimelineColor(status: string) {
  if (isDoneStatus(status)) return successColor;
  if (status === "In Progress") return accent;
  if (status === "Planned") return "var(--app-highlight)";
  return warningColor;
}

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
        eyebrow="Workspace / Organization"
        title="Organization Profile"
        description="Studio-level view for team ownership, delivery context, and active work."
      />
      <PageContent className="space-y-5">
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
              className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" aria-hidden="true" />
                <h2
                  id="organization-team-heading"
                  className="text-xl font-semibold tracking-tight"
                >
                  Team access
                </h2>
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Members and permissions are stored locally for this team.
              </p>
              {settings.teamMembers.length ? (
                <ul
                  aria-label="Organization team members"
                  className="mt-4 max-h-[min(460px,55dvh)] space-y-2.5 overflow-y-auto overscroll-contain pr-1"
                >
                  {settings.teamMembers.map((member) => (
                    <li
                      key={member.id}
                      className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-muted/30 p-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      >
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {member.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {member.email || "No email saved"}
                        </span>
                      </span>
                      <OwnedBadge
                        variant="outline"
                        className="rounded-md bg-card"
                      >
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
              className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <FolderKanban
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="organization-work-heading"
                    className="text-xl font-semibold tracking-tight"
                  >
                    Active organization work
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Current queue across the studio.
                  </p>
                </div>
              </div>
              {activeProjects.length ? (
                <ul
                  aria-label="Active organization projects"
                  className="mt-4 max-h-[min(460px,55dvh)] divide-y divide-border overflow-y-auto overscroll-contain pr-1"
                >
                  {activeProjects.map((project) => (
                    <li
                      key={project.id}
                      className="grid items-center gap-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_130px] md:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {project.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {project.client || project.workType}
                        </span>
                      </span>
                      <time
                        dateTime={project.dueDate}
                        className="text-[13px] text-muted-foreground"
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
    <div className="mt-4 grid min-h-40 place-items-center rounded-md border border-dashed border-border bg-muted/20 p-6 text-center">
      <div>
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
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
              : "outline"
      }
      className="rounded-md px-2 py-1 font-semibold"
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
    <div className="mx-auto min-h-dvh w-full max-w-[1480px] bg-background px-4 py-5 text-foreground md:px-8 md:py-7 xl:px-10">
      <header className="flex flex-col items-stretch justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <RelayBrand compact subtitle="Video editing tracker" />
        <OwnedButton
          type="button"
          variant="outline"
          className="min-h-10"
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
          className={`mb-1 text-right text-[13px] ${shareMessage.startsWith("Public profile") ? "text-primary" : "text-destructive"}`}
        >
          {shareMessage}
        </p>
      ) : null}

      <main className="mt-5">
        <section
          aria-labelledby="public-profile-name"
          className="grid items-center gap-8 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] md:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(420px,0.8fr)] lg:gap-14"
        >
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <PublicProfileAvatar settings={settings} size={128} fontSize={36} />
            <div>
              <h1
                id="public-profile-name"
                className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em]"
              >
                {profileDisplayName(settings)}
              </h1>
              {displayUsername(settings) ? (
                <p className="mt-1.5 text-sm font-semibold text-primary">
                  {displayUsername(settings)}
                </p>
              ) : null}
              <p className="mt-2 text-[15px]">{settings.profileTitle}</p>
              <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted-foreground">
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
          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border bg-muted/20 py-4">
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
          className="mt-5 grid items-start gap-6 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] md:p-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-12"
        >
          <div className="xl:sticky xl:top-6">
            <h2
              id="recent-work-heading"
              className="text-2xl font-semibold leading-tight tracking-[-0.025em]"
            >
              Recent work
            </h2>
            <p className="mt-2 max-w-[230px] text-[13px] leading-relaxed text-muted-foreground">
              Recent delivery history and near-term work from the tracker.
            </p>
          </div>
          {timeline.length ? (
            <ol
              className="relative md:pl-6"
              aria-label="Recent project timeline"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-2 top-3 hidden w-0.5 rounded-full bg-border md:block"
              />
              {timeline.map((project) => (
                <li
                  key={project.id}
                  className="relative grid items-start gap-3 border-b py-5 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_130px] md:gap-5"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-[-24px] top-[22px] hidden size-3.5 rounded-full border-[3px] border-card ring-1 ring-border md:block"
                    style={{
                      backgroundColor: projectTimelineColor(project.status),
                    }}
                  />
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: projectTimelineColor(project.status) }}
                    >
                      {profileStatusLabel(project.status)}
                    </p>
                    <time
                      dateTime={project.dueDate}
                      className="mt-1 block text-xs text-muted-foreground"
                    >
                      {formatDate(project.dueDate, settings.dateFormat)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{project.title}</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {project.client || project.workType}
                    </p>
                    <p className="mt-2 max-w-[620px] text-[13px] leading-relaxed text-muted-foreground">
                      {project.notes || "No notes saved for this project."}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[13px] font-semibold">
                      {Math.max(
                        1,
                        daysBetween(project.startDate, project.dueDate)
                      )}{" "}
                      days
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
      <footer className="mt-6 text-center text-[13px] text-muted-foreground">
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
        eyebrow="Workspace / Profile"
        title="Edit Profile"
        description="Update the identity shown on your public profile."
      />

      <PageContent className="space-y-5">
        <MasterDetail
          master={
            <OwnedCard
              aria-label="Profile photo"
              className="p-5 shadow-[var(--app-shadow-1)] sm:p-6"
            >
              <div className="grid place-items-center">
                <ProfileEditAvatar settings={settings} />
              </div>
              <input
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
                  className="min-h-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  Upload Photo
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
              <p className="mx-auto mt-4 max-w-[260px] text-center text-[13px] leading-relaxed text-muted-foreground">
                Upload an image or paste an image URL below. The latest saved
                photo will appear anywhere your profile is shown.
              </p>
            </OwnedCard>
          }
          detail={
            <OwnedCard className="grid gap-4 p-5 shadow-[var(--app-shadow-1)] sm:p-6">
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
                description="These are portfolio-facing numbers. They do not need to match your private tracker totals."
                className="shadow-none"
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
                <legend className="mb-2 text-sm font-medium">
                  Week Start Day
                </legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <OwnedButton
                        type="button"
                        key={day}
                        variant={
                          settings.weekStart === day ? "default" : "outline"
                        }
                        aria-pressed={settings.weekStart === day}
                        onClick={() =>
                          setSettings({ ...settings, weekStart: day })
                        }
                        className="min-w-0 px-2 text-xs"
                      >
                        {day}
                      </OwnedButton>
                    )
                  )}
                </div>
              </fieldset>
            </OwnedCard>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function ProfileEditAvatar({ settings }: { settings: SettingsState }) {
  const imageUrl = settings.profileImageUrl.trim();

  return (
    <div className="grid size-40 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-5xl font-bold text-foreground">
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

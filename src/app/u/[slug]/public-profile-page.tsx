import { getProjectProgress } from "@/features/projects/project-domain";
import { CheckCircle2, Clock3, Globe2, MapPin, Play } from "@/components/icons";
import { useQuery } from "convex/react";

import { RelayBrand } from "@/app/relay-brand";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { FolderOpen } from "@/components/icons";
import { Progress } from "@/components/ui/progress";
import { PageEmptyState } from "@/components/workspace-page";
import { projectStatusTone } from "@/lib/project-status-style";
import { api } from "../../../../convex/_generated/api";

const panelClass = "grid gap-10";

export function PublicProfilePage({ slug }: { slug: string }) {
  const profile = useQuery(
    api.publicProfiles.getBySlug,
    slug ? { slug } : "skip"
  );

  if (profile === undefined) {
    return (
      <PublicShell>
        <div className="grid min-h-[70dvh] place-items-center">
          <div
            role="status"
            className="flex flex-col items-center gap-3 text-[var(--text-meta)]"
          >
            <p className="text-body">Loading public profile...</p>
          </div>
        </div>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <section className={cn(panelClass, "mt-6 p-4 md:p-8")}>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-display font-semibold">
            Profile not found
          </h1>
          <p className="mt-2 text-body text-[var(--text-meta)]">
            This public Relay profile has not been published or the link is
            incorrect.
          </p>
        </section>
      </PublicShell>
    );
  }

  const turnaroundDays = Math.max(
    1,
    Math.floor(profile.avgTurnaroundDays || 3)
  );

  return (
    <PublicShell>
      <article className={cn(panelClass, "mt-4")}>
        <header className="grid items-center gap-8 p-4 md:grid-cols-[144px_minmax(0,1fr)] md:p-8">
          <PublicAvatar
            name={profile.profileName}
            imageUrl={profile.profileImageUrl}
          />
          <div>
            <h1 className="text-display font-semibold">
              {profile.profileName || "Relay Editor"}
            </h1>
            {profile.profileUsername ? (
              <p className="mt-1 text-body font-semibold text-[var(--text-primary)]">
                @{profile.profileUsername}
              </p>
            ) : null}
            <p className="mt-2 text-body">
              {profile.profileTitle || "Video Editor"}
            </p>
            <p className="mt-4 max-w-[420px] text-body text-[var(--text-primary)]">
              {profile.profileBio || "Portfolio profile published from Relay."}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[var(--text-meta)]">
              {profile.profileLocation ? (
                <InfoPill icon={<MapPin />} text={profile.profileLocation} />
              ) : null}
              {profile.timeZone ? (
                <InfoPill icon={<Globe2 />} text={profile.timeZone} />
              ) : null}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 md:col-span-2 sm:grid-cols-3">
            <ProfileMetric
              icon={<Play />}
              label="Active Projects"
              value={String(profile.activeProjects)}
            />
            <ProfileMetric
              icon={<CheckCircle2 />}
              label="Delivered Edits"
              value={String(profile.deliveredEdits)}
            />
            <ProfileMetric
              icon={<Clock3 />}
              label="Turnaround"
              value={`${turnaroundDays} Days`}
            />
          </dl>
        </header>

        <div className="" />

        <section className="grid items-start gap-6 p-4 md:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="text-section">Portfolio timeline</h2>
            <p className="mt-2 max-w-[260px] text-body text-[var(--text-meta)]">
              Recent public delivery context shared from Relay.
            </p>
            <p className="mt-4 text-meta text-[var(--text-meta)]">
              Updated {formatPublicDate(profile.updatedAt.slice(0, 10))}
            </p>
          </div>

          {profile.projects.length ? (
            <ul className="space-y-3">
              {profile.projects.map((project) => {
                const progress = projectProgress(project.status);
                return (
                  <li
                    key={`${project.title}-${project.dueDate}`}
                    className="grid items-center gap-3 rounded-md bg-[var(--surface-page)] p-3 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                  >
                    <div className="min-w-0">
                      <p className="text-body font-semibold">{project.title}</p>
                      <p className="mt-1 text-meta text-[var(--text-meta)]">
                        {project.workType}
                      </p>
                    </div>
                    <time className="text-meta text-[var(--text-meta)]">
                      {formatPublicDate(project.dueDate)}
                    </time>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Badge status={projectStatusTone(project.status)}>
                          {project.status}
                        </Badge>
                        <span className="text-meta font-semibold">
                          {progress}%
                        </span>
                      </div>
                      <ProgressBar
                        value={progress}
                        label={`${project.title} progress`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PageEmptyState
              icon={<FolderOpen />}
              title="No public projects shared yet"
              description="The editor can publish public work from their Relay profile."
            />
          )}
        </section>
      </article>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[var(--surface-page)] px-4 py-6 text-[var(--text-primary)] md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <RelayBrand compact />
        {children}
      </div>
    </main>
  );
}

function PublicAvatar({ name, imageUrl }: { name: string; imageUrl: string }) {
  return (
    <div className="grid size-36 place-items-center overflow-hidden rounded-full bg-[var(--surface-fill)] text-meta font-semibold">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col rounded-md bg-[var(--surface-fill)] p-4">
      <span className="text-[var(--text-primary)] [&_svg]:size-5">{icon}</span>
      <dt className="order-3 mt-1 text-meta text-[var(--text-meta)]">
        {label}
      </dt>
      <dd className="order-2 mt-2 text-metric font-semibold">{value}</dd>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-2 text-body text-[var(--text-meta)]">
      <span className="text-[var(--text-primary)] [&_svg]:size-4">{icon}</span>
      {text}
    </span>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return <Progress value={value} aria-label={label} />;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "C") + (parts[1]?.[0] || "");
}

function projectProgress(status: string) {
  const value = status.toLowerCase();
  const recorded =
    value.includes("deliver") || value.includes("complete")
      ? "Delivered"
      : value.includes("review")
        ? "Review"
        : value.includes("progress") || value.includes("edit")
          ? "In Progress"
          : "Planned";
  return getProjectProgress({ status: recorded });
}

function formatPublicDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

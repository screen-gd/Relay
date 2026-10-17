"use client";

import { getProjectProgress } from "@/features/projects/project-domain";

import {
  ArrowRight,
  CloudUpload,
  FileVideo2,
  FolderArchive,
  FolderOpen,
  Grid2X2,
  List,
  Search,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FillViewport,
  MasterDetail,
  PageContent,
  PageEmptyState,
  PageFilters,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { projectStatusTone } from "@/lib/project-status-style";
import type { WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

const progress = getProjectProgress;

function packageColor(project: WorkItem) {
  const palette = [
    "var(--media-package-1)",
    "var(--media-package-2)",
    "var(--media-package-3)",
    "var(--media-package-4)",
    "var(--media-package-5)",
  ];
  let hash = 0;
  for (const char of project.id || project.title)
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function PrecisionMedia({
  projects,
  onViewProject,
}: {
  projects: WorkItem[];
  onViewProject: (project: WorkItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<"all" | "active" | "delivered">(
    "all"
  );
  const [mode, setMode] = useState<"list" | "grid">(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem("relay:media-view") === "list"
      ? "list"
      : "grid"
  );
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");

  useEffect(() => {
    window.localStorage.setItem("relay:media-view", mode);
  }, [mode]);
  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const collectionMatch =
          collection === "all" ||
          (collection === "active" && !delivered(project)) ||
          (collection === "delivered" && delivered(project));
        const searchMatch =
          !query.trim() ||
          `${project.title} ${project.client || ""} ${project.notes}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        return collectionMatch && searchMatch;
      }),
    [collection, projects, query]
  );

  useEffect(() => {
    if (!filtered.some((project) => project.id === selectedId))
      setSelectedId(filtered[0]?.id ?? "");
  }, [filtered, selectedId]);
  const selected =
    filtered.find((project) => project.id === selectedId) ??
    filtered[0] ??
    null;

  const collections = [
    {
      id: "all" as const,
      label: "Project packages",
      count: projects.length,
      icon: FolderOpen,
    },
    {
      id: "active" as const,
      label: "Active exports",
      count: projects.filter((project) => !delivered(project)).length,
      icon: CloudUpload,
    },
    {
      id: "delivered" as const,
      label: "Delivered archive",
      count: projects.filter(delivered).length,
      icon: FolderArchive,
    },
  ];

  const emptyCopy = query.trim()
    ? {
        title: "No matches",
        description: "Clear the search to see every package.",
      }
    : collection === "delivered"
      ? {
          title: "Nothing delivered yet",
          description: "Mark a project as delivered to file its package here.",
        }
      : collection === "active"
        ? {
            title: "No active exports",
            description: "Create a project to start an export.",
          }
        : {
            title: "No media packages yet",
            description:
              "Create your first project to collect its files and exports here.",
          };

  return (
    <WorkspacePage family="master-detail" mode="fill">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <PageHeader
          title="Media"
          description="Browse project files, work-in-progress exports, and final deliveries."
        />

        <PageContent mode="fill">
          <FillViewport
            className="h-full min-h-0"
            bodyLabel="Media workspace"
            bodyClassName="min-h-0 overflow-auto lg:overflow-hidden"
          >
            <MasterDetail
              className="h-full min-h-0 overflow-hidden"
              master={
                <aside className="min-h-0 overflow-auto rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-3">
                  <p className="px-2 text-meta font-medium text-[var(--text-meta)]">
                    Collections
                  </p>
                  <nav
                    className="mt-2 space-y-1"
                    aria-label="Media collections"
                  >
                    {collections.map((item) => {
                      const Icon = item.icon;
                      const active = collection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "relative flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-body font-medium transition-colors text-[var(--text-primary)]",
                            active
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-primary)]"
                          )}
                          onClick={() => setCollection(item.id)}
                          aria-pressed={active}
                          aria-current={active ? "page" : undefined}
                        >
                          {active ? (
                            <span className="absolute inset-0 rounded-md bg-[var(--surface-active)]" />
                          ) : null}
                          <Icon className="relative z-10 size-4 shrink-0" />
                          <span className="relative z-10 truncate">
                            {item.label}
                          </span>
                          <span
                            key={item.count}
                            className="relative z-10 ml-auto min-w-4 text-right text-meta tabular-nums"
                          >
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </aside>
              }
              detail={
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)]">
                  <PageFilters>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-meta)]" />
                        <Input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search packages..."
                          aria-label="Search media packages"
                          className="pl-8 transition-colors"
                        />
                      </div>
                      <Tabs
                        value={mode}
                        onValueChange={(value) =>
                          setMode(value === "list" ? "list" : "grid")
                        }
                      >
                        <TabsList aria-label="Media view">
                          <TabsTrigger value="list" aria-label="List view">
                            <List />
                          </TabsTrigger>
                          <TabsTrigger value="grid" aria-label="Grid view">
                            <Grid2X2 />
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </PageFilters>

                  <div className="flex min-h-10 items-center gap-3 px-4 py-2">
                    <h2 key={collection} className="text-meta font-medium">
                      {
                        collections.find((item) => item.id === collection)
                          ?.label
                      }
                    </h2>

                    <span
                      key={`${collection}-${filtered.length}`}
                      className="ml-auto text-meta tabular-nums text-[var(--text-meta)]"
                      aria-live="polite"
                    >
                      {filtered.length} of {projects.length} packages
                    </span>
                  </div>

                  <div
                    className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
                    tabIndex={0}
                    aria-label="Scrollable media packages"
                  >
                    {filtered.length ? (
                      <div key={mode}>
                        {mode === "list" ? (
                          <div>
                            {filtered.map((project) => {
                              const value = progress(project);
                              const active = selected?.id === project.id;
                              return (
                                <button
                                  key={project.id}
                                  type="button"
                                  className={cn(
                                    "relative grid w-full gap-3 overflow-hidden px-4 py-3 text-left transition-colors hover:bg-[var(--surface-fill)] focus-visible:z-20 sm:grid-cols-[68px_minmax(0,1fr)_130px_105px] sm:items-center text-[var(--text-primary)]",
                                    active && "text-[var(--text-primary)]"
                                  )}
                                  onClick={() => setSelectedId(project.id)}
                                  onDoubleClick={() => onViewProject(project)}
                                  aria-pressed={active}
                                  aria-label={`${project.title}, ${project.status}, ${value}% package progress. Double click to open project.`}
                                >
                                  {active ? (
                                    <span className="absolute inset-0 bg-[var(--surface-active)]" />
                                  ) : null}
                                  <MediaPreview
                                    project={project}
                                    value={value}
                                    className="relative z-10 h-11 w-16"
                                  />
                                  <span className="relative z-10 min-w-0">
                                    <span className="block truncate text-body font-medium">
                                      {project.title}
                                    </span>
                                    <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                                      {project.notes ||
                                        project.client ||
                                        "No package note"}
                                    </span>
                                  </span>
                                  <span className="relative z-10">
                                    <span className="mb-1 flex justify-between text-meta">
                                      <span>Package progress</span>
                                      <span className="tabular-nums">
                                        {value}%
                                      </span>
                                    </span>
                                    <span className="block h-1 overflow-hidden rounded-md bg-[var(--surface-active)]">
                                      <span
                                        className="block h-full bg-[var(--accent-mark)]"
                                        style={{ width: `${value}%` }}
                                      />
                                    </span>
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    status={projectStatusTone(project.status)}
                                  >
                                    {project.status}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((project) => {
                              const value = progress(project);
                              const active = selected?.id === project.id;
                              return (
                                <button
                                  key={project.id}
                                  type="button"
                                  className={cn(
                                    "relative overflow-hidden rounded-md border border-[var(--border-panel)] bg-[var(--surface-page)] text-left transition-colors hover:bg-[var(--surface-active)] text-[var(--text-primary)]",
                                    active && "bg-[var(--surface-active)]"
                                  )}
                                  onClick={() => setSelectedId(project.id)}
                                  data-active={
                                    selected?.id === project.id
                                      ? "true"
                                      : "false"
                                  }
                                  onDoubleClick={() => onViewProject(project)}
                                  aria-pressed={active}
                                  aria-label={`${project.title}, ${project.status}, ${value}% package progress. Double click to open project.`}
                                >
                                  <MediaPreview
                                    project={project}
                                    value={value}
                                    className="aspect-video w-full rounded-none border-0"
                                  />
                                  <span className="block p-3">
                                    <span className="flex items-center gap-2">
                                      <span className="min-w-0 flex-1 truncate text-body font-medium">
                                        {project.title}
                                      </span>
                                      <span className="text-meta tabular-nums text-[var(--text-meta)]">
                                        {value}%
                                      </span>
                                    </span>
                                    <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                                      {project.client || project.workType}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <PageEmptyState
                        icon={<FolderArchive />}
                        title={emptyCopy.title}
                        description={emptyCopy.description}
                        action={
                          query ? (
                            <Button
                              variant="ghost"
                              onClick={() => setQuery("")}
                            >
                              Clear filters
                            </Button>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              }
              inspector={
                <aside
                  className="h-full min-h-0 min-w-0 overflow-auto"
                  aria-label="Selected package details"
                >
                  {selected ? (
                    <div key={selected.id}>
                      <MediaPreview
                        project={selected}
                        value={progress(selected)}
                        className="aspect-video w-full"
                        large
                      />
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <h2 className="min-w-0 truncate text-title">
                          {selected.title}
                        </h2>
                        <span className="shrink-0 text-meta font-medium tabular-nums text-[var(--text-meta)]">
                          {progress(selected)}%
                        </span>
                      </div>
                      <p className="mt-1 text-meta text-[var(--text-meta)]">
                        {selected.client || selected.workType}
                      </p>
                      <Badge
                        variant="secondary"
                        status={projectStatusTone(selected.status)}
                      >
                        {selected.status}
                      </Badge>
                      <div className="mt-4 space-y-3 pt-4">
                        <Detail
                          label="Package type"
                          value={selected.workType}
                        />
                        <Detail
                          label="Project note"
                          value={selected.notes || "No media notes yet"}
                        />
                        <Detail
                          label="Progress"
                          value={`${progress(selected)}%`}
                        />
                      </div>
                      <Button
                        className="mt-4 w-full "
                        onClick={() => onViewProject(selected)}
                      >
                        Open project <ArrowRight />
                      </Button>
                    </div>
                  ) : (
                    <PageEmptyState
                      compact
                      icon={<FolderOpen />}
                      title="Select a package"
                      description="Preview a package and open its project."
                    />
                  )}
                </aside>
              }
            />
          </FillViewport>
        </PageContent>
      </div>
    </WorkspacePage>
  );
}

function MediaPreview({
  project,
  value,
  className,
  large = false,
}: {
  project: WorkItem;
  value: number;
  className?: string;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-md",
        className
      )}
      style={{ background: packageColor(project) }}
      aria-hidden="true"
    >
      <FileVideo2
        className={cn(
          "absolute text-[var(--text-meta)]",
          large ? "right-4 top-4 size-8" : "right-2 top-2 size-4"
        )}
      />
      <span
        className={cn(
          "absolute overflow-hidden rounded-sm bg-[var(--surface-active)]",
          large ? "inset-x-4 bottom-4 h-1" : "inset-x-2 bottom-2 h-0.5"
        )}
      >
        <span
          className="block h-full rounded-sm bg-[var(--accent-mark)]"
          style={{ width: `${value}%` }}
        />
      </span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-section text-[var(--text-primary)]">{label}</p>
      <p className="mt-1 text-body text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

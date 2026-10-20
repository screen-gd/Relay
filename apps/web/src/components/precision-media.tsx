"use client";

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
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  MotionConfig,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProjectProgress } from "@/features/projects/project-domain";
import type { WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusTone } from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  FillViewport,
  MasterDetail,
  PageContent,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function active(project: WorkItem) {
  return (
    !project.archived && !delivered(project) && project.status !== "Cancelled"
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [inlineDetails, setInlineDetails] = useState(false);
  const detailsReturnFocusRef = useRef<HTMLButtonElement>(null);
  const packagesViewportRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useHydratedReducedMotion();

  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 96rem)");
    function updateDetailsLayout() {
      setInlineDetails(breakpoint.matches);
      if (breakpoint.matches) setDetailsOpen(false);
    }
    updateDetailsLayout();
    breakpoint.addEventListener("change", updateDetailsLayout);
    return () => breakpoint.removeEventListener("change", updateDetailsLayout);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("relay:media-view", mode);
  }, [mode]);
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.8 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };
  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const collectionMatch =
          collection === "all" ||
          (collection === "active" && active(project)) ||
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
      count: projects.filter(active).length,
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
        title: "No packages match this search",
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

  const packageDetails = (
    <AnimatePresence mode="popLayout" initial={false}>
      {selected ? (
        <motion.div
          key={selected.id}
          initial={reduceMotion ? false : { opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -4 }}
          transition={contentTransition}
        >
          <MediaPreview
            project={selected}
            value={getProjectProgress(selected)}
            className="aspect-video w-full"
            reduceMotion={Boolean(reduceMotion)}
            large
          />
          <div className="mt-4 flex items-start justify-between gap-3">
            <h2 className="min-w-0 truncate type-label">{selected.title}</h2>
            <span className="shrink-0 tabular-nums text-text-2 type-label-sm">
              {getProjectProgress(selected)}%
            </span>
          </div>
          <p className="mt-1 text-text-2 type-label-sm">
            {selected.client || selected.workType}
          </p>
          <Badge
            variant="outline"
            className={cn("mt-3", projectStatusTone(selected.status))}
          >
            {selected.status}
          </Badge>
          <div className="mt-4 space-y-3 border-t border-line-row pt-4">
            <Detail label="Package type" value={selected.workType} />
            <Detail
              label="Project note"
              value={selected.notes || "No media notes yet"}
            />
            <Detail
              label="Progress"
              value={`${getProjectProgress(selected)}%`}
            />
          </div>
          <Button
            className="mt-5 w-full active:scale-[0.985]"
            onClick={() => onViewProject(selected)}
          >
            Open project <ArrowRight />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="no-media-selection"
          className="grid h-full min-h-72 place-items-center text-center"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={contentTransition}
        >
          <div>
            <FolderOpen className="mx-auto size-6 text-text-2" />
            <p className="mt-2 type-label">Select a package</p>
            <p className="mt-1 text-text-2 type-label-sm">
              Select a package to preview it and open the project.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <MotionConfig reducedMotion="user">
      <WorkspacePage family="master-detail" mode="fill">
        <motion.div
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={contentTransition}
        >
          <PageHeader
            title="Media"
            description="Browse project files, work-in-progress exports, and final deliveries."
          />

          <PageContent mode="fill">
            <LayoutGroup id="media-workspace">
              <FillViewport
                className="h-full min-h-0"
                bodyLabel="Media workspace"
                bodyClassName="min-h-0 overflow-hidden"
              >
                <MasterDetail
                  className="h-full min-h-0 overflow-hidden"
                  master={
                    <aside className="min-h-0 min-w-0 overflow-hidden lg:h-full lg:overflow-auto lg:pb-3">
                      <p className="hidden px-2 text-text-3 type-label-sm lg:block">
                        Collections
                      </p>
                      <nav
                        className="scrollbar-none flex min-w-0 gap-1 overflow-x-auto lg:mt-2 lg:block lg:space-y-0.5 lg:overflow-visible"
                        aria-label="Media collections"
                      >
                        {collections.map((item) => {
                          const Icon = item.icon;
                          const active = collection === item.id;
                          return (
                            <motion.button
                              key={item.id}
                              type="button"
                              className={cn(
                                "relative flex h-9 w-fit shrink-0 items-center gap-2 overflow-hidden rounded-md px-2 outline-none transition-colors type-label-sm lg:w-full",
                                active
                                  ? "text-text-1"
                                  : "text-text-2 hover:text-text-1"
                              )}
                              onClick={() => setCollection(item.id)}
                              aria-pressed={active}
                              aria-current={active ? "page" : undefined}
                              whileTap={
                                reduceMotion ? undefined : { scale: 0.985 }
                              }
                            >
                              {active ? (
                                <motion.span
                                  layoutId="active-media-collection"
                                  className="absolute inset-0 rounded-md bg-selected"
                                  transition={transition}
                                />
                              ) : null}
                              <Icon className="relative z-10 size-4 shrink-0" />
                              <span className="relative z-10 truncate">
                                {item.label}
                              </span>
                              <motion.span
                                key={item.count}
                                className="relative z-10 ml-auto min-w-4 text-right tabular-nums type-label-sm"
                                initial={
                                  reduceMotion ? false : { opacity: 0.4, y: -2 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                transition={contentTransition}
                              >
                                {item.count}
                              </motion.span>
                            </motion.button>
                          );
                        })}
                      </nav>
                    </aside>
                  }
                  detail={
                    <main className="@container flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-frame shadow-[0_0_0_1px_var(--line-row)]">
                      <PageToolbar className="p-3 shadow-[inset_0_-1px_0_var(--line-row)]">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-2" />
                            <Input
                              value={query}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Search packages..."
                              aria-label="Search media packages"
                              className="pl-8"
                            />
                          </div>
                          <SegmentedControl
                            className="self-start"
                            role="group"
                            aria-label="Media view"
                          >
                            {[
                              {
                                id: "list" as const,
                                label: "List view",
                                icon: List,
                              },
                              {
                                id: "grid" as const,
                                label: "Grid view",
                                icon: Grid2X2,
                              },
                            ].map((view) => {
                              const Icon = view.icon;
                              const active = mode === view.id;
                              return (
                                <SegmentedControlItem
                                  key={view.id}
                                  className="px-2"
                                  onClick={() => setMode(view.id)}
                                  aria-label={view.label}
                                  aria-pressed={active}
                                >
                                  <Icon />
                                </SegmentedControlItem>
                              );
                            })}
                          </SegmentedControl>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="2xl:hidden"
                            disabled={!selected}
                            onClick={(event) => {
                              detailsReturnFocusRef.current =
                                event.currentTarget;
                              setDetailsOpen(true);
                            }}
                          >
                            Details
                          </Button>
                        </div>
                      </PageToolbar>

                      <div className="flex min-h-10 shrink-0 items-center gap-3 px-4 py-2 shadow-[inset_0_-1px_0_var(--line-row)]">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.h2
                            key={collection}
                            className="type-label-sm"
                            initial={
                              reduceMotion ? false : { opacity: 0, x: -4 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            exit={
                              reduceMotion ? undefined : { opacity: 0, x: 4 }
                            }
                            transition={contentTransition}
                          >
                            {
                              collections.find((item) => item.id === collection)
                                ?.label
                            }
                          </motion.h2>
                        </AnimatePresence>
                        <motion.span
                          key={`${collection}-${filtered.length}`}
                          className="ml-auto tabular-nums text-text-2 type-label-sm"
                          aria-live="polite"
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={contentTransition}
                        >
                          {filtered.length} of {projects.length} packages
                        </motion.span>
                      </div>

                      <div
                        ref={packagesViewportRef}
                        className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
                        tabIndex={0}
                        aria-label="Scrollable media packages"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          {filtered.length ? (
                            <motion.div
                              key={mode}
                              initial={
                                reduceMotion ? false : { opacity: 0, y: 4 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              exit={
                                reduceMotion ? undefined : { opacity: 0, y: -4 }
                              }
                              transition={contentTransition}
                            >
                              {mode === "list" ? (
                                <div>
                                  <AnimatePresence initial={false}>
                                    {filtered.map((project) => {
                                      const value = getProjectProgress(project);
                                      const active =
                                        selected?.id === project.id;
                                      return (
                                        <motion.button
                                          layout="position"
                                          key={project.id}
                                          type="button"
                                          className={cn(
                                            "relative grid w-full gap-3 overflow-hidden border-b border-line-row px-4 py-3 text-left outline-none transition-colors hover:bg-hover focus-visible:z-20 focus-visible:focus-ring-inset @2xl:grid-cols-[68px_minmax(0,1fr)_130px_105px] @2xl:items-center",
                                            active && "text-text-1"
                                          )}
                                          onClick={(event) => {
                                            setSelectedId(project.id);
                                            if (!inlineDetails) {
                                              detailsReturnFocusRef.current =
                                                event.currentTarget;
                                              setDetailsOpen(true);
                                            }
                                          }}
                                          onDoubleClick={() =>
                                            onViewProject(project)
                                          }
                                          aria-pressed={active}
                                          aria-label={`${project.title}, ${project.status}, ${value}% package progress. ${inlineDetails ? "Double click to open project." : "Open package details."}`}
                                          initial={
                                            reduceMotion
                                              ? false
                                              : { opacity: 0, y: 5 }
                                          }
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={
                                            reduceMotion
                                              ? undefined
                                              : { opacity: 0, scale: 0.99 }
                                          }
                                          transition={contentTransition}
                                          whileTap={
                                            reduceMotion
                                              ? undefined
                                              : { scale: 0.995 }
                                          }
                                        >
                                          {active ? (
                                            <motion.span
                                              layoutId="selected-media-package"
                                              className="absolute inset-0 bg-selected"
                                              transition={transition}
                                            />
                                          ) : null}
                                          <MediaPreview
                                            project={project}
                                            value={value}
                                            className="relative z-10 h-11 w-16"
                                            reduceMotion={Boolean(reduceMotion)}
                                          />
                                          <span className="relative z-10 min-w-0">
                                            <span className="block truncate type-label-sm">
                                              {project.title}
                                            </span>
                                            <span className="mt-1 block truncate text-text-2 type-label-sm">
                                              {project.notes ||
                                                project.client ||
                                                "No package note"}
                                            </span>
                                          </span>
                                          <span className="relative z-10">
                                            <span className="mb-1 flex justify-between type-label-sm">
                                              <span>Package progress</span>
                                              <span className="tabular-nums">
                                                {value}%
                                              </span>
                                            </span>
                                            <span className="block h-1 overflow-hidden rounded-full bg-tile">
                                              <motion.span
                                                className="block h-full origin-left bg-primary"
                                                initial={
                                                  reduceMotion
                                                    ? false
                                                    : { scaleX: 0 }
                                                }
                                                animate={{
                                                  scaleX: value / 100,
                                                }}
                                                transition={transition}
                                              />
                                            </span>
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "relative z-10 w-fit",
                                              projectStatusTone(project.status)
                                            )}
                                          >
                                            {project.status}
                                          </Badge>
                                        </motion.button>
                                      );
                                    })}
                                  </AnimatePresence>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-3 p-3 @md:grid-cols-2 @3xl:grid-cols-3">
                                  <AnimatePresence initial={false}>
                                    {filtered.map((project) => {
                                      const value = getProjectProgress(project);
                                      const active =
                                        selected?.id === project.id;
                                      return (
                                        <motion.button
                                          layout="position"
                                          key={project.id}
                                          type="button"
                                          className={cn(
                                            "studio-motion-edge-sweep relative overflow-hidden rounded-[6px] bg-well text-left outline-none transition-colors hover:border-strong hover:bg-hover",
                                            active && "border-transparent"
                                          )}
                                          onClick={(event) => {
                                            setSelectedId(project.id);
                                            if (!inlineDetails) {
                                              detailsReturnFocusRef.current =
                                                event.currentTarget;
                                              setDetailsOpen(true);
                                            }
                                          }}
                                          data-active={
                                            !reduceMotion &&
                                            selected?.id === project.id
                                              ? "true"
                                              : "false"
                                          }
                                          onDoubleClick={() =>
                                            onViewProject(project)
                                          }
                                          aria-pressed={active}
                                          aria-label={`${project.title}, ${project.status}, ${value}% package progress. ${inlineDetails ? "Double click to open project." : "Open package details."}`}
                                          initial={
                                            reduceMotion
                                              ? false
                                              : { opacity: 0, scale: 0.985 }
                                          }
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={
                                            reduceMotion
                                              ? undefined
                                              : { opacity: 0, scale: 0.985 }
                                          }
                                          transition={contentTransition}
                                          whileHover={
                                            reduceMotion ? undefined : { y: -2 }
                                          }
                                          whileTap={
                                            reduceMotion
                                              ? undefined
                                              : { scale: 0.985 }
                                          }
                                        >
                                          {active ? (
                                            <motion.span
                                              layoutId="selected-media-package"
                                              className="pointer-events-none absolute inset-0 z-20 rounded-[6px] ring-2 ring-inset ring-primary"
                                              transition={transition}
                                            />
                                          ) : null}
                                          <MediaPreview
                                            project={project}
                                            value={value}
                                            className="aspect-video w-full rounded-none border-0"
                                            reduceMotion={Boolean(reduceMotion)}
                                          />
                                          <span className="block p-3">
                                            <span className="flex items-center gap-2">
                                              <span className="min-w-0 flex-1 truncate type-label-sm">
                                                {project.title}
                                              </span>
                                              <span className="tabular-nums text-text-2 type-label-sm">
                                                {value}%
                                              </span>
                                            </span>
                                            <span className="mt-1 block truncate text-text-2 type-label-sm">
                                              {project.client ||
                                                project.workType}
                                            </span>
                                          </span>
                                        </motion.button>
                                      );
                                    })}
                                  </AnimatePresence>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="empty-media-collection"
                              className="grid min-h-[420px] place-items-center px-5 text-center"
                              initial={
                                reduceMotion
                                  ? false
                                  : { opacity: 0, scale: 0.98 }
                              }
                              animate={{ opacity: 1, scale: 1 }}
                              exit={
                                reduceMotion
                                  ? undefined
                                  : { opacity: 0, scale: 0.98 }
                              }
                              transition={contentTransition}
                            >
                              <div>
                                <motion.div
                                  className="mx-auto grid size-11 place-items-center rounded-[6px] bg-well"
                                  initial={reduceMotion ? false : { y: 4 }}
                                  animate={{ y: 0 }}
                                  transition={transition}
                                >
                                  <FolderArchive className="size-5 text-text-2" />
                                </motion.div>
                                <p className="mt-3 type-label">
                                  {emptyCopy.title}
                                </p>
                                <p className="mt-1 text-text-2 type-label-sm">
                                  {emptyCopy.description}
                                </p>
                                {query ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 active:scale-[0.985]"
                                    onClick={() => setQuery("")}
                                  >
                                    Clear search
                                  </Button>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </main>
                  }
                  inspector={
                    <aside
                      className="h-full min-h-0 min-w-0 overflow-auto rounded-frame bg-well p-4 lg:min-h-0"
                      aria-label="Selected package details"
                    >
                      {packageDetails}
                    </aside>
                  }
                />
              </FillViewport>
            </LayoutGroup>
          </PageContent>
        </motion.div>
      </WorkspacePage>
      <Sheet open={detailsOpen && !inlineDetails} onOpenChange={setDetailsOpen}>
        <SheetContent
          className="overflow-y-auto"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const opener = detailsReturnFocusRef.current;
            if (opener?.isConnected && opener.getClientRects().length > 0) {
              opener.focus({ preventScroll: true });
            } else {
              packagesViewportRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>Package details</SheetTitle>
            <SheetDescription>
              Preview the selected package and open its project.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{packageDetails}</div>
        </SheetContent>
      </Sheet>
    </MotionConfig>
  );
}

function MediaPreview({
  project,
  value,
  className,
  reduceMotion,
  large = false,
}: {
  project: WorkItem;
  value: number;
  className?: string;
  reduceMotion: boolean;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-soft bg-tile",
        className
      )}
      aria-hidden="true"
    >
      <FileVideo2
        className={cn(
          "absolute text-text-3",
          large ? "right-4 top-4 size-8" : "right-2 top-2 size-5"
        )}
      />
      <span
        className={cn(
          "absolute overflow-hidden rounded-full bg-line-row",
          large ? "inset-x-4 bottom-4 h-1" : "inset-x-2 bottom-2 h-0.5"
        )}
      >
        <motion.span
          className="block h-full origin-left rounded-full bg-ink"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 360, damping: 34 }
          }
        />
      </span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-3 type-label-sm">{label}</p>
      <p className="mt-1 text-text-2 type-label-sm">{value}</p>
    </div>
  );
}

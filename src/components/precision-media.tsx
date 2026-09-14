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
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function progress(project: WorkItem) {
  if (project.status === "Delivered") return 100;
  if (["Review", "Client Review"].includes(project.status)) return 84;
  if (project.status === "Revision") return 70;
  if (project.status === "In Progress") return 52;
  if (project.status === "Cancelled") return 0;
  return 16;
}

function statusTone(status: WorkItem["status"]) {
  if (status === "Delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (["Review", "Revision", "Client Review"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
  if (status === "In Progress") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
  return "border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
}

function packageColor(project: WorkItem) {
  const palette = ["#dce8f7", "#e8e4dc", "#dce9df", "#dde3eb", "#e7e9ec"];
  let hash = 0;
  for (const char of project.id || project.title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
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
  const [collection, setCollection] = useState<"all" | "active" | "delivered">("all");
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const reduceMotion = useHydratedReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.8 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };
  const filtered = useMemo(() => projects.filter((project) => {
    const collectionMatch = collection === "all"
      || (collection === "active" && !delivered(project))
      || (collection === "delivered" && delivered(project));
    const searchMatch = !query.trim() || `${project.title} ${project.client || ""} ${project.notes}`.toLowerCase().includes(query.trim().toLowerCase());
    return collectionMatch && searchMatch;
  }), [collection, projects, query]);

  useEffect(() => {
    if (!filtered.some((project) => project.id === selectedId)) setSelectedId(filtered[0]?.id ?? "");
  }, [filtered, selectedId]);
  const selected = filtered.find((project) => project.id === selectedId) ?? filtered[0] ?? null;

  const collections = [
    { id: "all" as const, label: "Project packages", count: projects.length, icon: FolderOpen },
    { id: "active" as const, label: "Active exports", count: projects.filter((project) => !delivered(project)).length, icon: CloudUpload },
    { id: "delivered" as const, label: "Delivered archive", count: projects.filter(delivered).length, icon: FolderArchive },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="mx-auto w-full max-w-[1580px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={contentTransition}
      >
        <div className="border-b border-[var(--app-border)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-highlight)]">Asset workspace</p>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.015em]">Media</h1>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Browse project packages, working exports, and completed handoff archives.</p>
        </div>

        <LayoutGroup id="media-workspace">
          <Tabs
            value={collection}
            onValueChange={(value) => setCollection(value as typeof collection)}
            orientation="vertical"
            className="mt-4 grid min-h-[calc(100dvh-148px)] w-full min-w-0 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] lg:grid-cols-[230px_minmax(0,1fr)_300px]"
          >
            <aside className="border-b border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3 lg:border-b-0 lg:border-r">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]">Collections</p>
              <TabsList className="mt-2 h-auto w-full flex-col items-stretch gap-0.5 bg-transparent p-0" aria-label="Media collections">
                {collections.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.id}
                      className={cn(
                        "h-9 w-full justify-start gap-2 rounded-md px-2 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)]",
                        "data-[state=active]:bg-[var(--app-active)] data-[state=active]:text-[var(--app-highlight)]",
                      )}
                      value={item.id}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <motion.span
                        key={item.count}
                        className="ml-auto min-w-4 text-right text-[10px] tabular-nums"
                        initial={reduceMotion ? false : { opacity: 0.4, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={contentTransition}
                      >
                        {item.count}
                      </motion.span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </aside>

            <main className="min-w-0 border-b border-[var(--app-border)] lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-2 border-b border-[var(--app-border)] p-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search packages..."
                    aria-label="Search media packages"
                    className="h-9 bg-[var(--app-control)] pl-8 text-xs transition-colors"
                  />
                </div>
                <div className="inline-flex self-start rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-0.5" role="group" aria-label="Media view">
                  {([
                    { id: "list" as const, label: "List view", icon: List },
                    { id: "grid" as const, label: "Grid view", icon: Grid2X2 },
                  ]).map((view) => {
                    const Icon = view.icon;
                    const active = mode === view.id;
                    return (
                      <Button
                        key={view.id}
                        variant="ghost"
                        size="icon-sm"
                        className={cn("relative overflow-hidden text-[var(--app-muted)] transition-colors active:scale-[0.96]", active && "text-[var(--app-highlight)]")}
                        onClick={() => setMode(view.id)}
                        aria-label={view.label}
                        aria-pressed={active}
                      >
                        {active ? (
                          <motion.span
                            layoutId="active-media-view"
                            className="absolute inset-0 rounded-[4px] bg-[var(--app-active)]"
                            transition={transition}
                          />
                        ) : null}
                        <Icon className="relative z-10" />
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex h-10 items-center border-b border-[var(--app-border)] px-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={collection}
                    className="text-xs font-semibold"
                    initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, x: 4 }}
                    transition={contentTransition}
                  >
                    {collections.find((item) => item.id === collection)?.label}
                  </motion.h2>
                </AnimatePresence>
                <motion.span
                  key={`${collection}-${filtered.length}`}
                  className="ml-auto text-[10px] tabular-nums text-[var(--app-muted)]"
                  aria-live="polite"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={contentTransition}
                >
                  {filtered.length} packages
                </motion.span>
              </div>

              <ScrollArea className="relative h-[calc(100dvh-292px)] min-h-[420px] max-h-[640px]">
                <AnimatePresence mode="wait" initial={false}>
                  {filtered.length ? (
                    <motion.div
                      key={mode}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={contentTransition}
                    >
                      {mode === "list" ? (
                        <div>
                          <AnimatePresence initial={false}>
                            {filtered.map((project) => {
                              const value = progress(project);
                              const active = selected?.id === project.id;
                              return (
                                <motion.button
                                  layout="position"
                                  key={project.id}
                                  type="button"
                                  className={cn(
                                    "relative grid w-full gap-3 overflow-hidden border-b border-[var(--app-border)] px-4 py-3 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] sm:grid-cols-[68px_minmax(0,1fr)_130px_105px] sm:items-center",
                                    active && "text-[var(--app-ink)]",
                                  )}
                                  onClick={() => setSelectedId(project.id)}
                                  onDoubleClick={() => onViewProject(project)}
                                  aria-pressed={active}
                                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
                                  transition={contentTransition}
                                  whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                                >
                                  {active ? (
                                    <motion.span
                                      layoutId="selected-media-package"
                                      className="absolute inset-0 border-l-2 border-[var(--app-accent)] bg-[var(--app-active)]"
                                      transition={transition}
                                    />
                                  ) : null}
                                  <MediaPreview project={project} value={value} className="relative z-10 h-11 w-16" reduceMotion={Boolean(reduceMotion)} />
                                  <span className="relative z-10 min-w-0">
                                    <span className="block truncate text-xs font-semibold">{project.title}</span>
                                    <span className="mt-1 block truncate text-[10px] text-[var(--app-muted)]">{project.notes || project.client || "No package note"}</span>
                                  </span>
                                  <span className="relative z-10">
                                    <span className="mb-1 flex justify-between text-[10px]"><span>Package progress</span><span className="tabular-nums">{value}%</span></span>
                                    <span className="block h-1 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
                                      <motion.span
                                        className="block h-full origin-left bg-[var(--app-accent)]"
                                        initial={reduceMotion ? false : { scaleX: 0 }}
                                        animate={{ scaleX: value / 100 }}
                                        transition={transition}
                                      />
                                    </span>
                                  </span>
                                  <Badge variant="outline" className={cn("relative z-10 h-5 w-fit rounded px-1.5 text-[10px]", statusTone(project.status))}>{project.status}</Badge>
                                </motion.button>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                          <AnimatePresence initial={false}>
                            {filtered.map((project) => {
                              const value = progress(project);
                              const active = selected?.id === project.id;
                              return (
                                <motion.button
                                  layout="position"
                                  key={project.id}
                                  type="button"
                                  className={cn(
                                    "relative overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-left outline-none transition-colors hover:border-[var(--app-strong-border)] hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-panel)]",
                                    active && "border-transparent",
                                  )}
                                  onClick={() => setSelectedId(project.id)}
                                  onDoubleClick={() => onViewProject(project)}
                                  aria-pressed={active}
                                  initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
                                  transition={contentTransition}
                                  whileHover={reduceMotion ? undefined : { y: -2 }}
                                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                                >
                                  {active ? (
                                    <motion.span
                                      layoutId="selected-media-package"
                                      className="pointer-events-none absolute inset-0 z-20 rounded-lg ring-2 ring-inset ring-[var(--app-accent)]"
                                      transition={transition}
                                    />
                                  ) : null}
                                  <MediaPreview project={project} value={value} className="aspect-video w-full rounded-none border-0" reduceMotion={Boolean(reduceMotion)} />
                                  <span className="block p-3">
                                    <span className="flex items-center gap-2">
                                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{project.title}</span>
                                      <span className="text-[10px] tabular-nums text-[var(--app-muted)]">{value}%</span>
                                    </span>
                                    <span className="mt-1 block truncate text-[10px] text-[var(--app-muted)]">{project.client || project.workType}</span>
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
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={contentTransition}
                    >
                      <div>
                        <motion.div
                          className="mx-auto grid size-11 place-items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-soft-panel)]"
                          initial={reduceMotion ? false : { y: 4 }}
                          animate={{ y: 0 }}
                          transition={transition}
                        >
                          <FolderArchive className="size-5 text-[var(--app-muted)]" />
                        </motion.div>
                        <p className="mt-3 text-sm font-semibold">No packages in this collection</p>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">Try another collection or clear the search.</p>
                        {query ? (
                          <Button variant="outline" size="sm" className="mt-4 active:scale-[0.985]" onClick={() => setQuery("")}>
                            Clear search
                          </Button>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </main>

            <aside className="min-h-[360px] p-4" aria-label="Selected package details">
              <AnimatePresence mode="wait" initial={false}>
                {selected ? (
                  <motion.div
                    key={selected.id}
                    initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, x: -4 }}
                    transition={contentTransition}
                  >
                    <MediaPreview project={selected} value={progress(selected)} className="aspect-video w-full" reduceMotion={Boolean(reduceMotion)} large />
                    <h2 className="mt-4 truncate text-sm font-semibold">{selected.title}</h2>
                    <p className="mt-1 text-[11px] text-[var(--app-muted)]">{selected.client || selected.workType}</p>
                    <Badge variant="outline" className={cn("mt-3 h-5 rounded px-1.5 text-[10px]", statusTone(selected.status))}>{selected.status}</Badge>
                    <div className="mt-4 space-y-3 border-t border-[var(--app-border)] pt-4">
                      <Detail label="Package type" value={selected.workType} />
                      <Detail label="Project note" value={selected.notes || "No media notes yet"} />
                      <Detail label="Progress" value={`${progress(selected)}%`} />
                    </div>
                    <Button className="mt-5 w-full transition-transform active:scale-[0.985]" onClick={() => onViewProject(selected)}>
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
                      <FolderOpen className="mx-auto size-6 text-[var(--app-muted)]" />
                      <p className="mt-2 text-sm font-semibold">Select a package</p>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">Package details will appear here.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </Tabs>
        </LayoutGroup>
      </motion.div>
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
      className={cn("relative block shrink-0 overflow-hidden rounded-md border border-[var(--app-border)]", className)}
      style={{ background: packageColor(project) }}
      aria-hidden="true"
    >
      <FileVideo2 className={cn("absolute text-black/25", large ? "right-4 top-4 size-8" : "right-2 top-2 size-5")} />
      <span className={cn("absolute overflow-hidden rounded-full bg-white/65", large ? "inset-x-4 bottom-4 h-1" : "inset-x-2 bottom-2 h-0.5")}>
        <motion.span
          className="block h-full origin-left rounded-full bg-[var(--app-accent)]"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }}
        />
      </span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase text-[var(--app-subtle)]">{label}</p><p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{value}</p></div>;
}

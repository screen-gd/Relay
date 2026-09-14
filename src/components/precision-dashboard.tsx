"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Edit3,
  FolderKanban,
  FolderOpen,
  ListFilter,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AnimatePresence,
  animate,
  motion,
} from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { WorkItem, SettingsState } from "@/lib/types";
import type { ProjectStatus } from "@/lib/domain-values";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
type SortKey = "createdAt_desc" | "createdAt_asc" | "dueDate_asc" | "earnings_desc" | "earnings_asc";
type DashboardActivity = {
  id: string;
  kind: "created" | "updated" | "status" | "delivered" | "team";
  message: string;
  projectId?: string;
  actor?: string;
  createdAt: string;
};

type DashboardProps = {
  settings: SettingsState;
  stats: {
    total: number;
    active: number;
    unpaid: number;
    earned: number;
    salaryEdits: number;
    salaryBatchProgress: number;
  };
  projects: WorkItem[];
  visibleProjects: WorkItem[];
  sessionActivity: DashboardActivity[];
  teamActivity: Array<{
    _id: string;
    actorName: string;
    kind: string;
    projectId?: string;
    message: string;
    createdAt: string;
  }>;
  teamName?: string;
  teamLoading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: ProjectStatus | "All";
  setStatusFilter: (value: ProjectStatus | "All") => void;
  kindFilter: string;
  setKindFilter: (value: string) => void;
  clientFilter: string;
  setClientFilter: (value: string) => void;
  clientOptions: string[];
  projectTagOptions: string[];
  dueFilter: DueFilter;
  setDueFilter: (value: DueFilter) => void;
  billingFilter: "ALL" | "Paid" | "Unpaid";
  setBillingFilter: (value: "ALL" | "Paid" | "Unpaid") => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  onNewProject: () => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
};

const columnHelper = createColumnHelper<WorkItem>();

const statusOptions: Array<ProjectStatus | "All"> = [
  "All",
  "Planned",
  "In Progress",
  "Review",
  "Revision",
  "Delivered",
  "Cancelled",
];

const easing = [0.22, 1, 0.36, 1] as const;

function AnimatedNumber({
  value,
  format = (number) => Math.round(number).toLocaleString("en"),
}: {
  value: number;
  format?: (value: number) => string;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(displayValue, value, {
      duration: 0.65,
      ease: easing,
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [reduceMotion, value]);

  return <>{format(displayValue)}</>;
}

function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.div
      className={cn("h-full origin-left rounded-full bg-[var(--app-accent)]", className)}
      initial={false}
      animate={{ scaleX: value / 100 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: easing }}
    />
  );
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysFromToday(value: string) {
  const due = parseDate(value);
  if (!due) return Number.POSITIVE_INFINITY;
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
}

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function reviewProject(project: WorkItem) {
  return ["Review", "Revision", "Client Review"].includes(project.status)
    || /review|feedback|approval|revision/i.test(project.notes);
}

function progressFor(project: WorkItem) {
  if (project.status === "Delivered") return 100;
  if (project.status === "Review" || project.status === "Client Review") return 82;
  if (project.status === "Revision") return 72;
  if (project.status === "In Progress") return 54;
  if (project.status === "Cancelled") return 0;
  return 18;
}

function priorityFor(project: WorkItem) {
  const days = daysFromToday(project.dueDate);
  if (!delivered(project) && days < 0) return "Urgent";
  if (!delivered(project) && days <= 2) return "High";
  if (!delivered(project) && days <= 7) return "Medium";
  return "Low";
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = parseDate(value);
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en", options ?? { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function relativeActivityTime(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "Recently";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function projectColor(project: WorkItem) {
  const palette = ["#dce8f7", "#e9e2d6", "#dce9df", "#e5e1ef", "#e8e8e8"];
  let hash = 0;
  for (const char of project.id || project.title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  const tone = status === "Delivered"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
    : status === "Review" || status === "Revision" || status === "Client Review"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
      : status === "Cancelled"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        : status === "In Progress"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300"
          : "border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]";

  return <Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px] font-semibold", tone)}>{status}</Badge>;
}

function PriorityBadge({ project }: { project: WorkItem }) {
  const priority = priorityFor(project);
  const tone = priority === "Urgent" || priority === "High"
    ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
    : priority === "Medium"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
      : "bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", tone)}>{priority}</span>;
}

export function PrecisionDashboard(props: DashboardProps) {
  const reduceMotion = useHydratedReducedMotion();
  const [selectedId, setSelectedId] = useState(props.visibleProjects[0]?.id ?? "");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activityMode, setActivityMode] = useState<"recent" | "team">("recent");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  useEffect(() => {
    if (!props.visibleProjects.some((project) => project.id === selectedId)) {
      setSelectedId(props.visibleProjects[0]?.id ?? "");
    }
  }, [props.visibleProjects, selectedId]);

  const selected = props.projects.find((project) => project.id === selectedId)
    ?? props.visibleProjects[0]
    ?? null;
  const projectSummary = useMemo(() => {
    const activeProjects = props.projects.filter((project) => !delivered(project) && project.status !== "Cancelled");
    return {
      overdue: activeProjects.filter((project) => daysFromToday(project.dueDate) < 0),
      dueToday: activeProjects.filter((project) => daysFromToday(project.dueDate) === 0),
      dueSoon: activeProjects
        .filter((project) => daysFromToday(project.dueDate) >= 0)
        .sort((a, b) => daysFromToday(a.dueDate) - daysFromToday(b.dueDate))
        .slice(0, 6),
      blockers: activeProjects
        .filter((project) => reviewProject(project) || daysFromToday(project.dueDate) < 0 || /missing|waiting|blocked/i.test(project.notes))
        .slice(0, 5),
    };
  }, [props.projects]);
  const { overdue, dueToday, dueSoon, blockers } = projectSummary;
  const salarySize = Math.max(1, Number(props.settings.salaryBatchSize) || 20);
  const salaryProgress = props.stats.salaryBatchProgress || (props.stats.salaryEdits ? salarySize : 0);
  const salaryPercent = Math.min(100, Math.round((salaryProgress / salarySize) * 100));
  const activeFilterCount = [
    props.statusFilter !== "All",
    props.kindFilter !== "ALL",
    props.clientFilter !== "ALL",
    props.dueFilter !== "ALL",
    props.billingFilter !== "ALL",
  ].filter(Boolean).length;

  const columns = useMemo(() => [
    columnHelper.accessor("title", {
      header: "Project",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex min-w-[250px] items-center gap-3">
            <div
              className="relative hidden h-10 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--app-border)] sm:block"
              style={{ background: projectColor(project) }}
            >
              <span className="absolute inset-x-2 bottom-2 h-0.5 rounded bg-white/70" />
              <span className="absolute bottom-2 left-2 h-0.5 w-6 rounded bg-[var(--app-accent)]" />
              <FolderOpen className="absolute right-1.5 top-1.5 size-3.5 text-black/30" />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[var(--app-ink)]">{project.title}</span>
              <span className="mt-0.5 block max-w-[260px] truncate text-[11px] text-[var(--app-muted)]">
                {project.client ? `${project.client} · ` : ""}{project.notes || "No notes"}
              </span>
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("workType", {
      header: "Type",
      cell: (info) => <span className="whitespace-nowrap text-xs font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("dueDate", {
      header: "Due date",
      cell: (info) => <span className="whitespace-nowrap text-xs">{formatDate(info.getValue(), { month: "short", day: "numeric" })}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.display({
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const progress = progressFor(row.original);
        return (
          <div className="w-[132px]">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span>{progress}%</span>
              <PriorityBadge project={row.original} />
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
              <AnimatedProgress value={progress} />
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${project.title}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => props.onViewProject(project)}>Open project</DropdownMenuItem>
              <DropdownMenuItem disabled={!props.canEditProjects && Boolean(project.teamId)} onSelect={() => props.onEditProject(project)}>
                <Edit3 /> Edit project
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!props.canDeleteProject(project)}
                onSelect={() => props.onDeleteProject(project.id)}
              >
                <Trash2 /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ], [
    props.canDeleteProject,
    props.canEditProjects,
    props.onDeleteProject,
    props.onEditProject,
    props.onViewProject,
  ]);

  const table = useReactTable({
    data: props.visibleProjects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function clearFilters() {
    props.setQuery("");
    props.setStatusFilter("All");
    props.setKindFilter("ALL");
    props.setClientFilter("ALL");
    props.setDueFilter("ALL");
    props.setBillingFilter("ALL");
    props.setSortKey("createdAt_desc");
  }

  const recentActivity = props.sessionActivity.length
    ? props.sessionActivity
    : props.projects
      .slice()
      .sort((a, b) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime())
      .slice(0, 5)
      .map((project) => ({
        id: project.id,
        kind: delivered(project) ? "delivered" as const : "updated" as const,
        message: delivered(project) ? `${project.title} was delivered` : `${project.title} is ${project.status.toLowerCase()}`,
        projectId: project.id,
        actor: "Workspace",
        createdAt: project.createdAt || `${project.dueDate}T00:00:00`,
      }));

  const activity = activityMode === "recent"
    ? recentActivity
    : props.teamActivity.map((item) => ({
      id: item._id,
      kind: "team" as const,
      message: item.message,
      projectId: item.projectId,
      actor: item.actorName,
      createdAt: item.createdAt,
    }));

  const entry = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, project: WorkItem, rowIndex: number) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter") {
      event.preventDefault();
      props.onViewProject(project);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      setSelectedId(project.id);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const rows = table.getRowModel().rows.slice(0, 8);
    const nextIndex = Math.min(rows.length - 1, Math.max(0, rowIndex + (event.key === "ArrowDown" ? 1 : -1)));
    const nextProject = rows[nextIndex]?.original;
    if (!nextProject) return;
    setSelectedId(nextProject.id);
    requestAnimationFrame(() => {
      document.querySelector<HTMLTableRowElement>(`[data-project-id="${CSS.escape(nextProject.id)}"]`)?.focus();
    });
  }

  return (
    <motion.div
      className="mx-auto min-h-[calc(100dvh-56px)] w-full max-w-[1580px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5"
      initial={entry.initial}
      animate={entry.animate}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: easing }}
    >
      <motion.div
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        initial={entry.initial}
        animate={entry.animate}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: easing }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Production overview</h1>
            <Badge variant="outline" className="h-5 rounded border-[var(--app-border)] bg-[var(--app-panel)] text-[10px] text-[var(--app-muted)]">
              My work
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 border-[var(--app-border)] bg-[var(--app-panel)] text-xs transition-transform active:scale-[0.97]"
            aria-expanded={showFilters}
            aria-controls="dashboard-filters"
            onClick={() => setShowFilters((value) => !value)}
          >
            <ListFilter className="size-3.5" />
            Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </Button>
          <Select value={props.sortKey} onValueChange={(value) => props.setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="Sort dashboard projects" className="h-8 w-[132px] bg-[var(--app-panel)] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Newest</SelectItem>
              <SelectItem value="createdAt_asc">Oldest</SelectItem>
              <SelectItem value="dueDate_asc">Due soon</SelectItem>
              <SelectItem value="earnings_desc">Highest value</SelectItem>
              <SelectItem value="earnings_asc">Lowest value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {showFilters ? (
        <motion.div
          id="dashboard-filters"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: easing }}
          className="mb-4 grid overflow-hidden gap-2 border-y border-[var(--app-border)] bg-[var(--app-panel)] p-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(120px,160px))_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
            <Input
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="Search projects..."
              aria-label="Search dashboard projects"
              className="h-8 bg-[var(--app-control)] pl-8 text-xs"
            />
          </div>
          <Select value={props.statusFilter} onValueChange={(value) => props.setStatusFilter(value as ProjectStatus | "All")}>
            <SelectTrigger aria-label="Filter by project status" className="h-8 bg-[var(--app-control)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={props.kindFilter} onValueChange={props.setKindFilter}>
            <SelectTrigger aria-label="Filter by project type" className="h-8 bg-[var(--app-control)] text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>{props.projectTagOptions.map((value) => <SelectItem key={value} value={value}>{value === "ALL" ? "All types" : value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={props.clientFilter} onValueChange={props.setClientFilter}>
            <SelectTrigger aria-label="Filter by client" className="h-8 bg-[var(--app-control)] text-xs"><SelectValue placeholder="All clients" /></SelectTrigger>
            <SelectContent>{props.clientOptions.map((value) => <SelectItem key={value} value={value}>{value === "ALL" ? "All clients" : value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={props.dueFilter} onValueChange={(value) => props.setDueFilter(value as DueFilter)}>
            <SelectTrigger aria-label="Filter by due date" className="h-8 bg-[var(--app-control)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any date</SelectItem>
              <SelectItem value="This Week">This week</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={props.billingFilter} onValueChange={(value) => props.setBillingFilter(value as "ALL" | "Paid" | "Unpaid")}>
            <SelectTrigger aria-label="Filter by payment status" className="h-8 bg-[var(--app-control)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Payments</SelectItem>
              <SelectItem value="Paid">Collected</SelectItem>
              <SelectItem value="Unpaid">Needs action</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 text-xs transition-transform active:scale-[0.97]" onClick={clearFilters}>Clear</Button>
        </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.section
        className="mb-4 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]"
        initial={entry.initial}
        animate={entry.animate}
        transition={{ delay: reduceMotion ? 0 : 0.05, duration: reduceMotion ? 0 : 0.35, ease: easing }}
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--app-border)] sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6">
          <PulseMetric label="All Projects" value={props.stats.total} helper="Workspace total" />
          <PulseMetric label="Active" value={props.stats.active} helper="Currently underway" accent />
          <PulseMetric label="Overdue" value={overdue.length} helper="Needs attention" tone={overdue.length ? "danger" : "muted"} />
          <PulseMetric label="Due today" value={dueToday.length} helper="Scheduled items" />
          <PulseMetric label="Payment" value={props.stats.unpaid} helper="Needs payment" tone={props.stats.unpaid ? "warning" : "muted"} />
          <PulseMetric label="Collected" value={formatMoney(props.stats.earned, props.settings.currencyCode)} helper="Delivered earnings" tone="success" />
        </div>
      </motion.section>

      <motion.div
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_310px]"
        initial={entry.initial}
        animate={entry.animate}
        transition={{ delay: reduceMotion ? 0 : 0.1, duration: reduceMotion ? 0 : 0.4, ease: easing }}
      >
        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <WorkspaceSection title="Deadline queue" count={dueSoon.length} icon={CalendarClock}>
              {dueSoon.length ? (
                <div className="divide-y divide-[var(--app-border)]">
                  {dueSoon.map((project, index) => (
                    <button
                      key={project.id}
                      className={cn(
                        "grid w-full grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-[background-color,transform] hover:bg-[var(--app-hover)] active:scale-[0.995]",
                        selected?.id === project.id && "bg-[var(--app-active)]",
                      )}
                      onClick={() => setSelectedId(project.id)}
                    >
                      <span className="text-[11px] tabular-nums text-[var(--app-muted)]">
                        {index === 0 && daysFromToday(project.dueDate) === 0 ? "Today" : formatDate(project.dueDate, { month: "short", day: "numeric" })}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{project.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.client || project.workType}</span>
                      </span>
                      <PriorityBadge project={project} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptySection label="No active deadlines are currently scheduled." />
              )}
            </WorkspaceSection>

            <WorkspaceSection title="Blockers & reviews" count={blockers.length} icon={AlertCircle}>
              {blockers.length ? (
                <div className="divide-y divide-[var(--app-border)]">
                  {blockers.map((project) => {
                    const isOverdue = daysFromToday(project.dueDate) < 0;
                    return (
                      <button
                        key={project.id}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-[background-color,transform] hover:bg-[var(--app-hover)] active:scale-[0.995]",
                          selected?.id === project.id && "bg-[var(--app-active)]",
                        )}
                        onClick={() => setSelectedId(project.id)}
                      >
                        <span className="min-w-0">
                          <span className={cn("block truncate text-xs font-semibold", isOverdue ? "text-[var(--app-danger)]" : "text-[var(--app-ink)]")}>
                            {isOverdue ? "Delivery overdue" : reviewProject(project) ? "Review pending" : "Action needed"}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.title} · {project.client || project.workType}</span>
                        </span>
                        <span className="text-[10px] text-[var(--app-muted)]">
                          {isOverdue ? `${Math.abs(daysFromToday(project.dueDate))}d late` : formatDate(project.dueDate, { month: "short", day: "numeric" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptySection label="Nothing is blocked or waiting for review." />
              )}
            </WorkspaceSection>
          </div>

          <WorkspaceSection
            title="Production flow"
            count={props.visibleProjects.length}
            icon={FolderKanban}
          >
            {props.visibleProjects.length ? (
              <>
              <div className="divide-y divide-[var(--app-border)] sm:hidden">
                {table.getRowModel().rows.slice(0, 8).map((row, rowIndex) => {
                  const project = row.original;
                  const progress = progressFor(project);
                  return (
                    <motion.button
                      key={row.id}
                      type="button"
                      data-testid="mobile-project-row"
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                        selected?.id === project.id && "bg-[var(--app-active)]",
                      )}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : Math.min(rowIndex * 0.025, 0.14), duration: reduceMotion ? 0 : 0.2 }}
                      onClick={() => {
                        setSelectedId(project.id);
                        setMobileInspectorOpen(true);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">{project.title}</span>
                          <StatusBadge status={project.status} />
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-[var(--app-muted)]">
                          {project.client || project.workType} · {formatDate(project.dueDate, { month: "short", day: "numeric" })}
                        </span>
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
                          <span className="block h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${progress}%` }} />
                        </span>
                      </span>
                      <span className="flex flex-col items-end justify-between">
                        <PriorityBadge project={project} />
                        <span className="text-[10px] font-semibold tabular-nums text-[var(--app-highlight)]">{progress}%</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-y border-[var(--app-border)] bg-[var(--app-soft-panel)]">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
                            className="h-8 px-3 text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]"
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <button
                                type="button"
                                className="group inline-flex items-center gap-1 rounded-sm py-1 text-left transition-colors hover:text-[var(--app-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <SortIcon direction={header.column.getIsSorted()} />
                              </button>
                            ) : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <motion.tbody
                    key={`${props.query}-${props.statusFilter}-${props.kindFilter}-${props.clientFilter}-${props.dueFilter}-${props.billingFilter}-${props.sortKey}`}
                    className="divide-y divide-[var(--app-border)]"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  >
                    {table.getRowModel().rows.slice(0, 8).map((row, rowIndex) => (
                      <motion.tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        data-testid="project-row"
                        data-project-title={row.original.title}
                        data-project-id={row.original.id}
                        aria-selected={selected?.id === row.original.id}
                        className={cn(
                          "h-[var(--workspace-row-height,58px)] cursor-pointer outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                          selected?.id === row.original.id && "bg-[var(--app-active)]",
                        )}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : Math.min(rowIndex * 0.025, 0.14), duration: reduceMotion ? 0 : 0.2 }}
                        whileHover={reduceMotion ? undefined : { x: 2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.997 }}
                        onClick={() => {
                          setSelectedId(row.original.id);
                          if (window.matchMedia("(max-width: 1279px)").matches) {
                            setMobileInspectorOpen(true);
                          }
                        }}
                        onDoubleClick={() => props.onViewProject(row.original)}
                        onKeyDown={(event) => handleRowKeyDown(event, row.original, rowIndex)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2 text-xs text-[var(--app-ink)]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
              </>
            ) : (
              <motion.div
                className="grid min-h-48 place-items-center px-4 text-center"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: easing }}
              >
                <div>
                  <FolderKanban className="mx-auto size-6 text-[var(--app-muted)]" />
                  <p className="mt-2 text-sm font-semibold">No projects in this view</p>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    {activeFilterCount || props.query ? "No projects match the current filters." : "Create the first project in your workspace."}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    {activeFilterCount || props.query ? (
                      <Button variant="outline" className="h-8 transition-transform active:scale-[0.97]" size="sm" onClick={clearFilters}>Clear filters</Button>
                    ) : null}
                    <Button className="h-8 transition-transform active:scale-[0.97]" size="sm" onClick={props.onNewProject} disabled={!props.canCreateProjects}>Create project</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </WorkspaceSection>

          <div className="grid gap-3 lg:grid-cols-2">
            <WorkspaceSection
              title="Activity"
              count={activity.length}
              icon={Clock3}
              action={
                <div className="flex rounded-md bg-[var(--app-soft-panel)] p-0.5">
                  <button
                    type="button"
                    className={cn("relative rounded px-2 py-1 text-[10px] font-medium transition-colors", activityMode === "recent" ? "text-[var(--app-ink)]" : "text-[var(--app-muted)]")}
                    aria-pressed={activityMode === "recent"}
                    onClick={() => setActivityMode("recent")}
                  >
                    {activityMode === "recent" ? <motion.span layoutId="activity-mode" className="absolute inset-0 rounded bg-[var(--app-panel)] shadow-sm" /> : null}
                    <span className="relative">Recent Activity</span>
                  </button>
                  <button
                    type="button"
                    className={cn("relative rounded px-2 py-1 text-[10px] font-medium transition-colors", activityMode === "team" ? "text-[var(--app-ink)]" : "text-[var(--app-muted)]")}
                    aria-pressed={activityMode === "team"}
                    onClick={() => setActivityMode("team")}
                  >
                    {activityMode === "team" ? <motion.span layoutId="activity-mode" className="absolute inset-0 rounded bg-[var(--app-panel)] shadow-sm" /> : null}
                    <span className="relative">Team Activity</span>
                  </button>
                </div>
              }
            >
              {props.teamLoading && activityMode === "team" ? (
                <ActivitySkeleton />
              ) : activity.length ? (
                <motion.div
                  key={activityMode}
                  className="divide-y divide-[var(--app-border)]"
                  initial={reduceMotion ? false : { opacity: 0, x: activityMode === "team" ? 5 : -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: easing }}
                >
                  {activity.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="flex items-start gap-2.5 px-3 py-2.5"
                      initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : index * 0.025 }}
                    >
                      <span className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        item.kind === "delivered" ? "bg-[var(--app-success-bg)] text-[var(--app-success)]" : "bg-[var(--app-active)] text-[var(--app-highlight)]",
                      )}>
                        {item.kind === "delivered" ? <CheckCircle2 className="size-3" /> : <MessageSquareText className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{item.message}</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--app-muted)]">{item.actor || "Workspace"} · {relativeActivityTime(item.createdAt)}</span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptySection label="No activity has been recorded yet." />
              )}
            </WorkspaceSection>

            <WorkspaceSection title="Salary batch - Batch progress" icon={Download}>
              <div className="px-4 py-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums"><AnimatedNumber value={salaryProgress} /><span className="text-base font-medium text-[var(--app-muted)]"> / {salarySize}</span></p>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">salary edits completed</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--app-highlight)]"><AnimatedNumber value={salaryPercent} />%</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
                  <AnimatedProgress value={salaryPercent} />
                </div>
                <div className="mt-4 border-t border-[var(--app-border)] pt-3">
                  <span className="text-[11px] text-[var(--app-muted)]">
                    {formatMoney(Number(props.settings.salaryBatchAmount) || 0, props.settings.currencyCode)} per completed batch
                  </span>
                </div>
              </div>
            </WorkspaceSection>
          </div>
        </div>

        <ProjectInspector
          project={selected}
          settings={props.settings}
          onOpen={props.onViewProject}
          onEdit={props.onEditProject}
          canEdit={props.canEditProjects}
        />
        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md xl:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Project details</SheetTitle>
              <SheetDescription>Review the selected project and open its full workspace.</SheetDescription>
            </SheetHeader>
            <ProjectInspector
              project={selected}
              settings={props.settings}
              onOpen={props.onViewProject}
              onEdit={props.onEditProject}
              canEdit={props.canEditProjects}
              mobile
            />
          </SheetContent>
        </Sheet>
      </motion.div>
    </motion.div>
  );
}

function PulseMetric({
  icon,
  label,
  value,
  helper,
  accent,
  tone = "default",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  accent?: boolean;
  tone?: "default" | "muted" | "danger" | "warning" | "success";
}) {
  const valueTone = tone === "danger"
    ? "text-[var(--app-danger)]"
    : tone === "warning"
      ? "text-[var(--app-warning)]"
      : tone === "success"
        ? "text-[var(--app-success)]"
        : accent
          ? "text-[var(--app-highlight)]"
          : "text-[var(--app-ink)]";

  return (
    <motion.div
      className="flex min-h-[84px] items-center gap-2.5 px-3 py-3"
      whileHover={{ backgroundColor: "var(--app-hover)" }}
      transition={{ duration: 0.15 }}
    >
      {icon}
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-[var(--app-muted)]">{label}</p>
        <p className={cn("mt-0.5 truncate text-xl font-semibold tabular-nums", valueTone)}>
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--app-subtle)]">{helper}</p>
      </div>
    </motion.div>
  );
}

function WorkspaceSection({
  title,
  count,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  count?: number;
  icon: typeof FolderKanban;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
      <header className="flex h-11 items-center gap-2 px-3">
        <Icon className="size-4 text-[var(--app-muted)]" />
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {typeof count === "number" ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-[var(--app-soft-panel)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--app-muted)]">{count}</span>
        ) : null}
        <div className="ml-auto">{action}</div>
      </header>
      {children}
    </section>
  );
}

function EmptySection({ label }: { label: string }) {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      className="grid min-h-24 place-items-center px-4 text-center text-xs text-[var(--app-muted)]"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {label}
    </motion.div>
  );
}

function ActivitySkeleton() {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <div className="divide-y divide-[var(--app-border)]" aria-label="Loading team activity" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-start gap-2.5 px-3 py-3">
          <motion.span
            className="size-5 shrink-0 rounded-full bg-[var(--app-soft-panel)]"
            animate={reduceMotion ? undefined : { opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: item * 0.1 }}
          />
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-2.5 rounded bg-[var(--app-soft-panel)]"
              style={{ width: `${78 - item * 9}%` }}
              animate={reduceMotion ? undefined : { opacity: [0.45, 0.8, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: item * 0.1 }}
            />
            <div className="h-2 w-24 rounded bg-[var(--app-soft-panel)] opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
  mobile = false,
}: {
  project: WorkItem | null;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
  mobile?: boolean;
}) {
  const reduceMotion = useHydratedReducedMotion();

  if (!project) {
    return (
      <motion.aside
        className={cn(
          "min-h-[420px] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]",
          mobile ? "grid place-items-center rounded-none border-0" : "hidden xl:grid xl:place-items-center",
        )}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="px-6 text-center">
          <FolderKanban className="mx-auto size-6 text-[var(--app-muted)]" />
          <p className="mt-2 text-sm font-semibold">Select a project</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Project context will stay visible here.</p>
        </div>
      </motion.aside>
    );
  }

  const progress = progressFor(project);

  return (
    <AnimatePresence mode="wait">
    <motion.aside
      key={project.id}
      className={cn(
        "overflow-y-auto border border-[var(--app-border)] bg-[var(--app-panel)]",
        mobile
          ? "min-h-dvh rounded-none border-0"
          : "sticky top-[76px] hidden max-h-[calc(100dvh-96px)] rounded-lg xl:block",
      )}
      initial={reduceMotion ? false : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -5 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: easing }}
    >
      <motion.div
        className="flex items-start gap-3 border-b border-[var(--app-border)] p-4"
        layout
      >
        <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--app-accent)]" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{project.title}</h2>
          <div className="mt-2"><StatusBadge status={project.status} /></div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Project actions"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(project)}>Open project</DropdownMenuItem>
            <DropdownMenuItem disabled={!canEdit && Boolean(project.teamId)} onSelect={() => onEdit(project)}>Edit project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <div className="grid grid-cols-5 border-b border-[var(--app-border)]" aria-label="Project sections">
        {[
          [FolderKanban, "Overview"],
          [Download, "Files"],
          [MessageSquareText, "Reviews"],
          [UsersRound, "Client"],
          [Clock3, "Activity"],
        ].map(([Icon, label], index) => (
          <div key={String(label)} className={cn("flex flex-col items-center gap-1 border-b-2 px-1 py-3 text-[9px]", index === 0 ? "border-[var(--app-accent)] text-[var(--app-highlight)]" : "border-transparent text-[var(--app-muted)]")}>
            <Icon className="size-3.5" />
            {String(label)}
          </div>
        ))}
      </div>

      <div className="space-y-5 p-4">
        <InspectorField icon={UsersRound} label="Client" value={project.client || "No client"} />
        <InspectorField icon={FolderKanban} label="Type" value={project.workType} />
        <InspectorField icon={CalendarClock} label="Due date" value={formatDate(project.dueDate)} />
        <InspectorField icon={AlertCircle} label="Priority" value={priorityFor(project)} />

        <div className="border-t border-[var(--app-border)] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Progress</p>
            <span className="text-xs font-semibold tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
            <AnimatedProgress value={progress} />
          </div>
          <p className="mt-2 text-[10px] text-[var(--app-muted)]">
            {progress === 100 ? "Delivery complete" : `${Math.max(1, Math.round((100 - progress) / 10))} production steps remaining`}
          </p>
        </div>

        {project.notes ? (
          <div className="border-t border-[var(--app-border)] pt-4">
            <p className="text-xs font-semibold">Project note</p>
            <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{project.notes}</p>
          </div>
        ) : null}

        <div className="border-t border-[var(--app-border)] pt-4">
          <p className="text-xs font-semibold">Value</p>
          <p className="mt-1 text-lg font-semibold">
            {project.workType === settings.salaryWorkType
              ? "Batch tracked"
              : formatMoney(project.earnings, settings.currencyCode)}
          </p>
        </div>

        <Button className="w-full transition-transform active:scale-[0.98]" onClick={() => onOpen(project)}>
          Open project <ArrowRight />
        </Button>
      </div>
    </motion.aside>
    </AnimatePresence>
  );
}

function InspectorField({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 text-[var(--app-muted)]" />
      <div>
        <p className="text-[9px] font-semibold uppercase text-[var(--app-subtle)]">{label}</p>
        <p className="mt-0.5 text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-3 text-[var(--app-highlight)]" />;
  if (direction === "desc") return <ArrowDown className="size-3 text-[var(--app-highlight)]" />;
  return <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />;
}

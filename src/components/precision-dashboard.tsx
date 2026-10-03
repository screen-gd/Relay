"use client";

import { getProjectProgress } from "@/features/projects/project-domain";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Check,
  ChevronDown,
  Edit3,
  FolderKanban,
  ListFilter,
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
import { AnimatePresence, animate, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SalaryBatch, WorkItem, SettingsState } from "@/lib/types";
import type { ProjectStatus } from "@/lib/domain-values";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusColor } from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContentSection,
  DataTableFrame,
  MetricItem,
  MetricStrip,
  PageContent,
  PageToolbar,
  sectionListClassName,
  sectionRowClassName,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

type DueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
type SortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "dueDate_asc"
  | "earnings_desc"
  | "earnings_asc";
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
    collected: number;
    outstanding: number;
    salaryEdits: number;
    salaryBatchProgress: number;
  };
  projects: WorkItem[];
  visibleProjects: WorkItem[];
  salaryBatches: SalaryBatch[];
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
  onMarkSalaryPayment: (batchId: string) => void;
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

const sortOptions = [
  { value: "createdAt_desc", label: "Newest" },
  { value: "createdAt_asc", label: "Oldest" },
  { value: "dueDate_asc", label: "Due soon" },
  { value: "earnings_desc", label: "Highest value" },
  { value: "earnings_asc", label: "Lowest value" },
] as const satisfies ReadonlyArray<{ value: SortKey; label: string }>;

const dueOptions = [
  { value: "ALL", label: "Any date" },
  { value: "This Week", label: "Within 7 days" },
  { value: "Overdue", label: "Overdue" },
  { value: "Delivered", label: "Delivered" },
] as const satisfies ReadonlyArray<{ value: DueFilter; label: string }>;

const billingOptions = [
  { value: "ALL", label: "All Payments" },
  { value: "Paid", label: "Paid" },
  { value: "Unpaid", label: "Unpaid" },
] as const satisfies ReadonlyArray<{
  value: "ALL" | "Paid" | "Unpaid";
  label: string;
}>;

type DashboardMenuOption<T extends string> = {
  value: T;
  label: string;
};

function DashboardDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  contentClassName,
}: {
  value: T;
  options: ReadonlyArray<DashboardMenuOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  contentClassName?: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            "h-8 w-full justify-between rounded-lg border-[var(--app-border)] bg-[var(--app-control)] px-3 text-[11px] shadow-none",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label ?? value}</span>
          <ChevronDown
            className="size-3.5 shrink-0 text-[var(--app-muted)]"
            strokeWidth={1.75}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("min-w-[10rem]", contentClassName)}
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className="justify-between gap-4"
          >
            <span className="truncate">{option.label}</span>
            <Check
              className={cn(
                "size-4 shrink-0",
                option.value === value ? "opacity-100" : "opacity-0"
              )}
              strokeWidth={1.75}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Minimalist motion: soft settle, never snappy SaaS bounce. */
const easing = [0.16, 1, 0.3, 1] as const;

const surface =
  "rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] transition-colors duration-150";

const MotionCard = motion.create(Card);
const MotionButton = motion.create(Button);
const MotionEmpty = motion.create(Empty);

/** The dashboard ledger previews a fixed number of rows; Projects shows the rest. */
const LEDGER_PREVIEW_ROWS = 5;

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
  return (
    ["Review", "Revision", "Client Review"].includes(project.status) ||
    /review|feedback|approval|revision/i.test(project.notes)
  );
}

function priorityFor(project: WorkItem) {
  const days = daysFromToday(project.dueDate);
  if (!delivered(project) && days < 0) return "Urgent";
  if (!delivered(project) && days <= 2) return "High";
  if (!delivered(project) && days <= 7) return "Medium";
  return "Low";
}

function projectNextAction(project: WorkItem) {
  if (project.status === "Delivered")
    return "Archive final exports and confirm payment.";
  if (["Review", "Client Review"].includes(project.status))
    return "Collect review notes and prepare the next cut.";
  if (project.status === "Revision")
    return "Apply the requested revisions and send the updated cut.";
  if (project.status === "In Progress")
    return "Complete the current production pass.";
  return "Confirm the brief and first production milestone.";
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = parseDate(value);
  if (!date) return "No date";
  return new Intl.DateTimeFormat(
    "en",
    options ?? { month: "short", day: "numeric", year: "numeric" }
  ).format(date);
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

/** Keep status visible without turning every row into a collection of pills. */
function StatusBadge({ status }: { status: WorkItem["status"] }) {
  return (
    <span
      className="text-[11px] font-medium"
      style={{ color: projectStatusColor(status) }}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ project }: { project: WorkItem }) {
  const priority = priorityFor(project);
  const tone =
    priority === "Urgent" || priority === "High"
      ? "text-[var(--status-danger)]"
      : priority === "Medium"
        ? "text-[var(--status-warning)]"
        : "text-[var(--app-muted)]";
  return (
    <span className={cn("text-[11px] font-medium", tone)}>{priority}</span>
  );
}

export function PrecisionDashboard(props: DashboardProps) {
  const reduceMotion = useHydratedReducedMotion();
  const [selectedId, setSelectedId] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activityMode, setActivityMode] = useState<"recent" | "team">("recent");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const activityScrollTopRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (activityScrollTopRef.current === null) return;
    const contentViewport = document.getElementById("main-content");
    if (contentViewport)
      contentViewport.scrollTop = activityScrollTopRef.current;
    activityScrollTopRef.current = null;
  }, [activityMode]);

  const selected =
    props.projects.find((project) => project.id === selectedId) ?? null;
  const projectSummary = useMemo(() => {
    const activeProjects = props.projects.filter(
      (project) => !delivered(project) && project.status !== "Cancelled"
    );
    return {
      overdue: activeProjects.filter(
        (project) => daysFromToday(project.dueDate) < 0
      ),
      dueThisWeek: activeProjects.filter((project) => {
        const days = daysFromToday(project.dueDate);
        return days >= 0 && days <= 7;
      }),
      waitingReviews: activeProjects.filter(reviewProject),
      blockers: activeProjects.filter(
        (project) =>
          reviewProject(project) ||
          daysFromToday(project.dueDate) < 0 ||
          /missing|waiting|blocked/i.test(project.notes)
      ),
    };
  }, [props.projects]);
  const { overdue, dueThisWeek, waitingReviews, blockers } = projectSummary;
  const salarySize = Math.max(1, Number(props.settings.salaryBatchSize) || 20);
  const pendingSalaryBatch = useMemo(
    () =>
      props.salaryBatches
        .filter((batch) => !batch.archived && !batch.paid)
        .sort((a, b) => a.number - b.number)[0] ?? null,
    [props.salaryBatches]
  );
  const salaryProgress =
    props.stats.salaryBatchProgress || (pendingSalaryBatch ? salarySize : 0);
  const salaryPercent = Math.min(
    100,
    Math.round((salaryProgress / salarySize) * 100)
  );
  const showSalaryBatch = props.projects.some(
    (project) =>
      project.workType.trim().toLowerCase() ===
      props.settings.salaryWorkType.trim().toLowerCase()
  );
  const activeFilterCount = [
    props.statusFilter !== "All",
    props.kindFilter !== "ALL",
    props.clientFilter !== "ALL",
    props.dueFilter !== "ALL",
    props.billingFilter !== "ALL",
  ].filter(Boolean).length;

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Project",
        cell: ({ row }) => {
          const project = row.original;
          return (
            <div className="flex min-w-[220px] items-center gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium tracking-[-0.01em] text-[var(--app-ink)]">
                  {project.title}
                </span>
                <span className="mt-0.5 block max-w-[260px] truncate text-[11px] leading-relaxed text-[var(--app-muted)]">
                  {project.client ? `${project.client} · ` : ""}
                  {project.notes}
                </span>
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("workType", {
        header: "Type",
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-[var(--app-muted)]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due date",
        cell: (info) => (
          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-[var(--app-muted)]">
            {formatDate(info.getValue(), { month: "short", day: "numeric" })}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const progress = getProjectProgress(row.original);
          return (
            <div className="w-[110px]">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="font-mono tabular-nums text-[var(--app-muted)]">
                  {progress}%
                </span>
                <PriorityBadge project={row.original} />
              </div>
              <Progress
                value={progress}
                aria-hidden="true"
                className="h-1 rounded-sm bg-[var(--app-progress-track)] [&_[data-slot=progress-indicator]]:rounded-sm [&_[data-slot=progress-indicator]]:bg-[var(--app-accent)]"
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("earnings", {
        header: "Value",
        cell: ({ getValue, row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] font-medium tabular-nums text-[var(--app-ink)]">
            {row.original.workType === props.settings.salaryWorkType
              ? "Batch"
              : formatMoney(getValue(), props.settings.currencyCode)}
          </span>
        ),
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
                  <MoreHorizontal className="size-4" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => props.onViewProject(project)}>
                  Open project
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!props.canEditProjects && Boolean(project.teamId)}
                  onSelect={() => props.onEditProject(project)}
                >
                  <Edit3 strokeWidth={1.75} /> Edit project
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={!props.canDeleteProject(project)}
                  onSelect={() => props.onDeleteProject(project.id)}
                >
                  <Trash2 strokeWidth={1.75} /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [
      props.canDeleteProject,
      props.canEditProjects,
      props.onDeleteProject,
      props.onEditProject,
      props.onViewProject,
      props.settings.currencyCode,
      props.settings.salaryWorkType,
    ]
  );

  const ledgerProjects = useMemo(
    () =>
      props.visibleProjects.filter(
        (project) =>
          showCompleted || props.statusFilter !== "All" || !delivered(project)
      ),
    [props.visibleProjects, props.statusFilter, showCompleted]
  );
  const table = useReactTable({
    data: ledgerProjects,
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

  function changeActivityMode(mode: "recent" | "team") {
    if (mode === activityMode) return;
    activityScrollTopRef.current =
      document.getElementById("main-content")?.scrollTop ?? null;
    setActivityMode(mode);
  }

  const recentActivity = props.sessionActivity.length
    ? props.sessionActivity
    : props.projects
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.dueDate).getTime() -
            new Date(a.createdAt || a.dueDate).getTime()
        )
        .slice(0, 5)
        .map((project) => ({
          id: project.id,
          kind: delivered(project)
            ? ("delivered" as const)
            : ("updated" as const),
          message: delivered(project)
            ? `${project.title} was delivered`
            : `${project.title} is ${project.status.toLowerCase()}`,
          projectId: project.id,
          actor: "Workspace",
          createdAt: project.createdAt || `${project.dueDate}T00:00:00`,
        }));

  const activity =
    activityMode === "recent"
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
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    project: WorkItem,
    rowIndex: number
  ) {
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
    const rows = table.getRowModel().rows.slice(0, LEDGER_PREVIEW_ROWS);
    const nextIndex = Math.min(
      rows.length - 1,
      Math.max(0, rowIndex + (event.key === "ArrowDown" ? 1 : -1))
    );
    const nextProject = rows[nextIndex]?.original;
    if (!nextProject) return;
    setSelectedId(nextProject.id);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLTableRowElement>(
          `[data-project-id="${CSS.escape(nextProject.id)}"]`
        )
        ?.focus();
    });
  }

  const attentionContext = [...blockers, ...overdue]
    .filter(
      (project, index, projects) =>
        projects.findIndex((candidate) => candidate.id === project.id) === index
    )
    .slice(0, 4);

  return (
    <WorkspacePage family="data-index">
      <motion.div
        className="contents"
        initial={entry.initial}
        animate={entry.animate}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: easing }}
      >
        <PageToolbar
          className="pb-4"
          primary={
            <div className="relative min-w-[220px] flex-1 lg:w-[300px] lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]"
                strokeWidth={1.75}
              />
              <Input
                value={props.query}
                onChange={(event) => props.setQuery(event.target.value)}
                placeholder="Search projects"
                aria-label="Search dashboard projects"
                className="h-9 rounded-lg border-[var(--app-border)] bg-[var(--app-panel)] pl-9 text-xs shadow-none focus-visible:border-[var(--app-accent)]"
              />
            </div>
          }
          secondary={
            <>
              <Button
                variant="outline"
                className="h-9 rounded-lg border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-[11px] shadow-none"
                aria-expanded={showFilters}
                aria-controls="dashboard-filters"
                onClick={() => setShowFilters((value) => !value)}
              >
                <ListFilter className="size-3.5" strokeWidth={1.75} />
                Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
              </Button>
              <DashboardDropdown
                value={props.sortKey}
                options={sortOptions}
                onChange={props.setSortKey}
                ariaLabel="Sort dashboard projects"
                className="h-9 w-[142px] bg-[var(--app-panel)]"
                contentClassName="min-w-[142px]"
              />
              {activeFilterCount > 0 || props.query ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-[11px] text-[var(--app-muted)]"
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
              ) : null}
            </>
          }
        />
        <PageContent className="flex flex-col gap-4 space-y-0">
          <AnimatePresence initial={false}>
            {showFilters ? (
              <motion.div
                id="dashboard-filters"
                initial={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, height: 0, y: -8 }
                }
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, y: -8 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: easing }}
                className={cn(
                  "my-3 grid overflow-hidden gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5",
                  surface
                )}
              >
                <DashboardDropdown
                  value={props.statusFilter}
                  options={statusOptions.map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={props.setStatusFilter}
                  ariaLabel="Filter by project status"
                />
                <DashboardDropdown
                  value={props.kindFilter}
                  options={props.projectTagOptions.map((value) => ({
                    value,
                    label: value === "ALL" ? "All types" : value,
                  }))}
                  onChange={props.setKindFilter}
                  ariaLabel="Filter by project type"
                />
                <DashboardDropdown
                  value={props.clientFilter}
                  options={props.clientOptions.map((value) => ({
                    value,
                    label: value === "ALL" ? "All clients" : value,
                  }))}
                  onChange={props.setClientFilter}
                  ariaLabel="Filter by client"
                />
                <DashboardDropdown
                  value={props.dueFilter}
                  options={dueOptions}
                  onChange={props.setDueFilter}
                  ariaLabel="Filter by due date"
                />
                <DashboardDropdown
                  value={props.billingFilter}
                  options={billingOptions}
                  onChange={props.setBillingFilter}
                  ariaLabel="Filter by payment status"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            className="order-1"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.04,
              duration: reduceMotion ? 0 : 0.5,
              ease: easing,
            }}
          >
            <div className="min-w-0">
              <MetricStrip
                columns={showSalaryBatch ? 5 : 4}
                aria-label="Overview"
                className="gap-2"
              >
                <MetricItem
                  label="Active"
                  value={
                    <span className="text-[var(--app-highlight)]">
                      <AnimatedNumber value={props.stats.active} />
                    </span>
                  }
                  supporting={`of ${props.stats.total} projects`}
                />
                <MetricItem
                  label="Due this week"
                  value={<AnimatedNumber value={dueThisWeek.length} />}
                  supporting="to deliver"
                />
                <MetricItem
                  label="In review"
                  value={
                    <span
                      className={cn(
                        waitingReviews.length && "text-[var(--app-warning)]"
                      )}
                    >
                      <AnimatedNumber value={waitingReviews.length} />
                    </span>
                  }
                  supporting="Reviews and revisions"
                />
                <MetricItem
                  label="Paid"
                  value={
                    <AnimatedNumber
                      value={props.stats.collected}
                      format={(value) =>
                        formatMoney(value, props.settings.currencyCode)
                      }
                    />
                  }
                  supporting={`${formatMoney(
                    props.stats.outstanding,
                    props.settings.currencyCode
                  )} unpaid`}
                />
                {showSalaryBatch ? (
                  <MetricItem
                    label="Salary batch"
                    value={
                      <span
                        data-testid="salary-batch-progress"
                        className="flex items-baseline gap-1"
                      >
                        <AnimatedNumber value={salaryProgress} />
                        <span className="text-xs font-normal text-muted-foreground">
                          / {salarySize} edits
                        </span>
                      </span>
                    }
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] shadow-none"
                        disabled={!pendingSalaryBatch}
                        aria-label={
                          pendingSalaryBatch
                            ? `Mark payment batch ${pendingSalaryBatch.number} paid`
                            : "Mark paid"
                        }
                        onClick={() => {
                          if (pendingSalaryBatch)
                            props.onMarkSalaryPayment(pendingSalaryBatch.id);
                        }}
                      >
                        Mark paid
                      </Button>
                    }
                    supporting={
                      <div className="flex items-center gap-3">
                        <span className="shrink-0">{salaryPercent}%</span>
                        <Progress
                          value={salaryPercent}
                          aria-hidden="true"
                          className="h-1 flex-1 rounded-sm bg-[var(--app-progress-track)] [&_[data-slot=progress-indicator]]:rounded-sm [&_[data-slot=progress-indicator]]:bg-[var(--app-accent)]"
                        />
                      </div>
                    }
                  />
                ) : null}
              </MetricStrip>
            </div>
          </motion.div>

          <motion.div
            className="order-2"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.08,
              duration: reduceMotion ? 0 : 0.55,
              ease: easing,
            }}
          >
            <ContentSection
              title="Needs attention"
              actions={
                overdue.length ? (
                  <span className="text-xs text-[var(--app-danger)]">
                    {overdue.length} overdue
                  </span>
                ) : null
              }
              bodyMode="flush"
            >
              {attentionContext.length ? (
                <div className={sectionListClassName}>
                  {attentionContext.map((project) => {
                    const days = daysFromToday(project.dueDate);
                    return (
                      <Button
                        key={project.id}
                        type="button"
                        variant="ghost"
                        className={cn(
                          sectionRowClassName,
                          "h-auto min-h-9 w-full grid gap-3 whitespace-normal px-3 py-2 text-left font-normal hover:bg-[var(--app-hover)] dark:hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] active:translate-y-0 active:scale-100 sm:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1.4fr)_auto] sm:items-center",
                          selected?.id === project.id &&
                            "bg-[var(--app-active)]"
                        )}
                        onClick={() => {
                          setSelectedId(project.id);
                          if (window.matchMedia("(max-width: 1279px)").matches)
                            setMobileInspectorOpen(true);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-[var(--app-ink)]">
                            {project.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">
                            {project.client || project.workType}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] text-[var(--app-muted)]">
                            {projectNextAction(project)}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <StatusBadge status={project.status} />
                            <PriorityBadge project={project} />
                          </span>
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] tabular-nums sm:text-right",
                            days < 0
                              ? "text-[var(--app-danger)]"
                              : "text-[var(--app-muted)]"
                          )}
                        >
                          {days < 0
                            ? `${Math.abs(days)}d late`
                            : days === 0
                              ? "Due today"
                              : formatDate(project.dueDate, {
                                  month: "short",
                                  day: "numeric",
                                })}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <EmptySection label="No deadlines, blockers, or reviews need attention." />
              )}
            </ContentSection>
          </motion.div>

          <motion.div
            className="order-3"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.12,
              duration: reduceMotion ? 0 : 0.55,
              ease: easing,
            }}
          >
            <SplitPane
              ratio="inspector-xl"
              className="items-stretch"
              primary={
                <div className="h-full min-w-0">
                  <ContentSection
                    title="Projects"
                    titleId="projects-heading"
                    className="h-full"
                    bodyMode="flush"
                    actions={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-[var(--app-muted)] hover:text-[var(--app-ink)]"
                          onClick={() => setShowCompleted((value) => !value)}
                          aria-pressed={showCompleted}
                        >
                          {showCompleted
                            ? "Hide delivered"
                            : `Show delivered (${props.visibleProjects.filter(delivered).length})`}
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-[var(--app-muted)] hover:text-[var(--app-ink)]"
                        >
                          <Link href="/projects">
                            View all projects
                            <ArrowRight
                              className="size-3.5"
                              strokeWidth={1.75}
                            />
                          </Link>
                        </Button>
                      </div>
                    }
                  >
                    <DataTableFrame bounded={false}>
                      {ledgerProjects.length ? (
                        <>
                          <div className="sm:hidden">
                            <div className={sectionListClassName}>
                              {table
                                .getRowModel()
                                .rows.slice(0, LEDGER_PREVIEW_ROWS)
                                .map((row, rowIndex) => {
                                  const project = row.original;
                                  const progress = getProjectProgress(project);
                                  return (
                                    <MotionButton
                                      key={row.id}
                                      type="button"
                                      variant="ghost"
                                      data-testid="mobile-project-row"
                                      className={cn(
                                        sectionRowClassName,
                                        "h-auto w-full grid grid-cols-[minmax(0,1fr)_auto] justify-start gap-3 whitespace-normal px-3 py-2 text-left font-normal hover:bg-[var(--app-hover)] dark:hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] active:translate-y-0 active:scale-100",
                                        selected?.id === project.id &&
                                          "bg-[var(--app-active)]"
                                      )}
                                      initial={
                                        reduceMotion
                                          ? false
                                          : { opacity: 0, y: 8 }
                                      }
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        delay: reduceMotion
                                          ? 0
                                          : Math.min(rowIndex * 0.08, 0.4),
                                        duration: reduceMotion ? 0 : 0.4,
                                        ease: easing,
                                      }}
                                      onClick={() =>
                                        props.onViewProject(project)
                                      }
                                    >
                                      <div className="min-w-0">
                                        <span className="flex items-center gap-2">
                                          <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
                                            {project.title}
                                          </span>
                                          <StatusBadge
                                            status={project.status}
                                          />
                                        </span>
                                        <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">
                                          {project.client || project.workType} ·{" "}
                                          {formatDate(project.dueDate, {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                        <Progress
                                          value={progress}
                                          aria-hidden="true"
                                          className="mt-2.5 h-1 rounded-sm bg-[var(--app-progress-track)] [&_[data-slot=progress-indicator]]:rounded-sm [&_[data-slot=progress-indicator]]:bg-[var(--app-accent)]"
                                        />
                                      </div>
                                      <span className="flex flex-col items-end justify-between">
                                        <PriorityBadge project={project} />
                                        <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--app-muted)]">
                                          {progress}%
                                        </span>
                                      </span>
                                    </MotionButton>
                                  );
                                })}
                            </div>
                          </div>
                          <div className="hidden sm:block">
                            <Table
                              className="w-full min-w-[700px] border-collapse"
                              aria-label="Projects"
                            >
                              <TableCaption className="sr-only">
                                Recent projects with type, due date, status,
                                progress, value, and actions.
                              </TableCaption>
                              <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                  <TableRow
                                    key={headerGroup.id}
                                    className="border-y border-[var(--app-border)] bg-[var(--app-soft-panel)]/60"
                                  >
                                    {headerGroup.headers.map((header) => (
                                      <TableHead
                                        key={header.id}
                                        aria-sort={
                                          header.column.getIsSorted() === "asc"
                                            ? "ascending"
                                            : header.column.getIsSorted() ===
                                                "desc"
                                              ? "descending"
                                              : "none"
                                        }
                                        className={cn(
                                          "h-8 px-3 text-left text-xs font-medium text-[var(--app-subtle)]",
                                          header.column.id === "workType" &&
                                            "hidden 2xl:table-cell"
                                        )}
                                      >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="group h-auto gap-1 rounded-sm px-0 py-1 text-left text-xs hover:bg-transparent hover:text-[var(--app-ink)] dark:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] active:translate-y-0 active:scale-100"
                                            onClick={header.column.getToggleSortingHandler()}
                                          >
                                            {flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                            )}
                                            <SortIcon
                                              direction={header.column.getIsSorted()}
                                            />
                                          </Button>
                                        ) : (
                                          flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                          )
                                        )}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableHeader>
                              <motion.tbody
                                key={`${props.query}-${props.statusFilter}-${props.kindFilter}-${props.clientFilter}-${props.dueFilter}-${props.billingFilter}-${props.sortKey}`}
                                className="[&_tr]:border-0"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: reduceMotion ? 0 : 0.25,
                                }}
                              >
                                {table
                                  .getRowModel()
                                  .rows.slice(0, LEDGER_PREVIEW_ROWS)
                                  .map((row, rowIndex) => (
                                    <motion.tr
                                      key={row.id}
                                      role="button"
                                      tabIndex={0}
                                      data-testid="project-row"
                                      data-project-title={row.original.title}
                                      data-project-id={row.original.id}
                                      aria-selected={
                                        selected?.id === row.original.id
                                      }
                                      aria-label={`Select ${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate, { month: "short", day: "numeric" })}.`}
                                      className={cn(
                                        "h-[var(--workspace-row-height,58px)] cursor-pointer border-0 outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                                        selected?.id === row.original.id &&
                                          "bg-[var(--app-active)]"
                                      )}
                                      initial={
                                        reduceMotion
                                          ? false
                                          : { opacity: 0, y: 8 }
                                      }
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        delay: reduceMotion
                                          ? 0
                                          : Math.min(rowIndex * 0.08, 0.4),
                                        duration: reduceMotion ? 0 : 0.4,
                                        ease: easing,
                                      }}
                                      onClick={() => {
                                        setSelectedId(row.original.id);
                                        if (
                                          window.matchMedia(
                                            "(max-width: 1279px)"
                                          ).matches
                                        ) {
                                          setMobileInspectorOpen(true);
                                        }
                                      }}
                                      onDoubleClick={() =>
                                        props.onViewProject(row.original)
                                      }
                                      onKeyDown={(event) =>
                                        handleRowKeyDown(
                                          event,
                                          row.original,
                                          rowIndex
                                        )
                                      }
                                    >
                                      {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                          key={cell.id}
                                          className={cn(
                                            "px-3 py-2 text-xs text-[var(--app-ink)]",
                                            cell.column.id === "workType" &&
                                              "hidden 2xl:table-cell"
                                          )}
                                        >
                                          {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                          )}
                                        </TableCell>
                                      ))}
                                    </motion.tr>
                                  ))}
                              </motion.tbody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <MotionEmpty
                          className="grid flex-none place-items-center gap-0 rounded-none border-0 px-6 py-6 text-center [text-wrap:wrap] md:px-6 md:py-6"
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.4,
                            ease: easing,
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium tracking-[-0.01em]">
                              No projects in this view
                            </p>
                            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--app-muted)]">
                              {activeFilterCount || props.query
                                ? "No projects match the current filters."
                                : props.visibleProjects.length > 0
                                  ? "No unfinished projects. Show delivered to see completed work."
                                  : "Create the first project in your workspace."}
                            </p>
                            <div className="mt-3 flex justify-center gap-2">
                              {activeFilterCount || props.query ? (
                                <Button
                                  variant="outline"
                                  className="h-9 rounded-lg shadow-none transition-transform active:scale-[0.98]"
                                  size="sm"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </Button>
                              ) : null}
                              <Button
                                className="h-9 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-none hover:bg-[var(--app-accent)]/90"
                                size="sm"
                                onClick={props.onNewProject}
                                disabled={!props.canCreateProjects}
                              >
                                Create project
                              </Button>
                            </div>
                          </div>
                        </MotionEmpty>
                      )}
                    </DataTableFrame>
                  </ContentSection>
                </div>
              }
              secondary={
                // The inspector is positioned inside this box so the ledger,
                // not the inspector, sets the row height.
                <div className="relative h-full min-w-0">
                  <ProjectInspector
                    project={selected}
                    settings={props.settings}
                    onOpen={props.onViewProject}
                    onEdit={props.onEditProject}
                    canEdit={props.canEditProjects}
                  />
                </div>
              }
            />
          </motion.div>

          <motion.section
            className="order-4"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.12,
              duration: reduceMotion ? 0 : 0.55,
              ease: easing,
            }}
            aria-label="Workspace follow-up"
          >
            <ContentSection
              title="Activity"
              titleId="activity-heading"
              actions={
                <Tabs
                  value={activityMode}
                  onValueChange={(value) =>
                    changeActivityMode(value === "team" ? "team" : "recent")
                  }
                  className="block"
                >
                  <TabsList aria-label="Activity view">
                    <TabsTrigger
                      id="activity-recent-tab"
                      aria-controls="activity-panel"
                      value="recent"
                      className="text-xs"
                    >
                      Recent
                    </TabsTrigger>
                    <TabsTrigger
                      id="activity-team-tab"
                      aria-controls="activity-panel"
                      value="team"
                      className="text-xs"
                    >
                      Team
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            >
              <div
                id="activity-panel"
                role="tabpanel"
                aria-labelledby={`activity-${activityMode}-tab`}
                className="min-h-40"
              >
                {props.teamLoading && activityMode === "team" ? (
                  <ActivitySkeleton />
                ) : activity.length ? (
                  <motion.div
                    key={activityMode}
                    className={sectionListClassName}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.3,
                      ease: easing,
                    }}
                  >
                    {activity.slice(0, 4).map((item, index) => (
                      <motion.div
                        key={item.id}
                        className={cn(
                          sectionRowClassName,
                          "flex items-start gap-3"
                        )}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: reduceMotion ? 0 : index * 0.08,
                          ease: easing,
                        }}
                      >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--app-muted)]" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-[11px] font-medium leading-4 text-[var(--app-ink)]">
                            {item.message}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--app-muted)]">
                            {item.actor || props.teamName || "Workspace"} ·{" "}
                            {relativeActivityTime(item.createdAt)}
                          </span>
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptySection label="No activity yet." />
                )}
              </div>
            </ContentSection>
          </motion.section>
        </PageContent>

        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto p-0 sm:max-w-md xl:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Project details</SheetTitle>
              <SheetDescription>
                Review the selected project and open its full workspace.
              </SheetDescription>
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
    </WorkspacePage>
  );
}

function EmptySection({ label }: { label: string }) {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <MotionEmpty
      className="flex-none items-start justify-start gap-0 rounded-none border-0 p-0 px-4 pb-4 text-left text-xs leading-relaxed text-[var(--app-muted)] [text-wrap:wrap] md:px-4 md:pt-0 md:pb-4"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {label}
    </MotionEmpty>
  );
}

function ActivitySkeleton() {
  return (
    <div
      className={sectionListClassName}
      aria-label="Loading team activity"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className={cn(sectionRowClassName, "flex items-start gap-3")}
        >
          <span className="size-6 shrink-0 rounded-md bg-[var(--app-soft-panel)]" />
          <div className="flex-1 space-y-2">
            <div
              className="h-2.5 rounded-sm bg-[var(--app-soft-panel)]"
              style={{ width: `${78 - item * 9}%` }}
            />
            <div className="h-2 w-24 rounded-sm bg-[var(--app-soft-panel)] opacity-60" />
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
      <MotionCard
        className={cn(
          surface,
          mobile
            ? "grid min-h-[420px] place-items-center rounded-none border-0 shadow-none"
            : "absolute inset-0 grid place-items-center"
        )}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Empty className="flex-none gap-0 rounded-none border-0 p-8 text-center [text-wrap:wrap] md:p-8">
          <EmptyHeader className="max-w-none gap-0">
            <EmptyMedia
              variant="default"
              className="mx-auto grid size-10 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)]"
            >
              <FolderKanban
                className="size-4 text-[var(--app-muted)]"
                strokeWidth={1.75}
              />
            </EmptyMedia>
            <p className="mt-4 text-sm font-medium tracking-[-0.01em]">
              Select a project
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-muted)]">
              Project context will stay visible here.
            </p>
          </EmptyHeader>
        </Empty>
      </MotionCard>
    );
  }

  const progress = getProjectProgress(project);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <MotionCard
        key={project.id}
        className={cn(
          "bg-[var(--app-panel)] shadow-none",
          mobile
            ? "min-h-dvh overflow-y-auto rounded-none border-0"
            : "absolute inset-0 overflow-y-auto rounded-xl"
        )}
        initial={reduceMotion ? false : { opacity: 0.65, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.16, ease: easing }}
      >
        <motion.div
          className={cn("flex items-start gap-3", mobile ? "p-5" : "p-3.5")}
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--app-accent)]" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-medium tracking-[-0.02em] leading-snug">
              {project.title}
            </h2>
            <div className="mt-2">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Project actions"
              >
                <MoreHorizontal strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpen(project)}>
                Open project
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canEdit && Boolean(project.teamId)}
                onSelect={() => onEdit(project)}
              >
                Edit project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        <div className={cn(mobile ? "space-y-4 p-5" : "space-y-3 p-3.5")}>
          <div
            className={cn(
              "grid grid-cols-2 gap-x-4",
              mobile ? "gap-y-4" : "gap-y-3"
            )}
          >
            <InspectorField
              icon={UsersRound}
              label="Client"
              value={project.client || "No client"}
            />
            <InspectorField
              icon={FolderKanban}
              label="Type"
              value={project.workType}
            />
            <InspectorField
              icon={CalendarClock}
              label="Due date"
              value={formatDate(project.dueDate, {
                month: "short",
                day: "numeric",
              })}
            />
            <InspectorField
              icon={AlertCircle}
              label="Priority"
              value={priorityFor(project)}
            />
          </div>

          <div
            className={cn(
              "border-t border-[var(--app-border)]",
              mobile ? "pt-4" : "pt-3"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--app-muted)]">
                Progress
              </p>
              <span className="font-mono text-[11px] tabular-nums text-[var(--app-muted)]">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              aria-hidden="true"
              className="mt-2 h-1.5 rounded-sm bg-[var(--app-progress-track)] [&_[data-slot=progress-indicator]]:rounded-sm [&_[data-slot=progress-indicator]]:bg-[var(--app-accent)]"
            />
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-muted)]">
              {progress === 100
                ? "Delivery complete"
                : `${Math.max(1, Math.round((100 - progress) / 10))} production steps remaining`}
            </p>
          </div>

          {project.notes ? (
            <p className="border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-muted)]">
              {project.notes}
            </p>
          ) : null}

          <div
            className={cn(
              "flex items-end justify-between gap-4 border-t border-[var(--app-border)]",
              mobile ? "pt-4" : "pt-3"
            )}
          >
            <div>
              <p className="text-xs font-medium text-[var(--app-muted)]">
                Value
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                {project.workType === settings.salaryWorkType
                  ? "Paid per batch"
                  : formatMoney(project.earnings, settings.currencyCode)}
              </p>
            </div>
            <Button
              className="h-8 rounded-md bg-[var(--app-accent)] px-3 text-[11px] font-semibold text-[var(--app-accent-foreground)] shadow-none hover:bg-[var(--app-accent)]/90"
              onClick={() => onOpen(project)}
              aria-label={`Open project ${project.title}`}
            >
              Open <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </MotionCard>
    </AnimatePresence>
  );
}

function InspectorField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-3.5 text-[var(--app-muted)]"
        strokeWidth={1.75}
      />
      <div>
        <p className="text-xs font-medium text-[var(--app-subtle)]">{label}</p>
        <p className="mt-1 text-[13px] font-medium tracking-[-0.01em]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return (
      <ArrowUp className="size-3 text-[var(--app-ink)]" strokeWidth={1.75} />
    );
  if (direction === "desc")
    return (
      <ArrowDown className="size-3 text-[var(--app-ink)]" strokeWidth={1.75} />
    );
  return (
    <ArrowUpDown
      className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
      strokeWidth={1.75}
    />
  );
}

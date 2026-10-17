import { getProjectProgress } from "@/features/projects/project-domain";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit3,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "@/components/icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { animate } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SalaryBatch, WorkItem, SettingsState } from "@/lib/types";
import type { ProjectStatus } from "@/lib/domain-values";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusColor } from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedMeter } from "@/components/ui/segmented-meter";
import { Sparkline } from "@/components/ui/sparkline";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContentSection,
  MetricItem,
  MetricStrip,
  PageEmptyState,
  sectionListClassName,
  sectionRowClassName,
  TopBarActions,
  WorkspacePage,
} from "@/components/workspace-page";
import { normalizedSalaryBatchSize } from "@/features/routes/utils/work-type-utils";

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
    salaryBatchSize: number | null;
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
  /** Workspace deadline-risk panel, shown beside Activity when provided. */
  riskRadar?: ReactNode;
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
  { value: "ALL", label: "Any payment" },
  { value: "Paid", label: "Paid" },
  { value: "Unpaid", label: "Unpaid" },
] as const satisfies ReadonlyArray<{
  value: "ALL" | "Paid" | "Unpaid";
  label: string;
}>;

/** The dashboard previews a fixed number of rows; Projects shows the rest. */
const LEDGER_PREVIEW_ROWS = 5;
const ATTENTION_ROWS = 5;
const ACTIVITY_ROWS = 5;

/** Counts up to a new value once; reduced motion shows the value at once. */
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
      duration: 0.4,
      ease: [0.2, 0, 0, 1],
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
    // Animates from wherever the number is now; displayValue is not a trigger.
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

/** A Project's stage as a word; stages are not trouble, so none is warm. */
function StatusWord({ status }: { status: WorkItem["status"] }) {
  return (
    <span
      className="type-label-sm whitespace-nowrap"
      style={{ color: projectStatusColor(status) }}
    >
      {status}
    </span>
  );
}

/** When a Project is due, warm only when it is late. */
function DueWord({ project }: { project: WorkItem }) {
  const days = daysFromToday(project.dueDate);
  const late = !delivered(project) && days < 0;
  return (
    <span
      className={cn(
        "type-label-sm whitespace-nowrap data",
        late ? "text-fail-text" : "text-text-2"
      )}
    >
      {late
        ? `${Math.abs(days)}d late`
        : days === 0
          ? "Due today"
          : formatDate(project.dueDate, { month: "short", day: "numeric" })}
    </span>
  );
}

export function PrecisionDashboard(props: DashboardProps) {
  const [selectedId, setSelectedId] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activityMode, setActivityMode] = useState<"recent" | "team">("recent");

  const selected =
    props.projects.find((project) => project.id === selectedId) ?? null;

  function peek(project: WorkItem) {
    setSelectedId(project.id);
    setInspectorOpen(true);
  }

  /** Paid value per week over the last eight weeks, oldest first. */
  const paidTrend = useMemo(() => {
    const weeks = Array.from({ length: 8 }, () => 0);
    const now = Date.now();
    for (const project of props.projects) {
      if (!project.paid || !(project.earnings > 0)) continue;
      const paidAt = Date.parse(project.paidDate || project.completedAt || "");
      if (Number.isNaN(paidAt)) continue;
      const weeksAgo = Math.floor((now - paidAt) / (7 * 86_400_000));
      if (weeksAgo >= 0 && weeksAgo < weeks.length)
        weeks[weeks.length - 1 - weeksAgo] += project.earnings;
    }
    return weeks;
  }, [props.projects]);

  const { overdue, dueThisWeek, waitingReviews, blockers } = useMemo(() => {
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

  const salarySize =
    props.stats.salaryBatchSize ??
    normalizedSalaryBatchSize(props.settings.salaryBatchSize);
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
  const showSalaryBatch = props.stats.salaryBatchSize !== null;
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
            <span className="block min-w-[200px]">
              <span className="block truncate type-label text-text-1">
                {project.title}
              </span>
              <span className="mt-0.5 block max-w-[280px] truncate type-label-sm text-text-3">
                {project.client || project.workType}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor("workType", {
        header: "Type",
        cell: (info) => (
          <span className="whitespace-nowrap type-label-sm text-text-2">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due",
        cell: ({ row }) => <DueWord project={row.original} />,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusWord status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const progress = getProjectProgress(row.original);
          return (
            <div className="flex w-[120px] items-center gap-2">
              <SegmentedMeter
                value={progress}
                segments={12}
                className="flex-1"
              />
              <span className="w-8 text-end type-label-sm text-text-2 data">
                {progress}%
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("earnings", {
        header: "Value",
        cell: ({ getValue, row }) => (
          <span className="whitespace-nowrap type-label text-text-1 data">
            {row.original.workType === props.settings.salaryWorkType
              ? "Batch"
              : formatMoney(getValue(), props.settings.currencyCode)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
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
                  <MoreHorizontal />
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
                  <Edit3 /> Edit project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
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
  const ledgerRows = table.getRowModel().rows.slice(0, LEDGER_PREVIEW_ROWS);

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
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.dueDate).getTime() -
            new Date(a.createdAt || a.dueDate).getTime()
        )
        .slice(0, ACTIVITY_ROWS)
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
      peek(project);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const nextIndex = Math.min(
      ledgerRows.length - 1,
      Math.max(0, rowIndex + (event.key === "ArrowDown" ? 1 : -1))
    );
    const nextProject = ledgerRows[nextIndex]?.original;
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

  const attention = [...blockers, ...overdue]
    .filter(
      (project, index, projects) =>
        projects.findIndex((candidate) => candidate.id === project.id) === index
    )
    .slice(0, ATTENTION_ROWS);

  return (
    <WorkspacePage family="data-index" className="gap-4">
      {props.canCreateProjects ? (
        <TopBarActions>
          <Button size="sm" onClick={props.onNewProject}>
            <Plus />
            New project
          </Button>
        </TopBarActions>
      ) : null}

      <MetricStrip columns={showSalaryBatch ? 5 : 4} aria-label="Overview">
        <MetricItem
          label="Active"
          value={<AnimatedNumber value={props.stats.active} />}
          supporting={`of ${props.stats.total} projects`}
        />
        <MetricItem
          label="Due this week"
          value={<AnimatedNumber value={dueThisWeek.length} />}
          supporting={
            overdue.length ? (
              <span className="text-fail-text">{overdue.length} overdue</span>
            ) : (
              "None overdue"
            )
          }
        />
        <MetricItem
          label="In review"
          value={<AnimatedNumber value={waitingReviews.length} />}
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
          supporting={
            <span className="flex items-center gap-3">
              <span className="shrink-0">
                {formatMoney(
                  props.stats.outstanding,
                  props.settings.currencyCode
                )}{" "}
                unpaid
              </span>
              {paidTrend.some(Boolean) ? (
                <Sparkline
                  data={paidTrend}
                  aria-label="Paid value per week, last 8 weeks"
                  className="h-4 min-w-12 flex-1"
                />
              ) : null}
            </span>
          }
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
                <span className="type-label-sm text-text-3">
                  / {salarySize} edits
                </span>
              </span>
            }
            action={
              <Button
                type="button"
                variant="outline"
                size="xs"
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
              <span className="flex items-center gap-3">
                <span className="shrink-0 data">{salaryPercent}%</span>
                <SegmentedMeter
                  value={salaryPercent}
                  tone="accent"
                  className="flex-1"
                />
              </span>
            }
          />
        ) : null}
      </MetricStrip>

      <div className="grid min-w-0 animate-rise gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ContentSection
            title="Needs attention"
            metadata={
              attention.length ? (
                <span className="type-label-sm text-text-3 data">
                  {attention.length}
                </span>
              ) : null
            }
            bodyMode="flush"
          >
            {attention.length ? (
              <ul className={sectionListClassName}>
                {attention.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className={cn(
                        sectionRowClassName,
                        "grid w-full gap-x-4 gap-y-1 text-start outline-none focus-visible:focus-ring-inset sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center",
                        selected?.id === project.id &&
                          inspectorOpen &&
                          "bg-selected"
                      )}
                      onClick={() => peek(project)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate type-label text-text-1">
                          {project.title}
                        </span>
                        <span className="block truncate type-label-sm text-text-3">
                          {project.client || project.workType}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-3">
                        <StatusWord status={project.status} />
                        <span className="truncate type-body-sm text-text-2">
                          {projectNextAction(project)}
                        </span>
                      </span>
                      <DueWord project={project} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <PageEmptyState
                compact
                title="Nothing needs attention"
                description="No deadlines, blockers or reviews are waiting on you."
              />
            )}
          </ContentSection>

          <ContentSection
            title="Projects"
            titleId="projects-heading"
            bodyMode="flush"
            actions={
              <>
                <div className="relative w-full sm:w-44">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3"
                  />
                  <Input
                    value={props.query}
                    onChange={(event) => props.setQuery(event.target.value)}
                    placeholder="Search"
                    aria-label="Search dashboard projects"
                    className="h-(--control-sm) ps-8"
                  />
                </div>
                <ProjectFilterMenu
                  {...props}
                  activeFilterCount={activeFilterCount}
                  onClear={clearFilters}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Display options"
                    >
                      <SlidersHorizontal />
                      <span className="hidden sm:inline">Display</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={props.sortKey}
                      onValueChange={(value) =>
                        props.setSortKey(value as SortKey)
                      }
                    >
                      {sortOptions.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={showCompleted}
                      onCheckedChange={(checked) =>
                        setShowCompleted(checked === true)
                      }
                    >
                      Show delivered (
                      {props.visibleProjects.filter(delivered).length})
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/projects">All projects</Link>
                </Button>
              </>
            }
          >
            {ledgerRows.length ? (
              <>
                <ul className={cn(sectionListClassName, "sm:hidden")}>
                  {ledgerRows.map((row) => {
                    const project = row.original;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          data-testid="mobile-project-row"
                          className={cn(
                            sectionRowClassName,
                            "flex w-full items-center gap-3 text-start outline-none focus-visible:focus-ring-inset"
                          )}
                          onClick={() => peek(project)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate type-label text-text-1">
                              {project.title}
                            </span>
                            <span className="mt-0.5 flex items-center gap-2">
                              <StatusWord status={project.status} />
                              <DueWord project={project} />
                            </span>
                          </span>
                          <span className="type-label-sm text-text-2 data">
                            {getProjectProgress(project)}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden sm:block">
                  <Table className="min-w-[680px]" aria-label="Projects">
                    <TableCaption className="sr-only">
                      Recent projects with type, due date, status, progress,
                      value and actions.
                    </TableCaption>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              aria-sort={
                                header.column.getIsSorted() === "asc"
                                  ? "ascending"
                                  : header.column.getIsSorted() === "desc"
                                    ? "descending"
                                    : "none"
                              }
                              className={cn(
                                header.column.id === "workType" &&
                                  "hidden 2xl:table-cell",
                                header.column.id === "actions" && "w-10"
                              )}
                            >
                              {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                <button
                                  type="button"
                                  className="group inline-flex items-center gap-1 rounded-inner hover:text-text-1"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  <SortIcon
                                    direction={header.column.getIsSorted()}
                                  />
                                </button>
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
                    <TableBody>
                      {ledgerRows.map((row, rowIndex) => (
                        <TableRow
                          key={row.id}
                          tabIndex={0}
                          data-testid="project-row"
                          data-project-title={row.original.title}
                          data-project-id={row.original.id}
                          data-state={
                            selected?.id === row.original.id && inspectorOpen
                              ? "selected"
                              : undefined
                          }
                          aria-label={`${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate, { month: "short", day: "numeric" })}. Press Enter to open, Space to preview.`}
                          className="cursor-pointer outline-none focus-visible:focus-ring-inset"
                          onClick={() => peek(row.original)}
                          onDoubleClick={() =>
                            props.onViewProject(row.original)
                          }
                          onKeyDown={(event) =>
                            handleRowKeyDown(event, row.original, rowIndex)
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                cell.column.id === "workType" &&
                                  "hidden 2xl:table-cell",
                                cell.column.id === "actions" && "px-1"
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <PageEmptyState
                compact
                title="No projects in this view"
                description={
                  activeFilterCount || props.query
                    ? "No projects match the current filters."
                    : props.visibleProjects.length > 0
                      ? "Every project is delivered. Turn on Show delivered under Display to see them."
                      : "Create the first project in your workspace."
                }
                action={
                  <>
                    {activeFilterCount || props.query ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={props.onNewProject}
                      disabled={!props.canCreateProjects}
                    >
                      Create project
                    </Button>
                  </>
                }
              />
            )}
          </ContentSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <ContentSection
            title="Activity"
            titleId="activity-heading"
            bodyMode="flush"
            actions={
              <Tabs
                value={activityMode}
                onValueChange={(value) =>
                  setActivityMode(value === "team" ? "team" : "recent")
                }
              >
                <TabsList
                  aria-label="Activity view"
                  className="h-(--control-sm)"
                >
                  <TabsTrigger
                    id="activity-recent-tab"
                    aria-controls="activity-panel"
                    value="recent"
                    className="type-label-sm"
                  >
                    Recent
                  </TabsTrigger>
                  <TabsTrigger
                    id="activity-team-tab"
                    aria-controls="activity-panel"
                    value="team"
                    className="type-label-sm"
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
            >
              {props.teamLoading && activityMode === "team" ? (
                <ActivitySkeleton />
              ) : activity.length ? (
                <ul
                  key={activityMode}
                  className={cn(sectionListClassName, "animate-rise")}
                >
                  {activity.slice(0, ACTIVITY_ROWS).map((item) => (
                    <li key={item.id} className="rule-row px-4 py-2.5">
                      <p className="line-clamp-2 type-label text-text-1">
                        {item.message}
                      </p>
                      <p className="mt-0.5 flex gap-2 type-label-sm text-text-3">
                        <span className="truncate">
                          {item.actor || props.teamName || "Workspace"}
                        </span>
                        <span className="shrink-0">
                          {relativeActivityTime(item.createdAt)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <PageEmptyState
                  compact
                  title="No activity yet"
                  description="Project changes and team updates show up here."
                />
              )}
            </div>
          </ContentSection>
          {props.riskRadar}
        </div>
      </div>

      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Project details</SheetTitle>
            <SheetDescription>
              Review the selected project and open its full workspace.
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <ProjectInspector
              project={selected}
              settings={props.settings}
              onOpen={props.onViewProject}
              onEdit={props.onEditProject}
              canEdit={props.canEditProjects}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </WorkspacePage>
  );
}

/**
 * Every ledger filter in one menu, as Linear's Filter button: each filter is
 * a submenu showing its current choice, and Clear resets them all.
 */
function ProjectFilterMenu(
  props: DashboardProps & { activeFilterCount: number; onClear: () => void }
) {
  const filters = [
    {
      label: "Status",
      value: props.statusFilter,
      options: statusOptions.map((value) => ({
        value,
        label: value === "All" ? "Any status" : value,
      })),
      onChange: (value: string) =>
        props.setStatusFilter(value as ProjectStatus | "All"),
    },
    {
      label: "Type",
      value: props.kindFilter,
      options: props.projectTagOptions.map((value) => ({
        value,
        label: value === "ALL" ? "Any type" : value,
      })),
      onChange: props.setKindFilter,
    },
    {
      label: "Client",
      value: props.clientFilter,
      options: props.clientOptions.map((value) => ({
        value,
        label: value === "ALL" ? "Any client" : value,
      })),
      onChange: props.setClientFilter,
    },
    {
      label: "Due",
      value: props.dueFilter,
      options: dueOptions,
      onChange: (value: string) => props.setDueFilter(value as DueFilter),
    },
    {
      label: "Payment",
      value: props.billingFilter,
      options: billingOptions,
      onChange: (value: string) =>
        props.setBillingFilter(value as "ALL" | "Paid" | "Unpaid"),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={
            props.activeFilterCount
              ? `Filter projects, ${props.activeFilterCount} active`
              : "Filter projects"
          }
        >
          <ListFilter />
          <span className="hidden sm:inline">Filter</span>
          {props.activeFilterCount ? (
            <span className="rounded-inner bg-tile px-1 type-label-sm data">
              {props.activeFilterCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {filters.map((filter) => {
          const current = filter.options.find(
            (option) => option.value === filter.value
          );
          return (
            <DropdownMenuSub key={filter.label}>
              <DropdownMenuSubTrigger>
                <span>{filter.label}</span>
                <span className="ms-auto truncate ps-3 type-label-sm text-text-3">
                  {current?.label}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-52">
                <DropdownMenuRadioGroup
                  value={filter.value}
                  onValueChange={filter.onChange}
                >
                  {filter.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!props.activeFilterCount && !props.query}
          onSelect={props.onClear}
        >
          Clear filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        <div key={item} className="rule-row space-y-2 px-4 py-3">
          <div
            className="h-2.5 rounded-inner bg-(--surface-skeleton)"
            style={{ width: `${78 - item * 9}%` }}
          />
          <div className="h-2 w-24 rounded-inner bg-(--surface-skeleton)" />
        </div>
      ))}
    </div>
  );
}

/**
 * The selected Project in the side sheet: what it is, where it stands, and
 * the one next step (Open project).
 */
function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
}: {
  project: WorkItem;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
}) {
  const progress = getProjectProgress(project);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-start gap-3 p-5 pe-12">
        <div className="min-w-0 flex-1">
          <h2 className="type-heading-xs text-text-1">{project.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-3">
            <StatusWord status={project.status} />
            <DueWord project={project} />
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 pb-5 type-label">
        <dt className="text-text-3">Client</dt>
        <dd className="text-text-1">{project.client || "No client"}</dd>
        <dt className="text-text-3">Type</dt>
        <dd className="text-text-1">{project.workType}</dd>
        <dt className="text-text-3">Due date</dt>
        <dd className="text-text-1 data">
          {formatDate(project.dueDate, { month: "short", day: "numeric" })}
        </dd>
        <dt className="text-text-3">Priority</dt>
        <dd className="text-text-1">{priorityFor(project)}</dd>
        <dt className="text-text-3">Value</dt>
        <dd className="text-text-1 data">
          {project.workType === settings.salaryWorkType
            ? "Paid per batch"
            : formatMoney(project.earnings, settings.currencyCode)}
        </dd>
      </dl>

      <div className="rule-top px-5 py-4">
        <div className="flex items-center justify-between type-label">
          <span className="text-text-2">Progress</span>
          <span className="text-text-1 data">{progress}%</span>
        </div>
        <SegmentedMeter value={progress} segments={24} className="mt-2" />
        <p className="mt-2 type-body-sm text-text-2">
          {progress === 100 ? "Delivery complete." : projectNextAction(project)}
        </p>
      </div>

      {project.notes ? (
        <p className="rule-top px-5 py-4 type-body-sm text-text-2">
          {project.notes}
        </p>
      ) : null}

      <div className="mt-auto flex justify-end gap-2 rule-top p-4">
        <Button
          variant="outline"
          disabled={!canEdit && Boolean(project.teamId)}
          onClick={() => onEdit(project)}
        >
          Edit
        </Button>
        <Button onClick={() => onOpen(project)}>Open project</Button>
      </div>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-3 text-text-1" />;
  if (direction === "desc") return <ArrowDown className="size-3 text-text-1" />;
  return (
    <ArrowUpDown className="size-3 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 group-focus-visible:opacity-100" />
  );
}

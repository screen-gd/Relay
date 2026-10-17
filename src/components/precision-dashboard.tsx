import { getProjectProgress } from "@/features/projects/project-domain";

import { Sparkline } from "@/components/dither-kit/sparkline";
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
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SegmentedMeter } from "@/components/ui/segmented-meter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContentSection,
  DataTableFrame,
  MetricItem,
  MetricStrip,
  PageContent,
  PageEmptyState,
  PageFilters,
  sectionListClassName,
  sectionRowClassName,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { normalizedSalaryBatchSize } from "@/features/routes/utils/work-type-utils";
import type { ProjectStatus } from "@/lib/domain-values";
import { projectStatusTone } from "@/lib/project-status-style";
import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  /** Workspace deadline-risk panel, shown below Needs attention when provided. */
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
          variant="secondary"
          aria-label={ariaLabel}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{selectedOption?.label ?? value}</span>
          <ChevronDown
            className="size-4 shrink-0 text-[var(--text-meta)]"
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

/** The dashboard ledger previews a fixed number of rows; Projects shows the rest. */
const LEDGER_PREVIEW_ROWS = 5;

function FormattedNumber({
  value,
  format = (number) => Math.round(number).toLocaleString("en"),
}: {
  value: number;
  format?: (value: number) => string;
}) {
  return <>{format(value)}</>;
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

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  return <Badge status={projectStatusTone(status)}>{status}</Badge>;
}

function PriorityBadge({ project }: { project: WorkItem }) {
  const priority = priorityFor(project);
  const status =
    priority === "Urgent" || priority === "High"
      ? "danger"
      : priority === "Medium"
        ? "warning"
        : "neutral";
  return <Badge status={status}>{priority}</Badge>;
}

export function PrecisionDashboard(props: DashboardProps) {
  const [selectedId, setSelectedId] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [activityMode, setActivityMode] = useState<"recent" | "team">("recent");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);
  function openMobileInspector() {
    inspectorTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setMobileInspectorOpen(true);
  }

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
            <div className="flex min-w-[220px] items-center gap-3">
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-[var(--text-primary)]">
                  {project.title}
                </span>
                <span className="mt-1 block max-w-[260px] truncate text-meta text-[var(--text-meta)]">
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
          <span className="whitespace-nowrap text-meta text-[var(--text-meta)]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due date",
        cell: (info) => (
          <span className="whitespace-nowrap font-mono text-meta tabular-nums text-[var(--text-meta)]">
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
              <div className="mb-2 flex items-center justify-between text-meta">
                <span className="font-mono tabular-nums text-[var(--text-meta)]">
                  {progress}%
                </span>
                <PriorityBadge project={row.original} />
              </div>
              <SegmentedMeter value={progress} segments={14} />
            </div>
          );
        },
      }),
      columnHelper.accessor("earnings", {
        header: "Value",
        cell: ({ getValue, row }) => (
          <span className="whitespace-nowrap font-mono text-meta font-medium tabular-nums text-[var(--text-primary)]">
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
                  variant="destructive"
                  className="text-[var(--status-danger)]"
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
      <div className="contents">
        <PageFilters
          primary={
            <div className="relative min-w-[220px] flex-1 lg:w-[300px] lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-meta)]"
                strokeWidth={1.75}
              />
              <Input
                value={props.query}
                onChange={(event) => props.setQuery(event.target.value)}
                placeholder="Search projects"
                aria-label="Search dashboard projects"
                className="pl-8"
              />
            </div>
          }
          secondary={
            <>
              <Button
                variant="secondary"
                className=""
                ref={filterTriggerRef}
                aria-haspopup="dialog"
                aria-expanded={showFilters}
                aria-controls="dashboard-filters"
                onClick={() => setShowFilters((value) => !value)}
              >
                <ListFilter className="size-4" strokeWidth={1.75} />
                Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
              </Button>
              <DashboardDropdown
                value={props.sortKey}
                options={sortOptions}
                onChange={props.setSortKey}
                ariaLabel="Sort dashboard projects"
                className="h-9 w-[142px] bg-[var(--surface-fill)]"
                contentClassName="min-w-[142px]"
              />
              {activeFilterCount > 0 || props.query ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className=""
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
              ) : null}
            </>
          }
        />
        <PageContent className="flex flex-col">
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetContent
              id="dashboard-filters"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                filterTriggerRef.current?.focus();
              }}
            >
              <SheetHeader>
                <SheetTitle>Project filters</SheetTitle>
                <SheetDescription>
                  Filter the dashboard projects.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 p-4">
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
              </div>
            </SheetContent>
          </Sheet>

          <div className="order-1">
            <div className="min-w-0">
              <MetricStrip
                columns={showSalaryBatch ? 5 : 4}
                aria-label="Overview"
                className="gap-2"
              >
                <MetricItem
                  label="Active"
                  value={
                    <span className="text-[var(--text-primary)]">
                      <FormattedNumber value={props.stats.active} />
                    </span>
                  }
                  supporting={`of ${props.stats.total} projects`}
                />
                <MetricItem
                  label="Due this week"
                  value={<FormattedNumber value={dueThisWeek.length} />}
                  supporting="to deliver"
                />
                <MetricItem
                  label="In review"
                  value={
                    <span
                      className={cn(
                        waitingReviews.length && "text-[var(--text-primary)]"
                      )}
                    >
                      <FormattedNumber value={waitingReviews.length} />
                    </span>
                  }
                  supporting="Reviews and revisions"
                />
                <MetricItem
                  label="Paid"
                  value={
                    <FormattedNumber
                      value={props.stats.collected}
                      format={(value) =>
                        formatMoney(value, props.settings.currencyCode)
                      }
                    />
                  }
                  supporting={
                    <>
                      {`${formatMoney(
                        props.stats.outstanding,
                        props.settings.currencyCode
                      )} unpaid`}
                      {paidTrend.some(Boolean) ? (
                        <div
                          role="img"
                          aria-label="Paid value per week, last 8 weeks"
                          className="mt-2 h-8"
                        >
                          <Sparkline data={paidTrend} color="accent" />
                        </div>
                      ) : null}
                    </>
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
                        <FormattedNumber value={salaryProgress} />
                        <span className="text-meta font-normal text-[var(--text-meta)]">
                          / {salarySize} edits
                        </span>
                      </span>
                    }
                    action={
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className=""
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
                        <SegmentedMeter
                          value={salaryPercent}
                          className="flex-1"
                        />
                      </div>
                    }
                  />
                ) : null}
              </MetricStrip>
            </div>
          </div>

          <div className="order-2">
            <ContentSection
              title="Needs attention"
              actions={
                overdue.length ? (
                  <span className="text-meta text-[var(--text-primary)]">
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
                      <button
                        key={project.id}
                        type="button"
                        className={cn(
                          sectionRowClassName,
                          "grid w-full gap-3 whitespace-normal text-left font-normal hover:bg-[var(--surface-fill)] sm:grid-cols-[minmax(180px,300px)_minmax(200px,1fr)_auto] sm:items-center text-[var(--text-primary)]",
                          selected?.id === project.id &&
                            "bg-[var(--surface-active)] text-[var(--text-primary)]"
                        )}
                        onClick={() => {
                          setSelectedId(project.id);
                          if (window.matchMedia("(max-width: 1023px)").matches)
                            openMobileInspector();
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-body font-medium text-[var(--text-primary)]">
                            {project.title}
                          </span>
                          <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                            {project.client || project.workType}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-meta text-[var(--text-meta)]">
                            {projectNextAction(project)}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <StatusBadge status={project.status} />
                            <PriorityBadge project={project} />
                          </span>
                        </span>
                        <span
                          className={cn(
                            "font-mono text-meta tabular-nums sm:text-right",
                            days < 0
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-meta)]"
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
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptySection label="No deadlines, blockers, or reviews need attention." />
              )}
            </ContentSection>
          </div>

          {props.riskRadar ? (
            <div className="order-2">{props.riskRadar}</div>
          ) : null}

          <div className="order-3">
            <SplitPane
              ratio="inspector"
              mobileInspector="external"
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
                          className=""
                          onClick={() => setShowCompleted((value) => !value)}
                          aria-pressed={showCompleted}
                        >
                          {showCompleted
                            ? "Hide delivered"
                            : `Show delivered (${props.visibleProjects.filter(delivered).length})`}
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="">
                          <Link to="/projects">
                            View all projects
                            <ArrowRight className="size-4" strokeWidth={1.75} />
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
                                    <button
                                      key={row.id}
                                      type="button"
                                      data-testid="mobile-project-row"
                                      className={cn(
                                        sectionRowClassName,
                                        "min-h-10 w-full grid grid-cols-[minmax(0,1fr)_auto] justify-start gap-3 whitespace-normal px-3 py-2 text-left font-normal hover:bg-[var(--surface-fill)] dark:hover:bg-[var(--surface-fill)] text-[var(--text-primary)] min-h-10",
                                        selected?.id === project.id &&
                                          "bg-[var(--surface-active)] text-[var(--text-primary)] min-h-10"
                                      )}
                                      onClick={() =>
                                        props.onViewProject(project)
                                      }
                                    >
                                      <div className="min-w-0">
                                        <span className="flex items-center gap-2">
                                          <span className="truncate text-body font-medium">
                                            {project.title}
                                          </span>
                                          <StatusBadge
                                            status={project.status}
                                          />
                                        </span>
                                        <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                                          {project.client || project.workType} ·{" "}
                                          {formatDate(project.dueDate, {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                        <Progress
                                          value={progress}
                                          aria-hidden="true"
                                          className="mt-3"
                                        />
                                      </div>
                                      <span className="flex flex-col items-end justify-between">
                                        <PriorityBadge project={project} />
                                        <span className="font-mono text-meta font-medium tabular-nums text-[var(--text-meta)]">
                                          {progress}%
                                        </span>
                                      </span>
                                    </button>
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
                                  <TableRow key={headerGroup.id}>
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
                                          "h-10 px-3 text-left text-meta font-medium text-[var(--text-meta)]",
                                          header.column.id === "workType" &&
                                            "hidden 2xl:table-cell"
                                        )}
                                      >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="group gap-1 text-left"
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
                              <tbody
                                key={`${props.query}-${props.statusFilter}-${props.kindFilter}-${props.clientFilter}-${props.dueFilter}-${props.billingFilter}-${props.sortKey}`}
                                className=""
                              >
                                {table
                                  .getRowModel()
                                  .rows.slice(0, LEDGER_PREVIEW_ROWS)
                                  .map((row, rowIndex) => (
                                    <tr
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
                                        "h-10 cursor-pointer border-b border-[var(--border-table)] last:border-0 transition-colors hover:bg-[var(--surface-fill)]",
                                        selected?.id === row.original.id &&
                                          "bg-[var(--surface-active)]"
                                      )}
                                      onClick={() => {
                                        setSelectedId(row.original.id);
                                        if (
                                          window.matchMedia(
                                            "(max-width: 1023px)"
                                          ).matches
                                        ) {
                                          openMobileInspector();
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
                                            "px-3 py-2 text-body text-[var(--text-primary)]",
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
                                    </tr>
                                  ))}
                              </tbody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <PageEmptyState
                          compact
                          icon={<FolderKanban />}
                          title="No projects in this view"
                          description={
                            activeFilterCount || props.query
                              ? "No projects match the current filters."
                              : props.visibleProjects.length > 0
                                ? "Show delivered to see completed work."
                                : "Create the first project in your workspace."
                          }
                          action={
                            activeFilterCount || props.query ? (
                              <Button variant="ghost" onClick={clearFilters}>
                                Clear filters
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                onClick={props.onNewProject}
                                disabled={!props.canCreateProjects}
                              >
                                Create project
                              </Button>
                            )
                          }
                        />
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
          </div>

          <section className="order-4" aria-label="Workspace follow-up">
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
                      className="text-meta"
                    >
                      Recent
                    </TabsTrigger>
                    <TabsTrigger
                      id="activity-team-tab"
                      aria-controls="activity-panel"
                      value="team"
                      className="text-meta"
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
                  <div key={activityMode} className={sectionListClassName}>
                    {activity.slice(0, 4).map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          sectionRowClassName,
                          "flex items-start gap-3"
                        )}
                      >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--text-meta)]" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-meta font-medium text-[var(--text-primary)]">
                            {item.message}
                          </span>
                          <span className="mt-1 block text-meta text-[var(--text-meta)]">
                            {item.actor || props.teamName || "Workspace"} ·{" "}
                            {relativeActivityTime(item.createdAt)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySection label="No activity yet." />
                )}
              </div>
            </ContentSection>
          </section>
        </PageContent>

        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto p-0 sm:max-w-md lg:hidden"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (inspectorTriggerRef.current?.isConnected)
                inspectorTriggerRef.current.focus();
              else document.getElementById("main-content")?.focus();
            }}
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
      </div>
    </WorkspacePage>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <Empty className="flex-none items-start justify-start gap-0 rounded-none border-0 p-0 px-4 pb-4 text-left text-meta text-[var(--text-meta)] [text-wrap:wrap] md:px-4 md:pt-0 md:pb-4">
      {label}
    </Empty>
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
          <span className="size-6 shrink-0 rounded-sm bg-[var(--surface-skeleton)]" />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 rounded-sm bg-[var(--surface-skeleton)]"
              style={{ width: `${78 - item * 9}%` }}
            />
            <div className="h-2 w-24 rounded-sm bg-[var(--surface-skeleton)]" />
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
  if (!project) {
    return (
      <PageEmptyState
        compact
        icon={<FolderKanban />}
        title="Select a project"
        description="Project context will stay visible here."
      />
    );
  }

  const progress = getProjectProgress(project);

  return (
    <div
      key={project.id}
      className={cn("", mobile ? "min-h-0" : "h-full overflow-y-auto")}
    >
      <div className={cn("flex items-start gap-3", mobile ? "p-4" : "pb-4")}>
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--surface-active)]" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-title font-medium">{project.title}</h2>
          <div className="mt-2">
            <StatusBadge status={project.status} />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Project actions">
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
      </div>

      <div className={cn(mobile ? "space-y-4 p-4" : "space-y-3")}>
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

        <div className={cn("", mobile ? "pt-4" : "pt-3")}>
          <div className="flex items-center justify-between">
            <p className="text-section text-[var(--text-primary)]">Progress</p>
            <span className="font-mono text-meta tabular-nums text-[var(--text-meta)]">
              {progress}%
            </span>
          </div>
          <SegmentedMeter value={progress} segments={24} className="mt-2" />
          <p className="mt-2 text-meta text-[var(--text-meta)]">
            {progress === 100 ? "Delivery complete" : `${progress}% complete`}
          </p>
        </div>

        {project.notes ? (
          <p className="pt-3 text-body text-[var(--text-primary)]">
            {project.notes}
          </p>
        ) : null}

        <div
          className={cn(
            "flex items-end justify-between gap-4",
            mobile ? "pt-4" : "pt-3"
          )}
        >
          <div>
            <p className="text-section text-[var(--text-primary)]">Value</p>
            <p className="mt-1 text-title font-semibold tabular-nums">
              {project.workType === settings.salaryWorkType
                ? "Paid per batch"
                : formatMoney(project.earnings, settings.currencyCode)}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => onOpen(project)}
            aria-label={`Open project ${project.title}`}
          >
            Open <ArrowRight className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
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
        className="mt-1 size-4 text-[var(--text-meta)]"
        strokeWidth={1.75}
      />
      <div>
        <p className="text-section text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-body font-medium">{value}</p>
      </div>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return (
      <ArrowUp
        className="size-3 text-[var(--text-primary)]"
        strokeWidth={1.75}
      />
    );
  if (direction === "desc")
    return (
      <ArrowDown
        className="size-3 text-[var(--text-primary)]"
        strokeWidth={1.75}
      />
    );
  return (
    <ArrowUpDown
      className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
      strokeWidth={1.75}
    />
  );
}

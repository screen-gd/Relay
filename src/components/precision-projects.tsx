"use client";

import { getProjectProgress } from "@/features/projects/project-domain";

import {
  AlertCircle,
  Archive,
  ArrowRight,
  Check,
  ChevronDown,
  Edit3,
  Film,
  FolderKanban,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "@/components/icons";
import {
  KanbanBoard,
  KanbanCard,
  KanbanHeader,
} from "@/components/kibo-ui/kanban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTableFrame,
  PageActions,
  PageContent,
  PageEmptyState,
  PageFilters,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import type { ProjectStageMenuChoice } from "@/features/projects/project-domain";
import { useProjectTableController } from "@/features/projects/project-table-controller";
import {
  DEFAULT_PROJECT_TABLE_STATE,
  parseProjectTableSearch,
} from "@/features/projects/project-table-domain";
import type { StoredTeamRole } from "@/lib/domain-values";
import { projectStatusTone } from "@/lib/project-status-style";
import type { SettingsState, WorkflowStage, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDndContext,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type WorkspaceScope = "personal" | "team";

type ProjectMenuOption<T extends string> = {
  value: T;
  label: string;
};

function ProjectDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  contentClassName,
}: {
  value: T;
  options: readonly ProjectMenuOption<T>[];
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
          className={cn(
            "min-w-0 shrink-0 justify-between gap-3 overflow-hidden",
            className
          )}
        >
          <span className="truncate">
            {selectedOption?.label ?? "Choose an option"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-[var(--text-meta)]" />
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
            <span>{option.label}</span>
            <Check
              className={cn(
                "size-4",
                option.value === value ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-meta font-medium text-[var(--text-meta)]">
        {label}
      </span>
      {children}
    </div>
  );
}

type PrecisionProjectsProps = {
  settings: SettingsState;
  personalProjects: WorkItem[];
  teamProjects: WorkItem[];
  teamName?: string;
  currentUserId: string;
  currentUserRole?: StoredTeamRole;
  teamMembers: ReadonlyArray<{ userId: string; name: string }>;
  allowAllTeamProjects?: boolean;
  loading?: boolean;
  error?: string;
  onNewProject: (scope: WorkspaceScope) => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onArchiveProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProjectStatus: (project: WorkItem, status: string) => void;
  canCreateProjects: boolean;
  canCreateTeamProjects: boolean;
  canEditProjects: boolean;
  canUpdateProjectStatus: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
  onManageProjectGroups: (scope: WorkspaceScope) => void;
  /** Opens completed Projects; omitted where every Project is already listed. */
  onOpenHistory?: () => void;
  /** Shown above the list, such as the Free Project limit. */
  notice?: ReactNode;
};

const columnHelper = createColumnHelper<WorkItem>();

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function projectColor(project: WorkItem) {
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

function projectNextAction(project: WorkItem) {
  if (project.status === "Delivered")
    return "Archive final exports and confirm the payment record.";
  if (["Review", "Client Review"].includes(project.status))
    return "Collect review notes and prepare the next client-ready version.";
  if (project.status === "Revision")
    return "Apply the requested revisions and send the updated cut.";
  if (project.status === "In Progress")
    return "Finish this stage before sending it to the client.";
  return "Confirm the brief, owner, and first production milestone.";
}

/**
 * Decorative project swatch shown beside the project title in the table,
 * board and inspector. Projects carry no media runtime, so it shows none and
 * stays hidden from assistive tech; the adjacent title names the project.
 */
function ProjectThumbnail({
  project,
  className,
}: {
  project: WorkItem;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="project-thumbnail"
      className={cn(
        "relative isolate flex h-8 w-14 shrink-0 overflow-hidden rounded-md",
        className
      )}
      style={{ background: projectColor(project) }}
    >
      <span className="absolute -right-3 top-1/2 h-[130%] w-[52%] -translate-y-1/2 rotate-12 bg-[var(--surface-active)] opacity-45" />
      <span className="absolute inset-x-2 top-2 flex items-center justify-between text-[var(--text-meta)]">
        <Film className="size-4" />
        <span className="size-1.5 rounded-full bg-current opacity-60" />
      </span>
    </span>
  );
}

/**
 * Converts mouse-wheel input over board chrome into horizontal board scroll.
 * Returns a callback ref so the listener attaches whenever the board mounts,
 * including after switching from the table view.
 */
function useBoardHorizontalWheel() {
  return useCallback((board: HTMLDivElement | null) => {
    if (!board) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-board-card]")) return;
      // Populated columns keep native vertical scrolling.
      const column = target.closest<HTMLElement>("[data-board-column-body]");
      if (column && column.scrollHeight > column.clientHeight) return;
      const wheelTarget = target.closest("[data-board-wheel]");
      if (!wheelTarget || !board.contains(wheelTarget)) return;
      if (event.shiftKey || event.deltaX !== 0) return;
      if (event.deltaY === 0) return;

      const maxScrollLeft = board.scrollWidth - board.clientWidth;
      if (maxScrollLeft <= 0) return;

      const nextScrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, board.scrollLeft + event.deltaY)
      );
      if (nextScrollLeft === board.scrollLeft) return;

      event.preventDefault();
      board.scrollLeft = nextScrollLeft;
    };

    board.addEventListener("wheel", handleWheel, { passive: false });
    return () => board.removeEventListener("wheel", handleWheel);
  }, []);
}

function ProjectBoardCard({
  project,
  selected,
  disabled,
  stageChoices,
  onSelect,
  onOpen,
  onUpdateProjectStatus,
}: {
  project: WorkItem;
  selected: boolean;
  disabled: boolean;
  stageChoices: ProjectStageMenuChoice[];
  onSelect: () => void;
  onOpen: () => void;
  onUpdateProjectStatus: PrecisionProjectsProps["onUpdateProjectStatus"];
}) {
  return (
    <KanbanCard
      id={project.id}
      disabled={disabled}
      className={cn(selected && "bg-[var(--surface-active)]")}
    >
      {({ attributes, listeners, setActivatorNodeRef }) => (
        <>
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            className={cn(
              "h-auto min-w-0 flex-1 touch-none flex-col items-start justify-start gap-0 text-left whitespace-normal hover:text-current",
              !disabled && "cursor-grab active:cursor-grabbing"
            )}
            onClick={onSelect}
            onDoubleClick={onOpen}
            {...listeners}
            {...attributes}
          >
            <span className="block w-full truncate text-section">
              {project.title}
            </span>
            <span className="mt-1 block w-full truncate text-meta text-[var(--text-meta)]">
              {project.client || "No client"}
            </span>
            <span className="mt-3 block text-meta text-[var(--text-meta)]">
              {formatDate(project.dueDate)}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label={`Change stage for ${project.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {stageChoices.map((choice) => (
                <DropdownMenuItem
                  key={choice.stage.id}
                  aria-label={choice.ariaLabel}
                  disabled={choice.disabled}
                  onSelect={() =>
                    onUpdateProjectStatus(project, choice.stage.id)
                  }
                >
                  {choice.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </KanbanCard>
  );
}

function ProjectBoardDragOverlay({ projects }: { projects: WorkItem[] }) {
  const { active } = useDndContext();
  const project = projects.find((item) => item.id === active?.id);
  // Render outside scroll containers so the preview can cross column boundaries.
  return typeof document === "undefined"
    ? null
    : createPortal(
        <DragOverlay dropAnimation={null}>
          {project ? (
            <Card className="min-w-0 gap-1 p-3 text-left cursor-grabbing">
              <span className="truncate text-section">{project.title}</span>
              <span className="truncate text-meta text-[var(--text-meta)]">
                {project.client || "No client"}
              </span>
              <span className="mt-2 text-meta text-[var(--text-meta)]">
                {formatDate(project.dueDate)}
              </span>
            </Card>
          ) : null}
        </DragOverlay>,
        document.body
      );
}

function ProjectBoardColumn({
  columnKey,
  stage,
  projects,
  children,
}: {
  columnKey: string;
  stage: WorkflowStage;
  projects: number;
  children: ReactNode;
}) {
  return (
    <KanbanBoard
      id={`stage:${columnKey}`}
      className="min-h-0 min-w-0"
      aria-label={`${stage.label} projects`}
    >
      <KanbanHeader
        data-board-wheel
        className="flex shrink-0 items-center justify-between px-3 py-3 text-body font-medium text-[var(--text-primary)]"
      >
        <span>{stage.label}</span>
        <span className="text-meta font-normal tabular-nums text-[var(--text-meta)]">
          {projects}
        </span>
      </KanbanHeader>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain p-2",
          projects === 0 && "text-center"
        )}
        data-board-column-body
        data-board-wheel={projects === 0 ? true : undefined}
      >
        {projects === 0 ? (
          <span className="mt-3 block text-meta text-[var(--text-meta)]">
            Drop here
          </span>
        ) : (
          <div className="grid gap-2">{children}</div>
        )}
      </div>
    </KanbanBoard>
  );
}

export function PrecisionProjects(props: PrecisionProjectsProps) {
  const [scope, setScope] = useState<WorkspaceScope>("personal");
  const [selectedId, setSelectedId] = useState("");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);
  function openMobileInspector() {
    inspectorTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setMobileInspectorOpen(true);
  }

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasTeam = Boolean(props.teamName);
  const boardRef = useBoardHorizontalWheel();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const {
    state: tableState,
    deferredState: deferredTableState,
    setState: setTableState,
    isUpdating,
    source,
    projects,
    board,
    hasFilters,
    showAssignees,
    getPaymentState,
    isSalaryProject,
    canMoveProject,
    resolveMoveStage,
    getStageChoices,
  } = useProjectTableController({
    scope,
    personalProjects: props.personalProjects,
    teamProjects: props.teamProjects,
    clients: props.settings.clients,
    salaryWorkType: props.settings.salaryWorkType,
    currentUserId: props.currentUserId,
    currentUserRole: props.currentUserRole,
    allowAllTeamProjects: props.allowAllTeamProjects ?? false,
    activeTeamMemberCount: props.teamMembers.length,
    canUpdateProjectStatus: props.canUpdateProjectStatus,
  });

  useEffect(() => {
    if (!hasTeam && scope === "team") setScope("personal");
  }, [hasTeam, scope]);

  const selected =
    source.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const activeFilterCount = [
    tableState.stage !== "all",
    Boolean(tableState.clientId),
    tableState.payment !== "all",
    tableState.salary !== "all",
    tableState.archive !== "active",
    Boolean(tableState.assigneeUserId),
  ].filter(Boolean).length;
  const projectName = (id: string | number) =>
    projects.find((project) => project.id === String(id))?.title ?? "Project";
  const dropStage = (id: string | number | undefined) => {
    const value = String(id ?? "");
    return value.startsWith("stage:") ? value.slice(6) : undefined;
  };
  const validMove = (projectId: string | number, stage: string | undefined) => {
    const project = projects.find(
      (candidate) => candidate.id === String(projectId)
    );
    return Boolean(project && stage && canMoveProject(project, stage));
  };
  const stageLabel = (stageId: string | undefined) =>
    board.find(({ key }) => key === stageId)?.stage.label ?? stageId;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${projectName(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const stage = dropStage(over?.id);
      return stage
        ? `${projectName(active.id)} is over ${stageLabel(stage)}.`
        : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const stage = dropStage(over?.id);
      return validMove(active.id, stage)
        ? `Requested move for ${projectName(active.id)} to ${stageLabel(stage)}.`
        : `${projectName(active.id)} was not moved.`;
    },
    onDragCancel: ({ active }) =>
      `Moving ${projectName(active.id)} was cancelled.`,
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const project = projects.find(
      (candidate) => candidate.id === String(active.id)
    );
    const columnKey = dropStage(over?.id);
    if (project && columnKey && canMoveProject(project, columnKey)) {
      const stageId = resolveMoveStage(project, columnKey);
      if (stageId !== undefined) {
        props.onUpdateProjectStatus(project, stageId);
      }
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Name",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <ProjectThumbnail project={row.original} />
            <div className="min-w-0">
              <p className="truncate text-section">{row.original.title}</p>
              <p className="mt-1 max-w-[300px] truncate text-meta text-[var(--text-meta)]">
                {row.original.notes || "No notes"}
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "client",
        header: "Client",
        cell: ({ row }) => (
          <span className="block truncate text-meta">
            {props.settings.clients.find(
              (client) => client.id === row.original.clientId
            )?.name ??
              row.original.client ??
              "No client"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Stage",
        cell: (info) => (
          <Badge
            variant="secondary"
            status={projectStatusTone(info.getValue())}
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due",
        cell: (info) => (
          <span className="whitespace-nowrap text-meta">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "payment",
        header: "Payment",
        cell: ({ row }) => (
          <span className="text-meta capitalize">
            {getPaymentState(row.original).replace("-", " ")}
          </span>
        ),
      }),
      columnHelper.display({
        id: "salary",
        header: "Salary",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-meta">
            {isSalaryProject(row.original)
              ? "Salary"
              : money(row.original.earnings, props.settings.currencyCode)}
          </span>
        ),
      }),
      ...(showAssignees
        ? [
            columnHelper.display({
              id: "assignees",
              header: "Assignees",
              cell: ({ row }) => {
                const names = (row.original.assigneeUserIds ?? [])
                  .map(
                    (id) =>
                      props.teamMembers.find((member) => member.userId === id)
                        ?.name
                  )
                  .filter((name): name is string => Boolean(name));
                return (
                  <span className="block truncate text-meta">
                    {names.join(", ") || "Unassigned"}
                  </span>
                );
              },
            }),
          ]
        : []),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className=""
                aria-label={`Actions for ${row.original.title}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => props.onViewProject(row.original)}
              >
                Open project
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  !props.canEditProjects && Boolean(row.original.teamId)
                }
                onSelect={() => props.onEditProject(row.original)}
              >
                <Edit3 /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => props.onArchiveProject(row.original)}
              >
                <Archive /> {row.original.archived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="text-[var(--status-danger)]"
                disabled={!props.canDeleteProject(row.original)}
                onSelect={() => props.onDeleteProject(row.original.id)}
              >
                <Trash2 /> Permanently delete (Owner only)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [
      props.canDeleteProject,
      props.canEditProjects,
      props.onArchiveProject,
      props.onDeleteProject,
      props.onEditProject,
      props.onViewProject,
      props.settings.currencyCode,
      props.settings.clients,
      props.teamMembers,
      getPaymentState,
      isSalaryProject,
      showAssignees,
    ]
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <WorkspacePage
      family="data-index"
      mode="fill"
      className="min-w-0 overflow-visible lg:min-h-full lg:overflow-visible"
    >
      <div className="contents">
        <PageHeader
          title="Projects"
          actions={
            <PageActions
              primary={
                <Button
                  className=""
                  onClick={() => props.onNewProject(scope)}
                  disabled={
                    scope === "personal"
                      ? !props.canCreateProjects
                      : !hasTeam || !props.canCreateTeamProjects
                  }
                >
                  <Plus /> Create project
                </Button>
              }
              more={[
                {
                  label: "Project Groups",
                  onSelect: () => props.onManageProjectGroups(scope),
                },
                ...(props.onOpenHistory
                  ? [{ label: "History", onSelect: props.onOpenHistory }]
                  : []),
              ]}
            />
          }
        />

        <PageContent mode="fill">
          {props.notice}
          <PageFilters
            primary={
              <>
                <div className="relative min-w-0 flex-1 sm:max-w-[560px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-meta)]" />
                  <Input
                    value={tableState.query}
                    onChange={(event) =>
                      setTableState((state) => ({
                        ...state,
                        query: event.target.value,
                      }))
                    }
                    placeholder="Search project, client, or note..."
                    aria-label="Search projects"
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 gap-2"
                  onClick={() => setFiltersOpen(true)}
                  aria-label="Open project filters"
                >
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeFilterCount ? (
                    <span className="grid size-4 place-items-center rounded-md bg-[var(--surface-active)] text-meta tabular-nums">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </>
            }
            secondary={
              <>
                <Tabs
                  value={tableState.view}
                  onValueChange={(view) =>
                    setTableState((state) => ({
                      ...state,
                      view: view === "board" ? "board" : "table",
                    }))
                  }
                  className="block"
                >
                  <TabsList aria-label="Project view">
                    <TabsTrigger
                      id="project-table-tab"
                      aria-controls="project-library-panel"
                      value="table"
                    >
                      Table
                    </TabsTrigger>
                    <TabsTrigger
                      id="project-board-tab"
                      aria-controls="project-library-panel"
                      value="board"
                    >
                      Board
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs
                  value={scope}
                  onValueChange={(value) =>
                    setScope(value === "team" && hasTeam ? "team" : "personal")
                  }
                  className="block"
                >
                  <TabsList aria-label="Project scope">
                    <TabsTrigger
                      id="project-personal-tab"
                      aria-controls="project-library-panel"
                      value="personal"
                    >
                      My Projects{" "}
                      <span className="text-meta">
                        {props.personalProjects.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      id="project-team-tab"
                      aria-controls="project-library-panel"
                      value="team"
                      disabled={!hasTeam}
                    >
                      Team Projects{" "}
                      <span className="text-meta">
                        {props.teamProjects.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <ProjectDropdown
                  value={
                    // "Due first" has one urgency order; old dir=desc links land on it.
                    tableState.sort === "due"
                      ? "due:asc"
                      : `${tableState.sort}:${tableState.direction}`
                  }
                  onChange={(value) => {
                    const [sort, direction] = value.split(":");
                    const parsed = parseProjectTableSearch(
                      `sort=${sort}&dir=${direction}`
                    );
                    setTableState((state) => ({
                      ...state,
                      sort: parsed.sort,
                      direction: parsed.direction,
                    }));
                  }}
                  ariaLabel="Sort projects"
                  className="w-[176px]"
                  options={[
                    { value: "due:asc", label: "Due first" },
                    { value: "delivered:desc", label: "Recently delivered" },
                    { value: "name:asc", label: "Name A-Z" },
                    { value: "stage:asc", label: "Stage" },
                    { value: "payment:asc", label: "Payment" },
                    { value: "salary:desc", label: "Salary first" },
                  ]}
                />
              </>
            }
          />

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              side="right"
              className="w-[min(92vw,400px)] gap-0 bg-[var(--surface-fill)] p-0"
            >
              <SheetHeader className="px-4 py-4">
                <SheetTitle>Project filters</SheetTitle>
                <SheetDescription>
                  Narrow the project list without crowding the workspace
                  toolbar.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 overflow-y-auto px-4 py-4">
                <FilterField label="Stage">
                  <ProjectDropdown
                    value={tableState.stage}
                    onChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        stage: parseProjectTableSearch(
                          `stage=${encodeURIComponent(value)}`
                        ).stage,
                      }))
                    }
                    ariaLabel="Filter projects by status"
                    className="w-full"
                    options={[
                      { value: "all", label: "All stages" },
                      { value: "Planned", label: "Planned" },
                      { value: "In Progress", label: "In Progress" },
                      { value: "Review", label: "Review" },
                      { value: "Client Review", label: "Client Review" },
                      { value: "Revision", label: "Revision" },
                      { value: "Delivered", label: "Delivered" },
                      { value: "Cancelled", label: "Cancelled" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Client">
                  <ProjectDropdown
                    value={tableState.clientId || "all"}
                    onChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        clientId: value === "all" ? "" : value,
                      }))
                    }
                    ariaLabel="Filter projects by client"
                    className="w-full"
                    options={[
                      { value: "all", label: "All clients" },
                      ...props.settings.clients
                        .filter((client) => !client.archived)
                        .map((client) => ({
                          value: client.id,
                          label: client.name,
                        })),
                    ]}
                  />
                </FilterField>
                <FilterField label="Payment">
                  <ProjectDropdown
                    value={tableState.payment}
                    onChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        payment: parseProjectTableSearch(`payment=${value}`)
                          .payment,
                      }))
                    }
                    ariaLabel="Filter projects by payment"
                    className="w-full"
                    options={[
                      { value: "all", label: "All payments" },
                      { value: "paid", label: "Paid" },
                      { value: "unpaid", label: "Unpaid" },
                      { value: "not-billable", label: "Not billable" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Work type">
                  <ProjectDropdown
                    value={tableState.salary}
                    onChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        salary: parseProjectTableSearch(`salary=${value}`)
                          .salary,
                      }))
                    }
                    ariaLabel="Filter projects by salary type"
                    className="w-full"
                    options={[
                      { value: "all", label: "All work" },
                      { value: "salary", label: "Salary" },
                      { value: "client", label: "Client work" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Archive">
                  <ProjectDropdown
                    value={tableState.archive}
                    onChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        archive: parseProjectTableSearch(`archive=${value}`)
                          .archive,
                      }))
                    }
                    ariaLabel="Filter archived projects"
                    className="w-full"
                    options={[
                      { value: "active", label: "Unarchived" },
                      { value: "archived", label: "Archived" },
                      { value: "all", label: "All records" },
                    ]}
                  />
                </FilterField>
                {showAssignees ? (
                  <FilterField label="Assignee">
                    <ProjectDropdown
                      value={tableState.assigneeUserId || "all"}
                      onChange={(value) =>
                        setTableState((state) => ({
                          ...state,
                          assigneeUserId: value === "all" ? "" : value,
                        }))
                      }
                      ariaLabel="Filter projects by assignee"
                      className="w-full"
                      options={[
                        { value: "all", label: "All assignees" },
                        ...props.settings.teamMembers.map((member) => ({
                          value: member.id,
                          label: member.name,
                        })),
                      ]}
                    />
                  </FilterField>
                ) : null}
              </div>
              <div className="mt-auto flex items-center justify-between px-4 py-4">
                <span className="text-meta text-[var(--text-meta)]">
                  {activeFilterCount} active{" "}
                  {activeFilterCount === 1 ? "filter" : "filters"}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!activeFilterCount}
                  onClick={() =>
                    setTableState((state) => ({
                      ...DEFAULT_PROJECT_TABLE_STATE,
                      view: state.view,
                    }))
                  }
                >
                  Clear filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-h-0 flex-1">
            <SplitPane
              ratio="inspector"
              mobileInspector="external"
              className="h-full min-h-0"
              primary={
                <DataTableFrame
                  id="project-library-panel"
                  role="tabpanel"
                  aria-labelledby={`project-${tableState.view}-tab project-${scope}-tab`}
                  aria-busy={isUpdating}
                  bodyLabel="Project library viewport"
                  className="relative h-full min-h-0 overflow-visible"
                  bodyClassName="flex min-h-0 flex-1 flex-col max-lg:flex-none max-lg:overflow-visible"
                >
                  {isUpdating ? (
                    <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-[var(--surface-active)]" />
                  ) : null}
                  {tableState.view === "table" ? (
                    <header className="flex h-12 items-center justify-between px-4">
                      <span
                        className="flex items-center gap-2 text-meta text-[var(--text-meta)]"
                        aria-live="polite"
                      >
                        <span
                          key={`${scope}-${deferredTableState.stage}-${projects.length}`}
                        >
                          {projects.length} records
                        </span>
                      </span>
                    </header>
                  ) : null}

                  {props.error ? (
                    <PageEmptyState
                      tone="error"
                      role="alert"
                      icon={<AlertCircle />}
                      title="Projects could not load"
                      description={props.error}
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => window.location.reload()}
                        >
                          Try again
                        </Button>
                      }
                    />
                  ) : props.loading ? (
                    <div aria-label="Loading projects">
                      <ProjectTableSkeleton />
                    </div>
                  ) : projects.length ? (
                    tableState.view === "board" ? (
                      <DndContext
                        sensors={sensors}
                        accessibility={{ announcements }}
                        onDragEnd={handleDragEnd}
                      >
                        <div
                          ref={boardRef}
                          data-board-wheel
                          className="grid min-h-0 flex-1 auto-cols-[minmax(232px,1fr)] grid-flow-col items-stretch gap-3 overflow-x-auto overflow-y-hidden bg-[var(--surface-fill)] px-3 pb-3 pt-3"
                          aria-label="Project board"
                        >
                          {board.map(
                            ({ key, stage, projects: stageProjects }) => {
                              return (
                                <ProjectBoardColumn
                                  key={key}
                                  columnKey={key}
                                  stage={stage}
                                  projects={stageProjects.length}
                                >
                                  {stageProjects.map((project) => (
                                    <ProjectBoardCard
                                      key={project.id}
                                      project={project}
                                      selected={selected?.id === project.id}
                                      disabled={
                                        !props.canUpdateProjectStatus &&
                                        Boolean(project.teamId)
                                      }
                                      stageChoices={getStageChoices(project)}
                                      onSelect={() => setSelectedId(project.id)}
                                      onOpen={() =>
                                        props.onViewProject(project)
                                      }
                                      onUpdateProjectStatus={
                                        props.onUpdateProjectStatus
                                      }
                                    />
                                  ))}
                                </ProjectBoardColumn>
                              );
                            }
                          )}
                        </div>
                        <ProjectBoardDragOverlay projects={projects} />
                      </DndContext>
                    ) : (
                      <>
                        <div className="lg:hidden" aria-label="Project cards">
                          {table.getRowModel().rows.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              data-testid="mobile-project-row"
                              data-project-title={row.original.title}
                              aria-label={`Open ${row.original.title} project details`}
                              className={cn(
                                "h-auto w-full grid grid-cols-[48px_minmax(0,1fr)_auto] justify-start items-center gap-3 px-3 py-3 text-left font-normal whitespace-normal hover:bg-[var(--surface-fill)] dark:hover:bg-[var(--surface-fill)] text-[var(--text-primary)] min-h-10",
                                selected?.id === row.original.id &&
                                  "bg-[var(--surface-active)] text-[var(--text-primary)] min-h-10"
                              )}
                              onClick={() => {
                                setSelectedId(row.original.id);
                                openMobileInspector();
                              }}
                            >
                              <ProjectThumbnail
                                project={row.original}
                                className="h-12 w-16"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-section">
                                  {row.original.title}
                                </span>
                                <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                                  {row.original.client || row.original.workType}
                                </span>
                              </span>
                              <Badge
                                variant="secondary"
                                status={projectStatusTone(row.original.status)}
                              >
                                {row.original.status}
                              </Badge>
                            </button>
                          ))}
                        </div>
                        <div
                          className="hidden min-h-0 flex-1 overflow-y-auto overscroll-contain lg:block"
                          tabIndex={0}
                          aria-label="Scrollable project library"
                        >
                          <Table
                            className="w-full table-fixed border-collapse"
                            aria-label={`${scope === "team" ? "Team" : "Personal"} project library`}
                          >
                            <TableCaption className="sr-only">
                              Projects with due date, status, progress, and
                              value. Select a row to inspect it.
                            </TableCaption>
                            <TableHeader>
                              {table.getHeaderGroups().map((group) => (
                                <TableRow key={group.id}>
                                  {group.headers.map((header) => (
                                    <TableHead
                                      key={header.id}
                                      className={cn(
                                        "h-10 px-3 text-left text-meta font-medium text-[var(--text-meta)]",
                                        header.column.id === "title" &&
                                          "w-[25%]",
                                        header.column.id === "client" &&
                                          "w-[13%]",
                                        header.column.id === "dueDate" &&
                                          "w-[12%]",
                                        header.column.id === "status" &&
                                          "w-[12%]",
                                        header.column.id === "payment" &&
                                          "w-[10%]",
                                        header.column.id === "salary" &&
                                          "w-[12%]",
                                        header.column.id === "assignees" &&
                                          "w-[12%]",
                                        header.column.id === "actions" &&
                                          "w-[4%]"
                                      )}
                                    >
                                      {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                          )}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              ))}
                            </TableHeader>
                            <TableBody className="">
                              {table.getRowModel().rows.map((row) => (
                                <tr
                                  key={row.id}
                                  role="button"
                                  tabIndex={0}
                                  data-testid="project-row"
                                  data-project-title={row.original.title}
                                  aria-selected={
                                    selected?.id === row.original.id
                                  }
                                  aria-label={`Select ${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate)}.`}
                                  className={cn(
                                    "h-10 cursor-pointer border-b border-[var(--border-table)] last:border-0 transition-colors hover:bg-[var(--surface-fill)] focus-visible:bg-[var(--surface-fill)] active:bg-[var(--surface-active)]",
                                    selected?.id === row.original.id &&
                                      "bg-[var(--surface-active)]"
                                  )}
                                  onClick={() => {
                                    setSelectedId(row.original.id);
                                  }}
                                  onDoubleClick={() =>
                                    props.onViewProject(row.original)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget)
                                      return;
                                    const rows = table.getRowModel().rows;
                                    const index = rows.findIndex(
                                      (candidate) => candidate.id === row.id
                                    );
                                    const focusRow = (nextIndex: number) => {
                                      const next = rows[nextIndex];
                                      if (!next) return;
                                      setSelectedId(next.original.id);
                                      document
                                        .querySelector<HTMLElement>(
                                          `[data-testid="project-row"][data-project-id="${CSS.escape(next.original.id)}"]`
                                        )
                                        ?.focus();
                                    };
                                    if (event.key === "ArrowDown") {
                                      event.preventDefault();
                                      focusRow(
                                        Math.min(rows.length - 1, index + 1)
                                      );
                                    } else if (event.key === "ArrowUp") {
                                      event.preventDefault();
                                      focusRow(Math.max(0, index - 1));
                                    } else if (event.key === "Home") {
                                      event.preventDefault();
                                      focusRow(0);
                                    } else if (event.key === "End") {
                                      event.preventDefault();
                                      focusRow(rows.length - 1);
                                    } else if (event.key === "Enter") {
                                      event.preventDefault();
                                      props.onViewProject(row.original);
                                    } else if (event.key === " ") {
                                      event.preventDefault();
                                      setSelectedId(row.original.id);
                                    }
                                  }}
                                  data-project-id={row.original.id}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                      key={cell.id}
                                      className="px-3 py-0 text-body"
                                    >
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </TableCell>
                                  ))}
                                </tr>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )
                  ) : isUpdating ? (
                    <ProjectTableSkeleton />
                  ) : (
                    <PageEmptyState
                      icon={<FolderKanban />}
                      title={
                        hasFilters
                          ? "No matches"
                          : "No projects in this workspace"
                      }
                      description={
                        hasFilters
                          ? "Clear the filters to bring projects back into view."
                          : "Create your first project to track delivery."
                      }
                      action={
                        hasFilters ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setTableState((state) => ({
                                ...DEFAULT_PROJECT_TABLE_STATE,
                                view: state.view,
                              }))
                            }
                          >
                            Clear filters
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => props.onNewProject(scope)}
                            disabled={
                              scope === "personal"
                                ? !props.canCreateProjects
                                : !hasTeam || !props.canCreateTeamProjects
                            }
                          >
                            <Plus />
                            Create project
                          </Button>
                        )
                      }
                    />
                  )}
                </DataTableFrame>
              }
              secondary={
                <ProjectInspector
                  project={selected}
                  settings={props.settings}
                  onOpen={props.onViewProject}
                  onEdit={props.onEditProject}
                  canEdit={props.canEditProjects}
                />
              }
            />
          </div>
        </PageContent>
        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent
            side="right"
            className="w-[min(92vw,380px)] p-0 lg:hidden"
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
                Review the selected project and open or edit its workspace.
              </SheetDescription>
            </SheetHeader>
            <ProjectInspector
              project={selected}
              settings={props.settings}
              onOpen={props.onViewProject}
              onEdit={props.onEditProject}
              canEdit={props.canEditProjects}
              className="h-full p-4"
            />
          </SheetContent>
        </Sheet>
      </div>
    </WorkspacePage>
  );
}

function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
  className,
}: {
  project: WorkItem | null;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
  className?: string;
}) {
  if (!project) {
    return (
      <PageEmptyState
        compact
        icon={<FolderOpen />}
        title="Select a project"
        description="Select a project to inspect its production details."
        className={className}
      />
    );
  }

  const value = getProjectProgress(project);
  return (
    <div
      role="region"
      aria-label="Selected project details"
      className={cn(
        "h-full min-h-0 overflow-hidden border-0 bg-transparent",
        className
      )}
    >
      <ScrollArea className="h-full min-h-0 flex-1 rounded-md [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=scroll-area-scrollbar]]:hidden">
        <div>
          <ProjectThumbnail
            project={project}
            className="mb-3 aspect-video h-auto w-full"
          />
          <div>
            <div className="pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-title">{project.title}</h2>
                <p className="mt-1 truncate text-meta text-[var(--text-meta)]">
                  {project.client || "No client"}
                </p>
                <Badge
                  variant="secondary"
                  status={projectStatusTone(project.status)}
                >
                  {project.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Detail label="Client" value={project.client || "No client"} />
                <Detail label="Work type" value={project.workType} />
                <Detail label="Due date" value={formatDate(project.dueDate)} />
                <Detail
                  label="Value"
                  value={
                    project.workType === settings.salaryWorkType
                      ? "Paid per batch"
                      : money(project.earnings, settings.currencyCode)
                  }
                />
              </dl>
              <div className="pt-1">
                <div className="flex justify-between text-meta font-medium">
                  <span>Progress</span>
                  <span>{value}%</span>
                </div>
                <SegmentedMeter value={value} segments={24} className="mt-2" />
              </div>
              <div>
                <p className="text-meta text-[var(--text-meta)]">
                  Project note
                </p>
                <p className="mt-2 text-body text-[var(--text-primary)]">
                  {project.notes || "No project notes yet."}
                </p>
              </div>
              <div>
                <p className="text-meta text-[var(--text-meta)]">Next action</p>
                <p className="mt-2 text-meta text-[var(--text-primary)]">
                  {projectNextAction(project)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  className=""
                  disabled={!canEdit && Boolean(project.teamId)}
                  onClick={() => onEdit(project)}
                >
                  <Edit3 /> Edit
                </Button>
                <Button variant="secondary" onClick={() => onOpen(project)}>
                  Open <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-section text-[var(--text-primary)]">{label}</p>
      <p className="mt-1 text-body">{value}</p>
    </div>
  );
}

function ProjectTableSkeleton() {
  return (
    <div className="min-h-72" aria-label="Updating projects">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid h-10 grid-cols-[minmax(180px,1.6fr)_minmax(80px,0.7fr)_minmax(100px,0.9fr)_minmax(72px,0.7fr)_minmax(100px,1fr)] items-center gap-3 px-3"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-12 rounded-sm bg-[var(--surface-skeleton)]" />
            <span className="space-y-2">
              <span className="block h-3 w-36 rounded-sm bg-[var(--surface-skeleton)]" />
              <span className="block h-2 w-24 rounded-sm bg-[var(--surface-skeleton)]" />
            </span>
          </div>
          <span className="h-3 w-16 rounded-sm bg-[var(--surface-skeleton)]" />
          <span className="h-3 w-20 rounded-sm bg-[var(--surface-skeleton)]" />
          <span className="h-5 w-16 rounded-sm bg-[var(--surface-skeleton)]" />
          <span className="h-1 w-full max-w-28 rounded-sm bg-[var(--surface-skeleton)]" />
        </div>
      ))}
    </div>
  );
}

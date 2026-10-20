"use client";

import {
  getProjectProgress,
  getProjectWorkflowStage,
} from "@/features/projects/project-domain";

import {
  Archive,
  ChevronDown,
  Edit3,
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
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  useDndContext,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { SettingsState, WorkItem, WorkflowStage } from "@/lib/types";
import type { StoredTeamRole } from "@/lib/domain-values";
import { projectStatusTone } from "@/lib/project-status-style";
import {
  DEFAULT_PROJECT_TABLE_STATE,
  parseProjectTableSearch,
} from "@/features/projects/project-table-domain";
import { useProjectTableController } from "@/features/projects/project-table-controller";
import type { ProjectStageMenuChoice } from "@/features/projects/project-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KanbanBoard,
  KanbanCard,
  KanbanHeader,
} from "@/components/kibo-ui/kanban";
import { SegmentedMeter } from "@/components/ui/segmented-meter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterMenu } from "@/components/filter-menu";
import { Input } from "@/components/ui/input";
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
  DataTableFrame,
  PageActions,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

type WorkspaceScope = "personal" | "team";

const sortChoices = [
  { value: "due:asc", label: "Due first" },
  { value: "delivered:desc", label: "Recently delivered" },
  { value: "name:asc", label: "Name" },
  { value: "stage:asc", label: "Stage" },
  { value: "payment:asc", label: "Payment" },
  { value: "salary:desc", label: "Salary first" },
] as const;

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
 * Converts mouse-wheel input over board chrome into horizontal board scroll.
 * Returns a callback ref so the listener attaches whenever the board mounts,
 * including after switching from the table view.
 */
// The board scrolls sideways under a drag to reach the last columns, which
// leaves dnd-kit's start-of-drag column rects stale. Measure the columns live
// and drop into the one under the pointer; keyboard drags have no pointer and
// keep the default rect test.
const columnUnderPointer: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  if (!pointer) return rectIntersection(args);
  const column = args.droppableContainers.find((container) => {
    const rect = container.node.current?.getBoundingClientRect();
    return (
      rect !== undefined &&
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom
    );
  });
  return column
    ? [{ id: column.id, data: { droppableContainer: column, value: 0 } }]
    : [];
};

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
      className={cn(selected && "shadow-[0_0_0_1px_var(--ink)]")}
    >
      {({ attributes, listeners, setActivatorNodeRef }) => (
        <>
          {/* The whole card body is the drag handle: press and move to drag,
              click to select, double-click to open. Space starts a
              keyboard drag. */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`${project.title}. Drag to change stage, double-click to open.`}
            className={cn(
              "flex min-w-0 flex-1 touch-none flex-col items-start rounded-inner text-start outline-none select-none focus-visible:focus-ring",
              disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
            )}
            onClick={onSelect}
            onDoubleClick={onOpen}
          >
            <span className="block w-full truncate type-label">
              {project.title}
            </span>
            <span className="mt-1 block w-full truncate text-text-2 type-label-sm">
              {project.client || "No client"}
            </span>
            <span className="mt-1 block w-full truncate text-text-3 type-label-sm">
              {project.status === "Cancelled"
                ? "Cancelled"
                : getProjectWorkflowStage(project).label}
            </span>
            <span className="mt-3 block text-text-2 type-label-sm data">
              {formatDate(project.dueDate)}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-me-1 -mt-1 shrink-0"
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
            <div className="flex min-w-0 cursor-grabbing flex-col gap-1 rounded-soft bg-raised p-3 text-start shadow-overlay">
              <span className="truncate type-label">{project.title}</span>
              <span className="truncate text-text-2 type-label-sm">
                {project.client || "No client"}
              </span>
              <span className="mt-2 text-text-2 type-label-sm">
                {formatDate(project.dueDate)}
              </span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      );
}

function ProjectBoardColumn({
  columnKey,
  stage,
  projects,
  canMove,
  children,
}: {
  columnKey: string;
  stage: WorkflowStage;
  projects: number;
  canMove: (projectId: string | number, columnKey: string) => boolean;
  children: ReactNode;
}) {
  const { active } = useDndContext();
  const unavailable = Boolean(active && !canMove(active.id, columnKey));
  return (
    <KanbanBoard
      id={`stage:${columnKey}`}
      className={cn("min-h-0 min-w-0", unavailable && "opacity-50")}
      aria-label={`${stage.label} projects`}
      aria-disabled={unavailable || undefined}
    >
      <KanbanHeader
        data-board-wheel
        className="flex shrink-0 items-center justify-between px-3 py-3 text-text-1 type-label"
      >
        <span>{stage.label}</span>
        <span className="tabular-nums text-text-2 type-label-sm">
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
          <span className="mt-3 block text-text-2 type-label-sm">
            {unavailable ? "Not available for this project" : "Drop here"}
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
  const hasTeam = Boolean(props.teamName);
  const boardRef = useBoardHorizontalWheel();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const {
    state: tableState,
    setState: setTableState,
    isUpdating,
    source,
    projects,
    board,
    templates,
    hasFilters,
    historyLoading,
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
    customTemplates: props.settings.customProjectTemplates,
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
          <div className="min-w-0">
            <p className="truncate text-text-1 type-label">
              {row.original.title}
            </p>
            <p className="mt-0.5 max-w-[300px] truncate text-text-3 type-label-sm">
              {row.original.notes || "No notes"}
            </p>
          </div>
        ),
      }),
      columnHelper.display({
        id: "client",
        header: "Client",
        cell: ({ row }) => (
          <span className="block truncate type-label-sm">
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
            variant="outline"
            className={cn("", projectStatusTone(info.getValue()))}
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due",
        cell: (info) => (
          <span className="whitespace-nowrap type-label-sm">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "payment",
        header: "Payment",
        cell: ({ row }) => (
          <span className="capitalize type-label-sm">
            {getPaymentState(row.original).replace("-", " ")}
          </span>
        ),
      }),
      columnHelper.display({
        id: "salary",
        header: "Salary",
        cell: ({ row }) => (
          <span className="whitespace-nowrap type-label-sm">
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
                  <span className="block truncate type-label-sm">
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
                className="active:scale-95"
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
                className="text-destructive focus:text-destructive"
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

  function select(project: WorkItem) {
    setSelectedId(project.id);
  }

  return (
    <WorkspacePage family="data-index" mode="fill">
      <PageHeader
        title="Projects"
        actions={
          <PageActions
            primary={
              <Button
                size="sm"
                data-action="new-project"
                aria-label="New project"
                onClick={() => props.onNewProject(scope)}
                disabled={
                  scope === "personal"
                    ? !props.canCreateProjects
                    : !hasTeam || !props.canCreateTeamProjects
                }
              >
                <Plus />
                {/* Icon only on phones, so the top bar fits its actions. */}
                <span className="max-sm:hidden">New project</span>
              </Button>
            }
            more={[
              {
                label: "Project groups",
                onSelect: () => props.onManageProjectGroups(scope),
              },
              ...(props.onOpenHistory
                ? [
                    {
                      label: "Completed projects",
                      onSelect: props.onOpenHistory,
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      <PageContent mode="fill">
        {props.notice}
        <PageToolbar
          primary={
            <>
              {hasTeam ? (
                <Tabs
                  value={scope}
                  onValueChange={(value) =>
                    setScope(value === "team" ? "team" : "personal")
                  }
                >
                  <TabsList aria-label="Project scope">
                    <TabsTrigger
                      id="project-personal-tab"
                      aria-controls="project-library-panel"
                      value="personal"
                    >
                      Mine
                      <span className="text-text-3 type-label-sm data">
                        {props.personalProjects.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      id="project-team-tab"
                      aria-controls="project-library-panel"
                      value="team"
                    >
                      Team
                      <span className="text-text-3 type-label-sm data">
                        {props.teamProjects.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : null}
              <div className="relative min-w-0 flex-1 sm:max-w-80">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3"
                />
                <Input
                  value={tableState.query}
                  onChange={(event) =>
                    setTableState((state) => ({
                      ...state,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Search projects, clients or notes"
                  aria-label="Search projects"
                  className="ps-8"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Workflow template"
                  >
                    {templates.find(
                      (template) => template.id === tableState.templateId
                    )?.name || "All templates"}
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={tableState.templateId || "all"}
                    onValueChange={(value) =>
                      setTableState((state) => ({
                        ...state,
                        templateId: value === "all" ? "" : value,
                      }))
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      All templates
                    </DropdownMenuRadioItem>
                    {templates.map((template) => (
                      <DropdownMenuRadioItem
                        key={template.id}
                        value={template.id}
                      >
                        {template.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <FilterMenu
                subject="projects"
                activeCount={activeFilterCount}
                onClear={() =>
                  setTableState((state) => ({
                    ...DEFAULT_PROJECT_TABLE_STATE,
                    view: state.view,
                    templateId: state.templateId,
                  }))
                }
                filters={[
                  {
                    label: "Stage",
                    value: tableState.stage,
                    options: [
                      { value: "all", label: "Any stage" },
                      { value: "Planned", label: "Planned" },
                      { value: "In Progress", label: "In Progress" },
                      { value: "Review", label: "Review" },
                      { value: "Client Review", label: "Client Review" },
                      { value: "Revision", label: "Revision" },
                      { value: "Delivered", label: "Delivered" },
                      { value: "Cancelled", label: "Cancelled" },
                    ],
                    onChange: (value) =>
                      setTableState((state) => ({
                        ...state,
                        stage: parseProjectTableSearch(
                          `stage=${encodeURIComponent(value)}`
                        ).stage,
                      })),
                  },
                  {
                    label: "Client",
                    value: tableState.clientId || "all",
                    options: [
                      { value: "all", label: "Any client" },
                      ...props.settings.clients
                        .filter((client) => !client.archived)
                        .map((client) => ({
                          value: client.id,
                          label: client.name,
                        })),
                    ],
                    onChange: (value) =>
                      setTableState((state) => ({
                        ...state,
                        clientId: value === "all" ? "" : value,
                      })),
                  },
                  {
                    label: "Payment",
                    value: tableState.payment,
                    options: [
                      { value: "all", label: "Any payment" },
                      { value: "paid", label: "Paid" },
                      { value: "unpaid", label: "Unpaid" },
                      { value: "not-billable", label: "Not billable" },
                    ],
                    onChange: (value) =>
                      setTableState((state) => ({
                        ...state,
                        payment: parseProjectTableSearch(`payment=${value}`)
                          .payment,
                      })),
                  },
                  {
                    label: "Work type",
                    value: tableState.salary,
                    options: [
                      { value: "all", label: "All work" },
                      { value: "salary", label: "Salary" },
                      { value: "client", label: "Client work" },
                    ],
                    onChange: (value) =>
                      setTableState((state) => ({
                        ...state,
                        salary: parseProjectTableSearch(`salary=${value}`)
                          .salary,
                      })),
                  },
                  {
                    label: "Archive",
                    value: tableState.archive,
                    options: [
                      { value: "active", label: "Unarchived" },
                      { value: "archived", label: "Archived" },
                      { value: "all", label: "All records" },
                    ],
                    onChange: (value) =>
                      setTableState((state) => ({
                        ...state,
                        archive: parseProjectTableSearch(`archive=${value}`)
                          .archive,
                      })),
                  },
                  ...(showAssignees
                    ? [
                        {
                          label: "Assignee",
                          value: tableState.assigneeUserId || "all",
                          options: [
                            { value: "all", label: "Anyone" },
                            ...props.settings.teamMembers.map((member) => ({
                              value: member.id,
                              label: member.name,
                            })),
                          ],
                          onChange: (value: string) =>
                            setTableState((state) => ({
                              ...state,
                              assigneeUserId: value === "all" ? "" : value,
                            })),
                        },
                      ]
                    : []),
                ]}
              />
            </>
          }
          secondary={
            <>
              <span
                className="text-text-3 type-label-sm data"
                aria-live="polite"
              >
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Display options"
                  >
                    <SlidersHorizontal />
                    Display
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Layout</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={tableState.view}
                    onValueChange={(view) =>
                      setTableState((state) => ({
                        ...state,
                        view: view === "board" ? "board" : "table",
                      }))
                    }
                  >
                    <DropdownMenuRadioItem value="table">
                      Table
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="board">
                      Board
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={
                      // "Due first" has one urgency order; old dir=desc links land on it.
                      tableState.sort === "due"
                        ? "due:asc"
                        : `${tableState.sort}:${tableState.direction}`
                    }
                    onValueChange={(value) => {
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
                  >
                    {sortChoices.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <SplitPane
          mode="fill"
          ratio="inspector-xl"
          className="min-h-0 flex-1"
          primary={
            <DataTableFrame
              id="project-library-panel"
              role={hasTeam ? "tabpanel" : undefined}
              aria-labelledby={hasTeam ? `project-${scope}-tab` : undefined}
              aria-busy={isUpdating}
              bodyLabel="Project library viewport"
              className="relative h-full min-h-0 rounded-frame shadow-[0_0_0_1px_var(--line-row)]"
              bodyClassName={cn(
                "flex min-h-0 flex-1 flex-col max-lg:flex-none max-lg:overflow-visible",
                tableState.view === "board" && "overflow-hidden"
              )}
            >
              {props.error ? (
                <div role="alert" className="px-4 py-6">
                  <p className="text-fail-text type-label">
                    Projects could not load
                  </p>
                  <p className="mt-1 text-text-2 type-body-sm">{props.error}</p>
                </div>
              ) : props.loading || historyLoading ? (
                <div aria-label="Loading projects">
                  <ProjectTableSkeleton />
                </div>
              ) : projects.length ? (
                tableState.view === "board" ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={columnUnderPointer}
                    accessibility={{ announcements }}
                    onDragEnd={handleDragEnd}
                  >
                    <div
                      ref={boardRef}
                      data-board-wheel
                      className="grid min-h-0 flex-1 auto-cols-[minmax(240px,1fr)] grid-flow-col items-stretch gap-2 overflow-x-auto overflow-y-hidden p-2"
                      aria-label="Project board"
                    >
                      {board.map(({ key, stage, projects: stageProjects }) => (
                        <ProjectBoardColumn
                          key={key}
                          columnKey={key}
                          stage={stage}
                          projects={stageProjects.length}
                          canMove={(projectId, columnKey) =>
                            validMove(projectId, columnKey)
                          }
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
                              onSelect={() => {
                                select(project);
                                setMobileInspectorOpen(true);
                              }}
                              onOpen={() => props.onViewProject(project)}
                              onUpdateProjectStatus={
                                props.onUpdateProjectStatus
                              }
                            />
                          ))}
                        </ProjectBoardColumn>
                      ))}
                    </div>
                    <ProjectBoardDragOverlay projects={projects} />
                  </DndContext>
                ) : (
                  <>
                    <ul className="lg:hidden" aria-label="Project cards">
                      {table.getRowModel().rows.map((row) => (
                        <li key={row.id} className="rule-row">
                          <button
                            type="button"
                            data-testid="mobile-project-row"
                            data-project-title={row.original.title}
                            aria-label={`Open ${row.original.title} project details`}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-start outline-none transition-colors duration-(--dur-fast) hover:bg-hover focus-visible:focus-ring-inset",
                              selected?.id === row.original.id && "bg-selected"
                            )}
                            onClick={() => {
                              select(row.original);
                              setMobileInspectorOpen(true);
                            }}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate type-label">
                                {row.original.title}
                              </span>
                              <span className="mt-0.5 block truncate text-text-3 type-label-sm">
                                {row.original.client || row.original.workType}
                              </span>
                            </span>
                            <Badge
                              className={projectStatusTone(row.original.status)}
                            >
                              {row.original.status}
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div
                      className={cn(
                        "hidden min-h-0 flex-1 overflow-y-auto overscroll-contain transition-opacity duration-(--dur-base) lg:block",
                        isUpdating && "opacity-(--stale-opacity)"
                      )}
                      tabIndex={0}
                      aria-label="Scrollable project library"
                    >
                      <Table
                        className="table-fixed"
                        aria-label={`${scope === "team" ? "Team" : "Personal"} project library`}
                      >
                        <TableCaption className="sr-only">
                          Projects with due date, status, payment and value.
                          Select a row to inspect it.
                        </TableCaption>
                        <TableHeader className="sticky top-0 z-10 bg-page">
                          {table.getHeaderGroups().map((group) => (
                            <TableRow key={group.id}>
                              {group.headers.map((header) => (
                                <TableHead
                                  key={header.id}
                                  className={cn(
                                    header.column.id === "title" && "w-[30%]",
                                    header.column.id === "client" && "w-[15%]",
                                    header.column.id === "dueDate" && "w-[12%]",
                                    header.column.id === "status" && "w-[13%]",
                                    header.column.id === "payment" && "w-[11%]",
                                    header.column.id === "salary" && "w-[11%]",
                                    header.column.id === "assignees" &&
                                      "w-[12%]",
                                    header.column.id === "actions" && "w-12"
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
                        <TableBody>
                          {table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              tabIndex={0}
                              data-testid="project-row"
                              data-project-title={row.original.title}
                              data-project-id={row.original.id}
                              data-state={
                                selected?.id === row.original.id
                                  ? "selected"
                                  : undefined
                              }
                              aria-label={`${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate)}. Press Enter to open.`}
                              className="cursor-pointer outline-none focus-visible:focus-ring-inset"
                              onClick={() => select(row.original)}
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
                                  select(row.original);
                                }
                              }}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell
                                  key={cell.id}
                                  className={cn(
                                    "type-label-sm",
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
                )
              ) : isUpdating ? (
                <ProjectTableSkeleton />
              ) : (
                <PageEmptyState
                  title={
                    hasFilters
                      ? "No projects match these filters"
                      : "No projects yet"
                  }
                  description={
                    hasFilters
                      ? "Clear the filters to bring projects back into view."
                      : "Create a project to track its deadline, reviews and delivery."
                  }
                  action={
                    hasFilters ? (
                      <Button
                        variant="outline"
                        size="sm"
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
                        size="sm"
                        onClick={() => props.onNewProject(scope)}
                        disabled={
                          scope === "personal"
                            ? !props.canCreateProjects
                            : !hasTeam || !props.canCreateTeamProjects
                        }
                      >
                        <Plus /> New project
                      </Button>
                    )
                  }
                />
              )}
            </DataTableFrame>
          }
          secondary={
            // The board needs the full width; its selection opens the sheet.
            tableState.view === "board" ? null : (
              <ProjectInspector
                project={selected}
                settings={props.settings}
                onOpen={props.onViewProject}
                onEdit={props.onEditProject}
                canEdit={props.canEditProjects}
              />
            )
          }
        />
      </PageContent>
      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent
          side="right"
          className={cn(
            "gap-0 p-0",
            tableState.view === "table" && "xl:hidden"
          )}
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
          />
        </SheetContent>
      </Sheet>
    </WorkspacePage>
  );
}

/** The selected Project beside the list: its facts and the next step. */
function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
}: {
  project: WorkItem | null;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
}) {
  if (!project) {
    return (
      <PageEmptyState
        compact
        title="No project selected"
        description="Select a project to see its details here."
      />
    );
  }
  const value = getProjectProgress(project);
  return (
    <section
      aria-label="Selected project details"
      className="flex h-full min-h-0 flex-col overflow-y-auto rounded-frame bg-well"
    >
      <div className="p-4">
        <h2 className="type-heading-xs text-text-1">{project.title}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2">
          <Badge className={projectStatusTone(project.status)}>
            {project.status}
          </Badge>
          <span className="text-text-2 type-label-sm">
            {project.client || "No client"}
          </span>
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 px-4 pb-4 type-label">
        <dt className="text-text-3">Work type</dt>
        <dd className="text-text-1">{project.workType}</dd>
        <dt className="text-text-3">Due date</dt>
        <dd className="text-text-1 data">{formatDate(project.dueDate)}</dd>
        <dt className="text-text-3">Value</dt>
        <dd className="text-text-1 data">
          {project.workType === settings.salaryWorkType
            ? "Paid per batch"
            : money(project.earnings, settings.currencyCode)}
        </dd>
      </dl>
      <div className="rule-top px-4 py-3">
        <div className="flex justify-between type-label">
          <span className="text-text-2">Progress</span>
          <span className="text-text-1 data">{value}%</span>
        </div>
        <SegmentedMeter value={value} segments={24} className="mt-2" />
      </div>
      <div className="rule-top px-4 py-3">
        <p className="text-text-3 type-label-sm">Next step</p>
        <p className="mt-1 text-text-1 type-body-sm">
          {projectNextAction(project)}
        </p>
      </div>
      <div className="rule-top px-4 py-3">
        <p className="text-text-3 type-label-sm">Notes</p>
        <p className="mt-1 text-text-2 type-body-sm">
          {project.notes || "None"}
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 p-4">
        <Button
          variant="outline"
          disabled={!canEdit && Boolean(project.teamId)}
          onClick={() => onEdit(project)}
        >
          Edit
        </Button>
        <Button onClick={() => onOpen(project)}>Open project</Button>
      </div>
    </section>
  );
}

function ProjectTableSkeleton() {
  return (
    <div aria-label="Updating projects" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid h-(--row) grid-cols-[minmax(180px,1.6fr)_minmax(80px,0.7fr)_minmax(100px,0.9fr)_minmax(72px,0.7fr)] items-center gap-4 rule-row px-3"
        >
          <Skeleton className="h-2.5 w-40 rounded-inner" />
          <Skeleton className="h-2.5 w-16 rounded-inner" />
          <Skeleton className="h-2.5 w-20 rounded-inner" />
          <Skeleton className="h-2.5 w-14 rounded-inner" />
        </div>
      ))}
    </div>
  );
}

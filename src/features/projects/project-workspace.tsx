import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { getProjectProgress } from "@/features/projects/project-domain";
import { ProjectOutputsPanel } from "@/components/project-outputs-panel";
import { ProjectPortalPanel } from "@/components/project-portal-panel";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { Progress as OwnedProgress } from "@/components/ui/progress";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  ContentSection,
  PageEmptyState,
  SectionNav,
  TopBarActions,
  sectionListClassName,
  sectionRowClassName,
  WorkspacePage,
} from "@/components/workspace-page";
import { PROJECT_STATUS_VALUES, type ProjectStatus } from "@/lib/domain-values";
import { downloadCsv, projectsToCsv } from "@/lib/export-csv";
import { useData } from "@/lib/data-context";
import { useProjectOutputDuplication } from "@/lib/project-output-data";
import { createId } from "@/features/routes/utils/date-utils";
import { useProjectAccess } from "./project-access";
import { useProjectActions } from "./project-actions-provider";
import {
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
} from "@/lib/integrations";
import { projectStatusTone } from "@/lib/project-status-style";
import type { SettingsState, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceBreadcrumb } from "@/components/workspace-shell";
import { ExternalLink, MoreHorizontal } from "@/components/icons";
import {
  formatShortDateTime,
  ProjectActivityFeed,
  ProjectDetailCollaborationPanel,
  ProjectFileManager,
} from "./project-cloud-panels";
import type {
  ProjectActivityEvent,
  ProjectWorkspaceView,
  WorkspaceMemberOption,
} from "./project-view";
import { ProjectSelect } from "@/features/projects/project-select";
import { RevisionScopePanel } from "@/features/revision-scope/revision-scope-panel";

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];

const projectViews: ReadonlyArray<{ id: ProjectWorkspaceView; label: string }> =
  [
    { id: "overview", label: "Overview" },
    { id: "outputs", label: "Outputs" },
    { id: "review", label: "Client review" },
    { id: "files", label: "Files" },
    { id: "activity", label: "Activity" },
  ];

const WORKFLOW_STAGES = ["Planned", "In Progress", "Review", "Delivered"];

export type ProjectMenuAction = "duplicate" | "archive" | "export" | "delete";

/**
 * The Project menu offers what this Project and this person allow. Duplicate
 * needs permission to create Projects, and Archive follows edit rights.
 */
export function projectMenuItems(
  project: Pick<WorkItem, "archived">,
  permissions: {
    canDuplicate: boolean;
    canArchive: boolean;
    canDelete: boolean;
  }
): Array<{ id: ProjectMenuAction; label: string }> {
  return [
    ...(permissions.canDuplicate
      ? [{ id: "duplicate" as const, label: "Duplicate project" }]
      : []),
    ...(permissions.canArchive
      ? [
          {
            id: "archive" as const,
            label: project.archived ? "Restore project" : "Archive project",
          },
        ]
      : []),
    { id: "export" as const, label: "Export CSV" },
    ...(permissions.canDelete
      ? [{ id: "delete" as const, label: "Delete project" }]
      : []),
  ];
}

/**
 * The copy Duplicate creates: the same client, schedule, and workflow stages
 * under a new id, unarchived and unpaid. Its Outputs are created separately,
 * through the Outputs store, so the copy keeps as many as the original holds.
 * It keeps no Template list: a copied Project holds its Outputs, and a Template
 * entry the original no longer shows would be created again on the copy.
 * Media versions and their comments belong to the original Project, so a copy
 * starts with an empty review history.
 */
export function projectCopy(
  project: WorkItem,
  copy: { id: string; createdAt: string }
): WorkItem {
  const { templateDeliverables: _plan, ...rest } = project;
  return {
    ...rest,
    id: copy.id,
    createdAt: copy.createdAt,
    title: `${project.title.trim()} (copy)`,
    archived: false,
    paid: false,
    paidDate: undefined,
    completedAt: undefined,
    ...(project.workflowStages
      ? {
          workflowStages: project.workflowStages.map((stage) => ({ ...stage })),
        }
      : {}),
  };
}

/** Names the single-Project export the way the Settings exports are named. */
function projectCsvFileName(title: string, stamp: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `relay-project-${slug ? `${slug}-` : ""}${stamp}.csv`;
}

function isSalaryWorkType(value: string, settings: SettingsState) {
  return (
    value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase()
  );
}

function safeMoneyValue(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function isDoneStatus(status: string) {
  return [
    "delivered",
    "done",
    "paid",
    "published",
    "closed",
    "archived",
    "shipped",
    "completed",
    "released",
  ].some((word) => status.toLowerCase().includes(word));
}

function formatDate(value: string, dateFormat: string) {
  const date = new Date(`${value}T00:00:00`);
  if (dateFormat === "Day Month Year") {
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  if (dateFormat === "YYYY-MM-DD") return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);
}

/** Project record page with an Overview-only details inspector. */
export function ProjectWorkspace({
  project,
  projectGroup,
  settings,
  view,
  canEdit,
  canManagePayment,
  canManagePortal,
  clientHubEnabled,
  customPortalBrandingEnabled,
  canDelete,
  canUpdateStatus,
  canComment,
  teamMembers,
  localActivity,
  onBack,
  onViewChange,
  onEdit,
  onDelete,
  onStatusChange,
  onPaymentChange,
}: {
  project: WorkItem;
  projectGroup?: import("@/lib/types").ProjectGroup;
  settings: SettingsState;
  view: ProjectWorkspaceView;
  canEdit: boolean;
  canManagePayment: boolean;
  canManagePortal: boolean;
  clientHubEnabled: boolean;
  customPortalBrandingEnabled: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  canComment: boolean;
  teamMembers: WorkspaceMemberOption[];
  localActivity: ProjectActivityEvent[];
  onBack: () => void;
  onViewChange: (view: ProjectWorkspaceView) => void;
  onEdit: (project: WorkItem) => void;
  onDelete: (project: WorkItem) => void;
  onStatusChange: (project: WorkItem, status: ProjectStatus) => void;
  onPaymentChange: (project: WorkItem, paid: boolean) => void;
}) {
  useWorkspaceBreadcrumb(project.title);
  const { setItems, setToast } = useData();
  const { archiveProject } = useProjectActions();
  const access = useProjectAccess();
  const duplicateOutputs = useProjectOutputDuplication(project);
  const menuItems = projectMenuItems(project, {
    canDuplicate:
      access.canCreateProjects &&
      (!project.teamId || access.canCreateTeamProjects),
    canArchive: canEdit,
    canDelete,
  });

  /** Creates the copy first, then fills it with the Outputs it holds now. */
  async function duplicateProject() {
    const createdAt = new Date().toISOString();
    const copy = projectCopy(project, { id: createId(), createdAt });
    setItems((items) => [copy, ...items]);
    try {
      const copied = await duplicateOutputs(copy.id, createdAt);
      setToast({
        message: copied
          ? `${copy.title} created with ${copied} Project Output${copied === 1 ? "" : "s"}.`
          : `${copy.title} created.`,
        tone: "success",
      });
    } catch (caught) {
      setToast({
        message: `Could not copy the Project Outputs: ${
          caught instanceof Error ? caught.message : "the copy is empty."
        }`,
        tone: "warning",
      });
    }
  }

  const menuActions: Record<ProjectMenuAction, () => void> = {
    duplicate: () => void duplicateProject(),
    archive: () => archiveProject(project),
    export: () =>
      downloadCsv(
        projectCsvFileName(
          project.title,
          new Date().toISOString().slice(0, 10)
        ),
        projectsToCsv([project], {
          includeMoney: canManagePayment,
          currencyCode: settings.currencyCode,
        })
      ),
    delete: () => onDelete(project),
  };
  const isSalary = isSalaryWorkType(project.workType, settings);
  const isClientBillable =
    !isSalary &&
    isDoneStatus(project.status) &&
    safeMoneyValue(project.earnings) > 0;
  const amount = isSalary
    ? "Paid per batch"
    : money(project.earnings, settings.currencyCode);
  const assignedMembers = teamMembers.filter((member) =>
    (project.assigneeUserIds ?? []).includes(member.userId)
  );
  const lead =
    teamMembers.find((member) => member.userId === project.ownerUserId)?.name ||
    settings.profileName ||
    "You";
  const progress = getProjectProgress(project);
  const assigneeLabel = assignedMembers.length
    ? assignedMembers.map((member) => member.name || member.email).join(", ")
    : "No assignees";
  const paymentLabel = isClientBillable
    ? project.paid
      ? "Paid"
      : "Unpaid"
    : isSalary
      ? "Paid per batch"
      : "Not billable";
  const dueLabel = formatDate(project.dueDate, settings.dateFormat);
  const createdLabel = project.createdAt
    ? formatShortDateTime(project.createdAt)
    : "Not recorded";
  const configuredLinks = integrationServices
    .map((service) => ({
      service,
      link: project.integrationLinks?.[service.id],
    }))
    .filter(({ link }) => hasIntegrationLink(link));

  return (
    <WorkspacePage
      family="master-detail"
      mode="fill"
      className="gap-0 p-0 sm:p-0 lg:pb-0"
    >
      {/* The visible title lives in the top bar breadcrumb. */}
      <h1 className="sr-only">{project.title}</h1>
      <TopBarActions>
        {canEdit ? (
          <OwnedButton
            variant="outline"
            size="sm"
            onClick={() => onEdit(project)}
          >
            Edit
          </OwnedButton>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <OwnedButton
              variant="ghost"
              size="icon-sm"
              aria-label="Project actions"
            >
              <MoreHorizontal />
            </OwnedButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                variant={item.id === "delete" ? "destructive" : "default"}
                onSelect={menuActions[item.id]}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TopBarActions>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <SectionNav
            aria-label="Project workspace views"
            items={projectViews}
            value={view}
            onValueChange={onViewChange}
            className="px-3 sm:px-5"
          />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <div
              key={view}
              className="mx-auto grid max-w-4xl animate-rise content-start gap-4"
            >
              {view === "overview" ? (
                <>
                  <ContentSection title="Workflow">
                    <ProjectStageTracker status={project.status} />
                    <p className="mt-3 text-text-2 type-body-sm">
                      {projectNextStep(project.status)}
                    </p>
                  </ContentSection>
                  <ContentSection
                    title="Internal notes"
                    actions={
                      canEdit ? (
                        <OwnedButton
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(project)}
                        >
                          Edit notes
                        </OwnedButton>
                      ) : null
                    }
                  >
                    <p
                      className={cn(
                        "whitespace-pre-wrap type-body",
                        project.notes ? "text-text-1" : "text-text-2"
                      )}
                    >
                      {project.notes || "None yet."}
                    </p>
                  </ContentSection>
                  <RevisionScopePanel projectId={project.id} />
                </>
              ) : null}

              {view === "outputs" ? (
                <ProjectOutputsPanel
                  project={project}
                  canEdit={canEdit}
                  canResolveComments={canComment}
                  settings={settings}
                />
              ) : null}

              {view === "review" ? (
                <>
                  <ProjectDetailCollaborationPanel
                    project={project}
                    teamMembers={teamMembers}
                    canComment={canComment}
                  />
                  <ProjectPortalPanel
                    project={project}
                    canEdit={canEdit && canManagePortal}
                    canDraftUpdates={canEdit}
                    clientHubEnabled={clientHubEnabled}
                    customPortalBrandingEnabled={customPortalBrandingEnabled}
                    settings={settings}
                  />
                </>
              ) : null}

              {view === "files" ? (
                <>
                  <ContentSection
                    title="External links"
                    metadata={
                      <span className="text-text-3 type-label-sm data">
                        {configuredLinks.length}
                      </span>
                    }
                    bodyMode="flush"
                  >
                    {configuredLinks.length ? (
                      <ul className={sectionListClassName}>
                        {configuredLinks.map(({ service, link }) =>
                          link ? (
                            <li key={service.id}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  sectionRowClassName,
                                  "flex items-center justify-between gap-3 type-label"
                                )}
                              >
                                <span className="min-w-0 truncate">
                                  {integrationDisplayText(link, service.name)}
                                </span>
                                <ExternalLink
                                  className="size-4 shrink-0 text-text-3"
                                  aria-hidden="true"
                                />
                              </a>
                            </li>
                          ) : null
                        )}
                      </ul>
                    ) : (
                      <PageEmptyState
                        compact
                        title="No external links"
                        description="Add Drive, Dropbox or Frame.io links when you edit the project."
                      />
                    )}
                  </ContentSection>
                  <ProjectFileManager project={project} canEdit={canEdit} />
                </>
              ) : null}

              {view === "activity" ? (
                <ProjectActivityFeed
                  project={project}
                  localActivity={localActivity}
                />
              ) : null}
            </div>
          </div>
        </div>

        <aside
          aria-label="Project details"
          className="order-first min-h-0 overflow-y-auto shadow-[inset_0_-1px_0_var(--line-row)] lg:order-none lg:shadow-[inset_1px_0_0_var(--line-row)]"
        >
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-text-3 type-label-sm">Properties</h2>
              <span className="text-text-2 type-label-sm data">
                {progress}% done
              </span>
            </div>
            <OwnedProgress
              value={progress}
              aria-label="Project workflow progress"
              className="mt-2"
            />
            <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 type-label">
              <dt className="text-text-3">Stage</dt>
              <dd className="min-w-0 py-0.5">
                {canUpdateStatus ? (
                  <ProjectSelect
                    value={project.status}
                    options={statusOptions}
                    onChange={(status) => {
                      if (status !== "Client Review")
                        onStatusChange(project, status);
                    }}
                    compact
                    className="h-(--control-sm) w-full"
                  />
                ) : (
                  <ProjectStatusBadge status={project.status} />
                )}
              </dd>
              <dt className="text-text-3">Payment</dt>
              <dd className="flex min-h-(--control-sm) items-center justify-between gap-2">
                <span className="truncate text-text-1">{paymentLabel}</span>
                {isClientBillable ? (
                  <OwnedSwitch
                    checked={Boolean(project.paid)}
                    disabled={!canManagePayment}
                    aria-label={`${project.paid ? "Mark unpaid" : "Mark paid"}: ${project.title}`}
                    onCheckedChange={(paid) => onPaymentChange(project, paid)}
                  />
                ) : null}
              </dd>
              <ProjectMetadataRow
                label="Client"
                value={project.client || "Not assigned"}
              />
              <ProjectMetadataRow label="Due" value={dueLabel} />
              <ProjectMetadataRow label="Value" value={amount} />
              <ProjectMetadataRow label="Work type" value={project.workType} />
              <ProjectMetadataRow
                label="Group"
                value={projectGroup?.name || "None"}
              />
              <ProjectMetadataRow label="Lead" value={lead} />
              <ProjectMetadataRow label="Assignees" value={assigneeLabel} />
              <ProjectMetadataRow label="Created" value={createdLabel} />
            </dl>
            {isClientBillable && project.paid && project.paidDate ? (
              <p className="mt-3 text-text-3 type-label-sm">
                Paid {formatShortDateTime(project.paidDate)}
              </p>
            ) : !isClientBillable && !isSalary ? (
              <p className="mt-3 text-text-3 type-label-sm">
                Payment tracking starts once the project is delivered.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </WorkspacePage>
  );
}

/** What moves the Project on from its current stage. */
function projectNextStep(status: string) {
  const stage = clientPortalStage(status);
  if (stage === "Delivered")
    return "Delivered. Confirm payment and archive the final files.";
  if (stage === "Review")
    return "Waiting on review. Collect the notes and prepare the next version.";
  if (stage === "In Progress")
    return "In production. Upload a version under Outputs when it is ready for review.";
  return "Planned. Confirm the brief and set the first milestone.";
}

/** Four-segment stage bar; each segment fills once its stage is reached. */
function ProjectStageTracker({ status }: { status: string }) {
  const currentIndex = WORKFLOW_STAGES.indexOf(clientPortalStage(status));

  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Workflow stages">
      {WORKFLOW_STAGES.map((stage, index) => {
        const reached = index <= currentIndex;
        return (
          <li
            key={stage}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span
              aria-hidden="true"
              className={cn(
                "block h-1 rounded-sm",
                reached ? "bg-ink" : "bg-tile",
                "rounded-sm"
              )}
            />
            <span
              className={cn(
                "mt-2 block type-label-sm",
                index === currentIndex
                  ? "text-text-1"
                  : reached
                    ? "text-text-2"
                    : "text-text-3"
              )}
            >
              {stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One property: its name, then its value, in the properties grid. */
function ProjectMetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt className="text-text-3">{label}</dt>
      <dd className="min-h-(--control-sm) py-1.5 text-text-1 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      variant="outline"
      className={cn(
        "",
        projectStatusTone(isDoneStatus(status) ? "Delivered" : status)
      )}
    >
      {status}
    </OwnedBadge>
  );
}

/** Maps any custom project status onto the four workflow stages. */
function clientPortalStage(status: string) {
  const normalized = status.trim().toLowerCase();
  if (
    normalized.includes("deliver") ||
    normalized.includes("complete") ||
    normalized === "done"
  )
    return "Delivered";
  if (
    normalized.includes("review") ||
    normalized.includes("revision") ||
    normalized.includes("feedback")
  )
    return "Review";
  if (
    normalized.includes("progress") ||
    normalized.includes("editing") ||
    normalized.includes("active")
  )
    return "In Progress";
  return "Planned";
}

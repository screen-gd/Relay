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
import { cardSurfaceClassName } from "@/components/ui/card";
import { Progress as OwnedProgress } from "@/components/ui/progress";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  ContentSection,
  PageContent,
  SectionNav,
  sectionListClassName,
  sectionRowClassName,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { PROJECT_STATUS_VALUES, type ProjectStatus } from "@/lib/domain-values";
import {
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
} from "@/lib/integrations";
import { projectStatusTone } from "@/lib/project-status-style";
import type { SettingsState, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceBreadcrumb } from "@/components/workspace-shell";
import { ArrowLeft, ExternalLink, MoreHorizontal } from "lucide-react";
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

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];

const projectViews: ReadonlyArray<{ id: ProjectWorkspaceView; label: string }> =
  [
    { id: "overview", label: "Overview" },
    { id: "outputs", label: "Outputs and Versions" },
    { id: "review", label: "Client Review" },
    { id: "files", label: "Files and Links" },
    { id: "activity", label: "Activity" },
  ];

const WORKFLOW_STAGES = ["Planned", "In Progress", "Review", "Delivered"];

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
    <WorkspacePage family="master-detail" mode="fill">
      {/* The visible title lives in the shell breadcrumb. */}
      <h1 className="sr-only">{project.title}</h1>
      <PageContent mode="fill">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex min-w-0 shrink-0 items-center justify-between gap-3">
            <SectionNav
              aria-label="Project workspace views"
              items={projectViews}
              value={view}
              onValueChange={onViewChange}
            />
            <div className="flex shrink-0 items-center gap-2">
              <OwnedButton variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft aria-hidden="true" />
                Projects
              </OwnedButton>
              {canEdit ? (
                <OwnedButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(project)}
                >
                  Edit
                </OwnedButton>
              ) : null}
              {canDelete ? (
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => onDelete(project)}
                    >
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 pb-5">
            {view === "overview" ? (
              <SplitPane
                ratio="inspector"
                className="h-auto items-start"
                primary={
                  <div className="grid content-start gap-4">
                    <ContentSection title="Workflow">
                      <ProjectStageTracker status={project.status} />
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
                            Edit
                          </OwnedButton>
                        ) : null
                      }
                    >
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-sm leading-6",
                          !project.notes && "text-muted-foreground"
                        )}
                      >
                        {project.notes || "No internal notes."}
                      </p>
                    </ContentSection>
                    <ContentSection
                      title="Client payment"
                      description={
                        isClientBillable
                          ? project.paid
                            ? `Paid${project.paidDate ? ` · ${formatShortDateTime(project.paidDate)}` : ""}`
                            : "Delivered, not paid"
                          : isSalary
                            ? "Paid per batch"
                            : "Payment tracking starts after delivery"
                      }
                      actions={
                        <OwnedSwitch
                          checked={Boolean(project.paid)}
                          disabled={!canManagePayment || !isClientBillable}
                          aria-label={`${project.paid ? "Mark unpaid" : "Mark paid"}: ${project.title}`}
                          onCheckedChange={(paid) =>
                            onPaymentChange(project, paid)
                          }
                        />
                      }
                    />
                  </div>
                }
                secondary={
                  <aside
                    aria-label="Project details"
                    className={cn(
                      cardSurfaceClassName,
                      "h-fit text-sm lg:sticky lg:top-0"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 px-5 pt-5">
                      <h2 className="text-sm font-semibold">Details</h2>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                    <div className="px-5 pt-4">
                      <OwnedProgress
                        value={progress}
                        aria-label="Project workflow progress"
                        className="h-1"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {clientPortalStage(project.status)}
                      </p>
                    </div>
                    <dl className="grid px-5 pt-3 pb-4">
                      <div className="flex min-h-9 items-center justify-between gap-4 text-xs">
                        <dt className="shrink-0 text-muted-foreground">
                          Stage
                        </dt>
                        <dd className="min-w-0">
                          {canUpdateStatus ? (
                            <ProjectSelect
                              value={project.status}
                              options={statusOptions}
                              onChange={(status) => {
                                if (status !== "Client Review")
                                  onStatusChange(project, status);
                              }}
                              compact
                              className="!h-7 min-w-[8.5rem] text-xs"
                            />
                          ) : (
                            <ProjectStatusBadge status={project.status} />
                          )}
                        </dd>
                      </div>
                      <ProjectMetadataRow
                        label="Client"
                        value={project.client || "Not assigned"}
                      />
                      <ProjectMetadataRow
                        label="Project Group"
                        value={projectGroup?.name || "None"}
                      />
                      <ProjectMetadataRow label="Lead" value={lead} />
                      <ProjectMetadataRow
                        label="Assignees"
                        value={assigneeLabel}
                      />
                      <ProjectMetadataRow label="Due" value={dueLabel} />
                      <ProjectMetadataRow
                        label="Work type"
                        value={project.workType}
                      />
                      <ProjectMetadataRow label="Value" value={amount} />
                      <ProjectMetadataRow
                        label="Payment"
                        value={paymentLabel}
                      />
                      <ProjectMetadataRow
                        label="Created"
                        value={createdLabel}
                      />
                    </dl>
                  </aside>
                }
              />
            ) : (
              <div className="grid content-start gap-4">
                {view === "outputs" ? (
                  <ProjectOutputsPanel
                    project={project}
                    canEdit={canEdit}
                    canResolveComments={canComment}
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
                      clientHubEnabled={clientHubEnabled}
                      customPortalBrandingEnabled={customPortalBrandingEnabled}
                    />
                  </>
                ) : null}

                {view === "files" ? (
                  <>
                    <ContentSection
                      title="External links"
                      metadata={
                        <OwnedBadge variant="secondary" className="rounded-sm">
                          {configuredLinks.length}
                        </OwnedBadge>
                      }
                      bodyMode="flush"
                    >
                      {configuredLinks.length ? (
                        <div className={sectionListClassName}>
                          {configuredLinks.map(({ service, link }) =>
                            link ? (
                              <a
                                key={service.id}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  sectionRowClassName,
                                  "flex items-center justify-between gap-3 text-sm"
                                )}
                              >
                                <span className="min-w-0 truncate">
                                  {integrationDisplayText(link, service.name)}
                                </span>
                                <ExternalLink
                                  className="size-4 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </a>
                            ) : null
                          )}
                        </div>
                      ) : (
                        <p className="px-5 pb-5 text-sm text-muted-foreground">
                          No external links yet.
                        </p>
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
            )}
          </div>
        </div>
      </PageContent>
    </WorkspacePage>
  );
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
                reached
                  ? "bg-[var(--app-ink)]"
                  : "bg-[var(--app-progress-track)]",
                "rounded-sm"
              )}
            />
            <span
              className={cn(
                "mt-2 block text-xs",
                reached ? "text-foreground" : "text-muted-foreground",
                index === currentIndex && "font-medium"
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

function ProjectMetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 text-xs">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      variant="outline"
      className={cn(
        "rounded-sm",
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

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
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
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
import { ExternalLink, MoreHorizontal } from "lucide-react";
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
  const isClientBillable =
    !isSalaryWorkType(project.workType, settings) &&
    isDoneStatus(project.status) &&
    safeMoneyValue(project.earnings) > 0;
  const amount = isSalaryWorkType(project.workType, settings)
    ? "Batch tracked"
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
      : "Outstanding"
    : isSalaryWorkType(project.workType, settings)
      ? "Batch tracked"
      : "Not billable";
  const configuredLinks = integrationServices
    .map((service) => ({
      service,
      link: project.integrationLinks?.[service.id],
    }))
    .filter(({ link }) => hasIntegrationLink(link));
  const views: Array<{ id: ProjectWorkspaceView; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "outputs", label: "Outputs and Versions" },
    { id: "review", label: "Client Review" },
    { id: "files", label: "Files and Links" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <WorkspacePage family="master-detail" mode="fill">
      <PageHeader
        eyebrow={`${project.client || "No Client"}${projectGroup ? ` / ${projectGroup.name}` : ""}`}
        title={project.title}
        description={`Due ${formatDate(project.dueDate, settings.dateFormat)} · Lead ${lead} · ${assignedMembers.length ? assignedMembers.map((member) => member.name || member.email).join(", ") : "No assignees"}`}
        actions={
          <>
            <OwnedButton variant="ghost" onClick={onBack}>
              Back to Projects
            </OwnedButton>
            {canEdit ? (
              <OwnedButton variant="outline" onClick={() => onEdit(project)}>
                Edit
              </OwnedButton>
            ) : null}
            {canDelete ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OwnedButton
                    variant="ghost"
                    size="icon"
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
          </>
        }
      />
      <PageContent mode="fill">
        <SplitPane
          ratio="inspector"
          className="min-h-0 flex-1 lg:h-full"
          primary={
            <div className="flex h-full min-h-0 flex-col">
              <nav
                aria-label="Project workspace views"
                className="flex min-w-0 shrink-0 items-stretch overflow-x-auto border-b border-[var(--app-border)]"
              >
                {views.map((item) => (
                  <OwnedButton
                    key={item.id}
                    size="sm"
                    variant="ghost"
                    aria-current={view === item.id ? "page" : undefined}
                    className={cn(
                      "relative h-11 min-w-[8.5rem] flex-1 shrink-0 rounded-none border-b-2 border-transparent px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] sm:min-w-0",
                      view === item.id &&
                        "border-b-[var(--app-accent)] bg-transparent text-[var(--app-ink)] hover:bg-transparent"
                    )}
                    onClick={() => onViewChange(item.id)}
                  >
                    {item.label}
                  </OwnedButton>
                ))}
              </nav>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {view === "overview" ? (
                  <div className="grid gap-4 overflow-y-auto pb-5">
                    <MetricStrip columns={4}>
                      <MetricItem label="Stage" value={project.status} />
                      <MetricItem
                        label="Due"
                        value={formatDate(project.dueDate, settings.dateFormat)}
                      />
                      <MetricItem label="Value" value={amount} />
                      <MetricItem
                        label="Payment"
                        value={paymentLabel}
                      />
                    </MetricStrip>
                    <ContentSection
                      title="Workflow"
                      description={`${getProjectProgress(project)}% complete`}
                    >
                      <ProjectStageTracker status={project.status} />
                    </ContentSection>
                    <ContentSection
                      title="Project details"
                      actions={
                        canEdit ? (
                          <OwnedButton
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(project)}
                          >
                            Edit details
                          </OwnedButton>
                        ) : null
                      }
                    >
                      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <ProjectMetadataRow
                          label="Client"
                          value={project.client || "Not assigned"}
                        />
                        <ProjectMetadataRow
                          label="Project Group"
                          value={projectGroup?.name || "None"}
                        />
                        <ProjectMetadataRow
                          label="Financial type"
                          value={project.workType}
                        />
                        <ProjectMetadataRow
                          label="Created"
                          value={
                            project.createdAt
                              ? formatShortDateTime(project.createdAt)
                              : "Not recorded"
                          }
                        />
                      </dl>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {project.notes || "No internal notes."}
                      </p>
                    </ContentSection>
                    <ContentSection
                      title="Client payment"
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
                    >
                      <p className="text-sm text-muted-foreground">
                        {isClientBillable
                          ? project.paid
                            ? `Collected${project.paidDate ? ` ${formatShortDateTime(project.paidDate)}` : ""}.`
                            : "Delivered and outstanding."
                          : "Payment tracking starts after delivery for client-priced work."}
                      </p>
                    </ContentSection>
                  </div>
                ) : null}

                {view === "outputs" ? (
                  <ProjectOutputsPanel
                    project={project}
                    canEdit={canEdit}
                    canResolveComments={canComment}
                  />
                ) : null}

                {view === "review" ? (
                  <div className="grid gap-4 overflow-y-auto pb-5">
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
                  </div>
                ) : null}

                {view === "files" ? (
                  <div className="grid gap-4 overflow-y-auto pb-5">
                    <ContentSection
                      title="External links"
                      metadata={
                        <OwnedBadge variant="secondary">
                          {configuredLinks.length}
                        </OwnedBadge>
                      }
                    >
                      <div className="divide-y divide-border">
                        {configuredLinks.length ? (
                          configuredLinks.map(({ service, link }) =>
                            link ? (
                              <a
                                key={service.id}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-3 py-3 text-sm hover:underline"
                              >
                                <span>
                                  {integrationDisplayText(link, service.name)}
                                </span>
                                <ExternalLink className="size-4" />
                              </a>
                            ) : null
                          )
                        ) : (
                          <p className="py-6 text-center text-sm text-muted-foreground">
                            No external links yet.
                          </p>
                        )}
                      </div>
                    </ContentSection>
                    <ProjectFileManager project={project} canEdit={canEdit} />
                  </div>
                ) : null}

                {view === "activity" ? (
                  <ProjectActivityFeed
                    project={project}
                    localActivity={localActivity}
                  />
                ) : null}
              </div>
            </div>
          }
          secondary={
            <div className="h-full min-h-0 pt-11">
              <aside
                aria-label="Project details"
                className="h-fit rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-card-foreground lg:sticky lg:top-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Project details
                    </h2>
                  </div>
                  {canUpdateStatus ? (
                    <ProjectSelect
                      value={project.status}
                      options={statusOptions}
                      onChange={(status) => {
                        if (status !== "Client Review")
                          onStatusChange(project, status);
                      }}
                      compact
                      className="min-w-[8.5rem]"
                    />
                  ) : (
                    <ProjectStatusBadge status={project.status} />
                  )}
                </div>

                <div className="mt-4 border-y border-[var(--app-border)] py-3">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-medium text-[var(--app-muted)]">
                      Workflow
                    </span>
                    <span className="font-mono tabular-nums text-[var(--app-ink)]">
                      {progress}%
                    </span>
                  </div>
                  <OwnedProgress
                    value={progress}
                    aria-label="Project workflow progress"
                    className="mt-2"
                  />
                  <p className="mt-2 text-[11px] text-[var(--app-muted)]">
                    {clientPortalStage(project.status)}
                  </p>
                </div>

                <dl className="mt-2 grid gap-0 text-sm">
                  <ProjectMetadataRow
                    label="Client"
                    value={project.client || "Not assigned"}
                  />
                  <ProjectMetadataRow
                    label="Project Group"
                    value={projectGroup?.name || "None"}
                  />
                  <ProjectMetadataRow label="Stage" value={project.status} />
                  <ProjectMetadataRow label="Lead" value={lead} />
                  <ProjectMetadataRow label="Assignees" value={assigneeLabel} />
                  <ProjectMetadataRow
                    label="Due"
                    value={formatDate(project.dueDate, settings.dateFormat)}
                  />
                  <ProjectMetadataRow
                    label="Work type"
                    value={project.workType}
                  />
                  <ProjectMetadataRow label="Value" value={amount} />
                  <ProjectMetadataRow label="Payment" value={paymentLabel} />
                </dl>
              </aside>
            </div>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function ProjectStageTracker({ status }: { status: string }) {
  const stages = ["Planned", "In Progress", "Review", "Delivered"];
  const currentStage = clientPortalStage(status);
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div>
      <OwnedProgress
        value={Math.max(8, ((currentIndex + 1) / stages.length) * 100)}
        aria-label="Project workflow progress"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {stages.map((stage, index) => (
          <span
            key={stage}
            className={`text-xs ${index <= currentIndex ? "text-foreground" : "text-muted-foreground"} ${index === currentIndex ? "font-semibold" : ""} ${index === 0 ? "text-left" : index === stages.length - 1 ? "text-right" : "text-center"}`}
          >
            {stage}
          </span>
        ))}
      </div>
    </div>
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
    <div className="flex justify-between gap-4 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      variant="outline"
      className={projectStatusTone(isDoneStatus(status) ? "Delivered" : status)}
    >
      {status}
    </OwnedBadge>
  );
}

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
  return "Planning";
}

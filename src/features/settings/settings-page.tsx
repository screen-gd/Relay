"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { SettingsState } from "@/lib/types";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/telemetry";
import { relay } from "@/app/design-system";
import {
  FillViewport,
  MasterDetail,
  PageContent,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  Bell,
  Check,
  CircleCheckBig,
  Download,
  FolderKanban,
  Globe2,
  History,
  LockKeyhole,
  Palette,
  Plug,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { ProjectSelect } from "@/features/projects/project-select";
import { cn } from "@/lib/utils";
import { useSettingsController } from "./settings-controller";
import {
  currencyLabels,
  currencyOptions,
  defaultRolePermissions,
  defaultSalaryBatchAmount,
  defaultSalaryBatchSize,
  defaultSettings,
} from "./settings-defaults";
import { defaultIntegrationConfigs } from "@/features/integrations/integration-constants";
import {
  nextProjectTagName,
  nextStageName,
  projectStageIssues,
  projectTagIssues,
} from "./settings-utils";
import { notificationCopy } from "@/features/notifications/notification-copy";
import { IntegrationLinkManager } from "@/features/integrations/integrations-page";
import {
  canonicalWorkType,
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
} from "@/features/routes/utils/work-type-utils";
import { money } from "@/features/routes/utils/number-utils";
import type { ToastState } from "@/features/routes/shared/route-types";
import {
  accent,
  successColor,
  warningColor,
} from "@/features/routes/shared/route-theme";
import type { TeamWorkspaceContract } from "@/features/team/team-types";
import {
  SegmentedSetting,
  SettingsPanel,
  SettingsLink,
} from "./settings-components";

export function SettingsDesignPage({
  settings,
  setSettings,
  notify,
  teamWorkspace,
  canManageWorkspace = false,
}: {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((current: SettingsState) => SettingsState)
  ) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  teamWorkspace?: TeamWorkspaceContract;
  canManageWorkspace?: boolean;
}) {
  const {
    exportBackup,
    importBackup,
    settingsSaveState,
    retrySettingsSave,
    updateWorkspaceSettings,
  } = useSettingsController();
  const [optionalAnalytics, setOptionalAnalytics] = useState(
    () => getAnalyticsConsent() === "granted"
  );
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [workspaceDraft, setWorkspaceDraft] = useState(() => ({
    name: teamWorkspace?.name ?? settings.studioName,
    currencyCode: teamWorkspace?.currencyCode ?? settings.currencyCode,
    timeZone: teamWorkspace?.timeZone ?? settings.timeZone,
    defaultWorkflowTemplateId:
      teamWorkspace?.defaultWorkflowTemplateId ?? "relay-default-workflow",
    allowAllTeamProjects: teamWorkspace?.allowAllTeamProjects ?? false,
  }));
  const [activeSection, setActiveSection] = useState<
    | "workspace"
    | "workflow"
    | "notifications"
    | "permissions"
    | "integrations"
    | "appearance"
    | "regional"
  >("workspace");
  const stageColors = [
    "var(--workflow-stage-1)",
    "var(--workflow-stage-2)",
    "var(--workflow-stage-3)",
    "var(--workflow-stage-4)",
    "var(--workflow-stage-5)",
    "var(--workflow-stage-6)",
  ];
  const stageIssues = projectStageIssues(settings.projectStages);
  const tagIssues = projectTagIssues(settings.projectTags);
  const rolePolicy = [
    {
      role: "Owner",
      permissions: [
        "Create and edit projects",
        "Update project stages",
        "Leave project notes",
        "Assign work",
        "Mention teammates",
        "Use team chat",
        "Manage members and roles",
      ],
    },
    {
      role: "Editor",
      permissions: [
        "Create and edit projects",
        "Update project stages",
        "Leave project notes",
        "Assign work",
        "Mention teammates",
        "Use team chat",
      ],
    },
    {
      role: "Viewer",
      permissions: [
        "View team projects",
        "Review assigned work",
        "Use team chat",
      ],
    },
  ];
  const workflowTemplateOptions = [
    ...PROJECT_TEMPLATES,
    ...settings.customProjectTemplates,
  ];
  const workflowTemplateIds = workflowTemplateOptions.map(
    (template) => template.id
  );
  const workflowTemplateLabels = Object.fromEntries(
    workflowTemplateOptions.map((template) => [template.id, template.name])
  );

  useEffect(() => {
    if (!teamWorkspace) return;
    setWorkspaceDraft({
      name: teamWorkspace.name,
      currencyCode: teamWorkspace.currencyCode ?? settings.currencyCode,
      timeZone: teamWorkspace.timeZone ?? settings.timeZone,
      defaultWorkflowTemplateId:
        teamWorkspace.defaultWorkflowTemplateId ?? "relay-default-workflow",
      allowAllTeamProjects: teamWorkspace.allowAllTeamProjects ?? false,
    });
  }, [settings.currencyCode, settings.timeZone, teamWorkspace]);

  async function saveWorkspaceSettings(
    overrides: Partial<typeof workspaceDraft> = {}
  ) {
    if (!teamWorkspace) return;
    const nextDraft = { ...workspaceDraft, ...overrides };
    try {
      await updateWorkspaceSettings({
        teamId: teamWorkspace._id,
        ...nextDraft,
      });
      setSettings((current) => ({
        ...current,
        studioName: nextDraft.name,
        currencyCode: nextDraft.currencyCode,
        timeZone: nextDraft.timeZone,
      }));
      notify("Workspace settings saved.", "success");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Workspace settings could not be saved.",
        "warning"
      );
    }
  }
  const settingsNavigation = [
    { id: "workspace" as const, label: "Workspace", icon: FolderKanban },
    { id: "workflow" as const, label: "Workflow", icon: History },
    { id: "permissions" as const, label: "Permissions", icon: LockKeyhole },
    { id: "integrations" as const, label: "Integrations", icon: Plug },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "regional" as const, label: "Regional", icon: Globe2 },
  ];

  function updateNotification(name: string, enabled: boolean) {
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [name]: enabled },
    });
    notify(
      `${name} notifications ${enabled ? "enabled" : "disabled"}.`,
      "info"
    );
  }

  function updateStage(index: number, value: string) {
    const projectStages = [...settings.projectStages];
    projectStages[index] = value;
    setSettings({ ...settings, projectStages });
  }

  function removeStage(index: number) {
    setSettings({
      ...settings,
      projectStages: settings.projectStages.filter(
        (_, stageIndex) => stageIndex !== index
      ),
    });
  }

  function updateProjectTag(index: number, value: string) {
    const projectTags = [...settings.projectTags];
    const previous = projectTags[index];
    projectTags[index] = value;
    const nextSalaryWorkType =
      previous && previous === settings.salaryWorkType
        ? value
        : settings.salaryWorkType;
    setSettings({
      ...settings,
      projectTags,
      salaryWorkType: nextSalaryWorkType,
    });
  }

  function addProjectTag() {
    setSettings({
      ...settings,
      projectTags: [
        ...settings.projectTags,
        nextProjectTagName(settings.projectTags),
      ],
    });
  }

  function removeProjectTag(index: number) {
    const removed = settings.projectTags[index];
    const projectTags = settings.projectTags.filter(
      (_, tagIndex) => tagIndex !== index
    );
    const salaryWorkType =
      removed === settings.salaryWorkType
        ? projectTags[0]
        : settings.salaryWorkType;
    setSettings({ ...settings, projectTags, salaryWorkType });
  }

  function updateSalaryBatchSize(value: string) {
    setSettings({
      ...settings,
      salaryBatchSize: normalizedSalaryBatchSize(
        Number(value || defaultSalaryBatchSize)
      ),
    });
  }

  function updateSalaryBatchAmount(value: string) {
    setSettings({
      ...settings,
      salaryBatchAmount: normalizedSalaryBatchAmount(
        Number(value || defaultSalaryBatchAmount)
      ),
    });
  }

  function resetSettings() {
    setSettings({
      ...defaultSettings,
      customClients: settings.customClients,
      clients: settings.clients,
      customProjectTemplates: defaultSettings.customProjectTemplates.map(
        (template) => ({
          ...template,
          workflowStages: template.workflowStages.map((stage) => ({
            ...stage,
          })),
          deliverables: template.deliverables.map((item) => ({ ...item })),
          checklistItems: [...template.checklistItems],
        })
      ),
      projectTags: [...defaultSettings.projectTags],
      projectStages: [...defaultSettings.projectStages],
      notifications: { ...defaultSettings.notifications },
      integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
      integrationLinks: {},
      teamMembers: defaultSettings.teamMembers.map((m) => ({ ...m })),
      rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
    });
    notify("Settings reset to defaults.", "warning");
  }

  function downloadBackup() {
    const url = URL.createObjectURL(
      new Blob([exportBackup()], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relay-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restoreBackup(file: File) {
    try {
      const counts = await importBackup(await file.text());
      notify(
        `Imported ${counts.projects} projects, ${counts.clients} clients, ${counts.projectGroups} Project Groups, ${counts.resources} resources, and ${counts.salaryBatches} salary batches.`
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Backup import failed.",
        "warning"
      );
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  return (
    <WorkspacePage family="administration" mode="fill">
      <PageHeader
        title="Settings"
        description="Manage workspace identity, production defaults, and team-wide behavior."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-[var(--app-muted)]">
              {settingsSaveState === "saved" ? (
                <CircleCheckBig className="size-4 text-[var(--app-success)]" />
              ) : null}
              <span role="status">
                {settingsSaveState === "saving"
                  ? "Saving..."
                  : settingsSaveState === "error"
                    ? "Save failed"
                    : settingsSaveState === "local"
                      ? "Saved on this device"
                      : "Saved"}
              </span>
            </span>
            {settingsSaveState === "error" ? (
              <OwnedButton variant="outline" onClick={retrySettingsSave}>
                Retry save
              </OwnedButton>
            ) : null}
          </div>
        }
      />
      <PageContent mode="fill" className="min-h-0">
        <PageToolbar className="lg:hidden" data-family-toolbar="settings">
          <OwnedSelect
            value={activeSection}
            onValueChange={(value) =>
              setActiveSection(value as typeof activeSection)
            }
          >
            <OwnedSelectTrigger
              aria-label="Choose settings section"
              className="w-full"
            >
              <OwnedSelectValue />
            </OwnedSelectTrigger>
            <OwnedSelectContent>
              {settingsNavigation.map(({ id, label }) => (
                <OwnedSelectItem key={id} value={id}>
                  {label}
                </OwnedSelectItem>
              ))}
            </OwnedSelectContent>
          </OwnedSelect>
        </PageToolbar>
        <FillViewport
          className="h-full min-h-0"
          bodyLabel="Settings workspace"
          bodyClassName="min-h-0 overflow-auto lg:overflow-hidden"
        >
          <MasterDetail
            className="h-full min-h-0 gap-4 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-2 sm:p-3 lg:gap-5 lg:p-4"
            master={
              <nav
                aria-label="Settings sections"
                data-slot="settings-navigation"
                data-navigation-kind="icon-index"
                className="hidden h-full min-h-0 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-soft-panel)] text-card-foreground lg:flex lg:flex-col"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--app-accent)]">
                    Settings index
                  </p>
                </div>
                <div className="grid flex-1 content-start gap-1 overflow-y-auto p-2 overscroll-contain">
                  {settingsNavigation.map(({ id, label, icon: Icon }) => (
                    <Fragment key={id}>
                      {id === "workspace" || id === "notifications" ? (
                        <p className="px-3 pt-3 pb-1 text-xs font-semibold">
                          {id === "workspace"
                            ? "Workspace defaults"
                            : "Personal preferences"}
                        </p>
                      ) : null}
                      <OwnedButton
                        key={id}
                        type="button"
                        variant="ghost"
                        aria-current={activeSection === id ? "page" : undefined}
                        onClick={() => setActiveSection(id)}
                        className={cn(
                          "min-h-11 w-full justify-start gap-3 rounded-[6px] px-3 text-left text-xs font-medium",
                          activeSection === id
                            ? "bg-[var(--app-active)] text-[var(--app-highlight)]"
                            : "text-muted-foreground hover:bg-accent hover:text-primary"
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {label}
                      </OwnedButton>
                    </Fragment>
                  ))}
                </div>
                <div className="border-t border-border p-4">
                  <OwnedButton
                    variant="ghost"
                    className="text-destructive"
                    onClick={resetSettings}
                  >
                    Reset preferences
                  </OwnedButton>
                </div>
              </nav>
            }
            detail={
              <section
                aria-label={`${settingsNavigation.find((item) => item.id === activeSection)?.label} settings`}
                className={cn(
                  "grid h-full min-h-0 min-w-0 content-start overflow-y-auto overscroll-contain rounded-lg border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3 sm:p-4 lg:pr-3 [&_[data-slot=content-section]]:border-0 [&_[data-slot=content-section]]:shadow-none",
                  "gap-3"
                )}
                tabIndex={0}
              >
                {activeSection === "workspace" ? (
                  <>
                    <SettingsPanel
                      id="workspace-profile"
                      title="Workspace profile"
                      subtitle="Shown across project pages, team spaces, and client handoffs."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldLayout label="Workspace name">
                          <OwnedInput
                            value={
                              teamWorkspace
                                ? workspaceDraft.name
                                : settings.studioName
                            }
                            disabled={
                              Boolean(teamWorkspace) && !canManageWorkspace
                            }
                            onChange={(event) =>
                              teamWorkspace
                                ? setWorkspaceDraft((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))
                                : setSettings({
                                    ...settings,
                                    studioName: event.target.value,
                                  })
                            }
                            onBlur={() => {
                              if (teamWorkspace && canManageWorkspace)
                                void saveWorkspaceSettings();
                            }}
                          />
                        </FieldLayout>
                        <FieldLayout label="Workspace owner">
                          <OwnedInput
                            value={settings.profileName}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                profileName: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                        <FieldLayout
                          label="Workspace role"
                          className="sm:col-span-2"
                        >
                          <OwnedInput
                            value={settings.profileTitle}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                profileTitle: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                      </div>
                      {teamWorkspace ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <ProjectSelect
                            label="Workspace currency"
                            value={workspaceDraft.currencyCode}
                            options={["USD", "EUR", "GBP", "INR", "AED", "SAR"]}
                            disabled={!canManageWorkspace}
                            onChange={(value) => {
                              setWorkspaceDraft((current) => ({
                                ...current,
                                currencyCode: value,
                              }));
                              if (canManageWorkspace)
                                void saveWorkspaceSettings({
                                  currencyCode: value,
                                });
                            }}
                          />
                          <FieldLayout label="Time zone">
                            <OwnedInput
                              value={workspaceDraft.timeZone}
                              disabled={!canManageWorkspace}
                              onChange={(event) =>
                                setWorkspaceDraft((current) => ({
                                  ...current,
                                  timeZone: event.target.value,
                                }))
                              }
                              onBlur={() => {
                                if (canManageWorkspace)
                                  void saveWorkspaceSettings();
                              }}
                            />
                          </FieldLayout>
                          <ProjectSelect
                            label="Default workflow template"
                            value={
                              workflowTemplateIds.includes(
                                workspaceDraft.defaultWorkflowTemplateId
                              )
                                ? workspaceDraft.defaultWorkflowTemplateId
                                : (workflowTemplateIds[0] ??
                                  "relay-default-workflow")
                            }
                            options={
                              workflowTemplateIds.length
                                ? workflowTemplateIds
                                : ["relay-default-workflow"]
                            }
                            labels={workflowTemplateLabels}
                            disabled={!canManageWorkspace}
                            onChange={(value) => {
                              setWorkspaceDraft((current) => ({
                                ...current,
                                defaultWorkflowTemplateId: value,
                              }));
                              if (canManageWorkspace)
                                void saveWorkspaceSettings({
                                  defaultWorkflowTemplateId: value,
                                });
                            }}
                          />
                          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                            <span>
                              <span className="block font-medium">
                                Editors see all Team Projects
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Otherwise Editors see owned or assigned work.
                              </span>
                            </span>
                            <OwnedSwitch
                              checked={workspaceDraft.allowAllTeamProjects}
                              disabled={!canManageWorkspace}
                              aria-label="Editors see all Team Projects"
                              onCheckedChange={(checked) => {
                                setWorkspaceDraft((current) => ({
                                  ...current,
                                  allowAllTeamProjects: checked,
                                }));
                                if (canManageWorkspace)
                                  void saveWorkspaceSettings({
                                    allowAllTeamProjects: checked,
                                  });
                              }}
                            />
                          </label>
                        </div>
                      ) : null}
                    </SettingsPanel>
                    <SettingsPanel
                      id="workspace-backup"
                      title="Backup and restore"
                      subtitle="Export local Workspace data without account or connected-service details."
                    >
                      <div className="flex flex-wrap gap-2">
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={downloadBackup}
                        >
                          <Download aria-hidden="true" /> Export backup
                        </OwnedButton>
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={() => backupInputRef.current?.click()}
                        >
                          <Upload aria-hidden="true" /> Import backup
                        </OwnedButton>
                        <input
                          ref={backupInputRef}
                          type="file"
                          accept="application/json,.json"
                          className="sr-only"
                          aria-label="Choose Relay backup"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void restoreBackup(file);
                          }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Import replaces Local Mode data. Cloud import works only
                        when the Workspace has no projects, files, or Salary
                        Batches.
                      </p>
                    </SettingsPanel>
                    <SettingsPanel
                      id="project-rules"
                      title="Production defaults"
                      subtitle="Legacy local fallback for project tags and salary batch defaults. Authenticated owners should use Salary Plans below."
                    >
                      <div className="grid gap-3">
                        {settings.projectTags.map((tag, index) => (
                          <div
                            key={`project-tag-${index}`}
                            className="flex min-w-0 items-end gap-3"
                          >
                            <FieldLayout
                              label={`Tag ${index + 1}`}
                              className="min-w-0 flex-1"
                            >
                              <OwnedInput
                                value={tag}
                                aria-label={`Project tag ${index + 1}`}
                                aria-invalid={Boolean(tagIssues && !tag.trim())}
                                onChange={(event) =>
                                  updateProjectTag(index, event.target.value)
                                }
                              />
                            </FieldLayout>
                            <OwnedButton
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove project tag ${index + 1}`}
                              title="Remove tag"
                              disabled={settings.projectTags.length <= 1}
                              onClick={() => removeProjectTag(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 aria-hidden="true" />
                            </OwnedButton>
                          </div>
                        ))}
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={addProjectTag}
                          className="justify-self-start"
                        >
                          <Plus aria-hidden="true" />
                          Add Tag
                        </OwnedButton>
                        {tagIssues ? (
                          <p role="alert" className="text-sm text-destructive">
                            {tagIssues}
                          </p>
                        ) : null}
                        <div className="grid gap-3 pt-1 md:grid-cols-3">
                          <ProjectSelect
                            label="Salary Tag"
                            value={canonicalWorkType(
                              settings.salaryWorkType,
                              settings.projectTags
                            )}
                            options={settings.projectTags}
                            onChange={(value) =>
                              setSettings({
                                ...settings,
                                salaryWorkType: value,
                              })
                            }
                          />
                          <FieldLayout label="Legacy videos per batch">
                            <OwnedInput
                              type="number"
                              value={normalizedSalaryBatchSize(
                                settings.salaryBatchSize
                              )}
                              min={1}
                              step={1}
                              onChange={(event) =>
                                updateSalaryBatchSize(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <FieldLayout label="Legacy salary per batch">
                            <OwnedInput
                              type="number"
                              value={normalizedSalaryBatchAmount(
                                settings.salaryBatchAmount
                              )}
                              min={1}
                              step={1}
                              onChange={(event) =>
                                updateSalaryBatchAmount(event.target.value)
                              }
                            />
                          </FieldLayout>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Completed projects tagged "
                          {canonicalWorkType(
                            settings.salaryWorkType,
                            settings.projectTags
                          )}
                          " count toward{" "}
                          {normalizedSalaryBatchSize(settings.salaryBatchSize)}{" "}
                          videos per salary batch worth{" "}
                          {money(
                            normalizedSalaryBatchAmount(
                              settings.salaryBatchAmount
                            ),
                            settings.currencyCode
                          )}
                          .
                        </p>
                      </div>
                    </SettingsPanel>
                  </>
                ) : null}
                {activeSection === "workflow" ? (
                  <SettingsPanel
                    id="workflow"
                    title="Project Stages"
                    subtitle="Default workflow stages for new work."
                  >
                    {settings.projectStages.map((stage, index) => (
                      <div
                        key={`project-stage-${index}`}
                        className="flex items-center gap-3"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              stageColors[index % stageColors.length],
                          }}
                        />
                        <OwnedInput
                          value={stage}
                          aria-label={`Workflow stage ${index + 1}`}
                          aria-invalid={Boolean(stageIssues && !stage.trim())}
                          onChange={(event) =>
                            updateStage(index, event.target.value)
                          }
                          className="min-w-0 flex-1"
                        />
                        <OwnedButton
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove workflow stage ${index + 1}`}
                          title="Remove stage"
                          disabled={settings.projectStages.length <= 1}
                          onClick={() => removeStage(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                        </OwnedButton>
                      </div>
                    ))}
                    <OwnedButton
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          projectStages: [
                            ...settings.projectStages,
                            nextStageName(settings.projectStages),
                          ],
                        })
                      }
                      className="justify-self-start"
                    >
                      <Plus aria-hidden="true" />
                      Add Stage
                    </OwnedButton>
                    {stageIssues ? (
                      <p role="alert" className="text-sm text-destructive">
                        {stageIssues}
                      </p>
                    ) : null}
                  </SettingsPanel>
                ) : null}
                {activeSection === "notifications" ? (
                  <SettingsPanel
                    id="notifications"
                    title="Notifications"
                    subtitle="Choose when project and team events should surface."
                  >
                    {Object.keys(defaultSettings.notifications).map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between gap-4 border-b py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {item}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {notificationCopy(item)}
                          </p>
                        </div>
                        <OwnedSwitch
                          checked={Boolean(settings.notifications[item])}
                          aria-label={`${item} notifications`}
                          onCheckedChange={(checked) =>
                            updateNotification(item, checked)
                          }
                        />
                      </div>
                    ))}
                    <SettingsLink
                      label="Toggle weekly summary"
                      onClick={() =>
                        updateNotification(
                          "Weekly summary",
                          !settings.notifications["Weekly summary"]
                        )
                      }
                    />
                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                      <div>
                        <p className="text-sm font-semibold">
                          Optional product analytics
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Anonymous feature-use events only. Work content and
                          money never leave the privacy boundary.
                        </p>
                      </div>
                      <OwnedSwitch
                        checked={optionalAnalytics}
                        aria-label="Optional product analytics"
                        onCheckedChange={(checked) => {
                          setOptionalAnalytics(checked);
                          setAnalyticsConsent(checked ? "granted" : "denied");
                        }}
                      />
                    </div>
                  </SettingsPanel>
                ) : null}
                {activeSection === "permissions" ? (
                  <SettingsPanel
                    id="permissions"
                    title="Team Roles & Permissions"
                    subtitle="Convex enforces these fixed workspace roles on every shared action."
                  >
                    <div className="grid gap-3 lg:grid-cols-3">
                      {rolePolicy.map(({ role, permissions }) => (
                        <div
                          key={role}
                          className="border-t-2 bg-muted p-4"
                          style={{
                            borderTopColor:
                              role === "Owner"
                                ? accent
                                : role === "Editor"
                                  ? warningColor
                                  : successColor,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  role === "Owner"
                                    ? accent
                                    : role === "Editor"
                                      ? warningColor
                                      : successColor,
                              }}
                            />
                            <h3 className="text-sm font-semibold text-foreground">
                              {role}
                            </h3>
                          </div>
                          <ul className="mt-3 grid gap-2">
                            {permissions.map((permission) => (
                              <li
                                key={permission}
                                className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                              >
                                <Check
                                  aria-hidden="true"
                                  className="mt-0.5 size-4 shrink-0 text-primary"
                                />
                                <span>{permission}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clients collaborate through private Client Portal links
                      and are not workspace members.
                    </p>
                  </SettingsPanel>
                ) : null}
                {activeSection === "integrations" ? (
                  <div id="integrations" className="scroll-mt-6">
                    <IntegrationLinkManager
                      title="Integrations"
                      subtitle="Save workspace-level links for storage, messaging, calendars, and review tools."
                      links={settings.integrationLinks}
                      emptyTitle="No integration links configured"
                      emptyBody="Add links to shared folders, calendars, review pages, or team channels. This does not connect to external APIs."
                      onChange={(integrationLinks) => {
                        setSettings({ ...settings, integrationLinks });
                        notify("Integration links updated.", "success");
                      }}
                    />
                  </div>
                ) : null}
                {activeSection === "appearance" ? (
                  <SettingsPanel
                    id="appearance"
                    title="Appearance"
                    subtitle="Customize how Relay looks and feels for your tracker."
                  >
                    <div className="grid items-end gap-5 md:grid-cols-2">
                      <SegmentedSetting
                        label="Theme"
                        options={["Light", "Dark", "System"]}
                        active={settings.theme}
                        onChange={(value) =>
                          setSettings({ ...settings, theme: value })
                        }
                      />
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Accent Color
                        </p>
                        <div className="flex gap-3">
                          {[
                            relay.color.teal,
                            relay.color.cyan,
                            relay.color.sky,
                            relay.color.indigo,
                            relay.color.pink,
                            relay.color.deepTeal,
                          ].map((color) => (
                            <OwnedButton
                              key={color}
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Use accent color ${color}`}
                              aria-pressed={settings.accentColor === color}
                              onClick={() =>
                                setSettings({ ...settings, accentColor: color })
                              }
                              className={`size-7 cursor-pointer rounded-full border p-0 transition-shadow hover:opacity-90 ${settings.accentColor === color ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border-border"}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SettingsPanel>
                ) : null}
                {activeSection === "regional" ? (
                  <SettingsPanel
                    id="regional"
                    title="Regional Preferences"
                    subtitle="Choose the currency used for earnings and payout totals."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <ProjectSelect
                        label="Currency"
                        value={
                          currencyLabels[settings.currencyCode] ??
                          settings.currencyCode
                        }
                        options={currencyOptions.map(
                          (code) => currencyLabels[code]
                        )}
                        onChange={(value) => {
                          const nextCode =
                            Object.entries(currencyLabels).find(
                              ([, label]) => label === value
                            )?.[0] ?? settings.currencyCode;
                          setSettings({ ...settings, currencyCode: nextCode });
                          notify(`Currency changed to ${nextCode}.`, "info");
                        }}
                      />
                      <FieldLayout label="Preview">
                        <OwnedInput
                          value={money(12500, settings.currencyCode)}
                          readOnly
                        />
                      </FieldLayout>
                    </div>
                  </SettingsPanel>
                ) : null}
              </section>
            }
          />
        </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}

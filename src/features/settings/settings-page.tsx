"use client";

import { useEffect, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import {
  isSettingsSection,
  type SettingsSectionId,
} from "@/components/workspace-navigation";
import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/telemetry";
import { downloadWorkspaceCsv, type CsvDataset } from "@/lib/export-csv";
import { relay } from "@/app/design-system";
import {
  PageActions,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import { Label as OwnedLabel } from "@/components/ui/label";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  ToggleGroup as OwnedToggleGroup,
  ToggleGroupItem as OwnedToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Check,
  CircleCheckBig,
  Download,
  Plus,
  Trash2,
  Upload,
} from "@/components/icons";
import { ProjectSelect } from "@/features/projects/project-select";
import { useSettingsController } from "./settings-controller";
import { WorkspaceAiSettings } from "./workspace-ai-settings";
import { RevisionScopeSettings } from "@/features/revision-scope/revision-scope-settings";
import {
  currencyLabels,
  createDefaultSettings,
  currencyOptions,
  defaultSalaryBatchAmount,
  defaultSalaryBatchSize,
  defaultSettings,
} from "./settings-defaults";
import {
  nextProjectTagName,
  nextStageName,
  projectStageIssues,
  projectTagIssues,
} from "./settings-utils";
import { notificationCopy } from "@/features/notifications/notification-copy";
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
  projects,
  salaryBatches,
  canManageFinance,
}: {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((current: SettingsState) => SettingsState)
  ) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  teamWorkspace?: TeamWorkspaceContract;
  canManageWorkspace?: boolean;
  projects: readonly WorkItem[];
  salaryBatches: readonly SalaryBatch[];
  canManageFinance: boolean;
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
  // The sidebar links each section as /settings?section=...; General is the default.
  const search = useSearch({ strict: false }) as { section?: unknown };
  const activeSection: SettingsSectionId = isSettingsSection(search.section)
    ? search.section
    : "workspace";
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
      ...createDefaultSettings(),
      customClients: settings.customClients,
      clients: settings.clients,
      integrationLinks: {},
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

  function exportCsv(dataset: CsvDataset) {
    downloadWorkspaceCsv(dataset, {
      projects,
      clients: settings.clients,
      salaryBatches,
      currencyCode: settings.currencyCode,
      includeMoney: canManageFinance,
    });
  }

  async function restoreBackup(file: File) {
    try {
      const counts = await importBackup(await file.text());
      notify(
        `Imported ${counts.projects} projects, ${counts.clients} clients, ${counts.projectGroups} Project Groups, ${counts.resources} resources, and ${counts.salaryBatches} payment batches.`
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
    <WorkspacePage family="administration">
      <PageHeader
        title="Settings"
        description="Your workspace details, project defaults, and preferences."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-text-3 type-label-sm">
              {settingsSaveState === "saved" ? (
                <CircleCheckBig className="size-4 text-text-1" />
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
              <OwnedButton
                variant="outline"
                size="sm"
                onClick={retrySettingsSave}
              >
                Retry save
              </OwnedButton>
            ) : null}
            <PageActions
              more={[{ label: "Reset preferences", onSelect: resetSettings }]}
            />
          </div>
        }
      />
      <div
        key={activeSection}
        className="grid min-w-0 animate-rise content-start gap-4"
      >
        {activeSection === "workspace" ? (
          <>
            <SettingsPanel
              id="workspace-profile"
              title="Workspace profile"
              subtitle="Shown on your projects, team pages, and client pages."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLayout label="Workspace name">
                  <OwnedInput
                    value={
                      teamWorkspace ? workspaceDraft.name : settings.studioName
                    }
                    disabled={Boolean(teamWorkspace) && !canManageWorkspace}
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
                <FieldLayout label="Workspace role" className="sm:col-span-2">
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
                        if (canManageWorkspace) void saveWorkspaceSettings();
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
                        : (workflowTemplateIds[0] ?? "relay-default-workflow")
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
                  <OwnedLabel className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 type-body">
                    <span>
                      <span className="block font-medium">
                        Editors see all Team Projects
                      </span>
                      <span className="mt-0.5 block text-muted-foreground type-label-sm">
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
                  </OwnedLabel>
                </div>
              ) : null}
            </SettingsPanel>
            <SettingsPanel
              id="project-rules"
              title="Project defaults"
              subtitle="Project tags and payment batch settings for Local mode. Signed-in owners set salary terms under Reports > Payments."
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
                  <p role="alert" className="text-destructive type-body">
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
                  <FieldLayout label="Videos per batch">
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
                  <FieldLayout label="Salary per batch">
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
                <p className="text-muted-foreground type-label-sm">
                  Completed projects tagged "
                  {canonicalWorkType(
                    settings.salaryWorkType,
                    settings.projectTags
                  )}
                  " count toward{" "}
                  {normalizedSalaryBatchSize(settings.salaryBatchSize)} videos
                  per payment batch worth{" "}
                  {money(
                    normalizedSalaryBatchAmount(settings.salaryBatchAmount),
                    settings.currencyCode
                  )}
                  .
                </p>
              </div>
            </SettingsPanel>
          </>
        ) : null}
        {activeSection === "workflow" ? (
          <>
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
                      backgroundColor: stageColors[index % stageColors.length],
                    }}
                  />
                  <OwnedInput
                    value={stage}
                    aria-label={`Workflow stage ${index + 1}`}
                    aria-invalid={Boolean(stageIssues && !stage.trim())}
                    onChange={(event) => updateStage(index, event.target.value)}
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
                <p role="alert" className="text-destructive type-body">
                  {stageIssues}
                </p>
              ) : null}
            </SettingsPanel>
            <RevisionScopeSettings
              workspaceId={teamWorkspace?._id}
              templates={workflowTemplateOptions}
              notify={notify}
            />
          </>
        ) : null}
        {activeSection === "ai" ? (
          <WorkspaceAiSettings
            workspaceId={teamWorkspace?._id}
            notify={notify}
          />
        ) : null}
        {activeSection === "data" ? (
          <>
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
                <OwnedInput
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
              <p className="mt-3 text-muted-foreground type-label-sm">
                Import replaces Local Mode data. Cloud import works only when
                the Workspace has no projects, files, or Salary Batches.
              </p>
            </SettingsPanel>
            <SettingsPanel
              id="workspace-csv-export"
              title="Export CSV"
              subtitle="Spreadsheet files for projects, clients, and payments, ready to open in Excel or Sheets."
            >
              <div className="flex flex-wrap gap-2">
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => exportCsv("projects")}
                >
                  <Download aria-hidden="true" /> Export projects CSV
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => exportCsv("clients")}
                >
                  <Download aria-hidden="true" /> Export clients CSV
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => exportCsv("payments")}
                >
                  <Download aria-hidden="true" /> Export payments CSV
                </OwnedButton>
              </div>
            </SettingsPanel>
          </>
        ) : null}
        {activeSection === "notifications" ? (
          <SettingsPanel
            id="notifications"
            title="Notifications"
            subtitle="Choose which project and team updates notify you."
          >
            {Object.keys(defaultSettings.notifications).map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-4 border-b py-3"
              >
                <div>
                  <p className="text-foreground type-label">{item}</p>
                  <p className="mt-0.5 text-muted-foreground type-label-sm">
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
                <p className="type-label">Optional product analytics</p>
                <p className="mt-0.5 text-muted-foreground type-label-sm">
                  Anonymous feature-use events only. Work content and money
                  never leave the privacy boundary.
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
                    <h3 className="text-foreground type-label">{role}</h3>
                  </div>
                  <ul className="mt-3 grid gap-2">
                    {permissions.map((permission) => (
                      <li
                        key={permission}
                        className="flex items-start gap-2 text-muted-foreground type-label-sm"
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
            <p className="text-muted-foreground type-label-sm">
              Clients collaborate through private Client Portal links and are
              not workspace members.
            </p>
          </SettingsPanel>
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
                onChange={(value) => setSettings({ ...settings, theme: value })}
              />
              <div>
                <p className="mb-2 text-muted-foreground type-label-sm">
                  Accent Color
                </p>
                <OwnedToggleGroup
                  type="single"
                  value={settings.accentColor}
                  aria-label="Accent Color"
                  onValueChange={(color) => {
                    if (color) setSettings({ ...settings, accentColor: color });
                  }}
                  className="h-auto gap-3 bg-transparent p-0"
                >
                  {[
                    relay.color.lime,
                    relay.color.teal,
                    relay.color.cyan,
                    relay.color.sky,
                    relay.color.indigo,
                    relay.color.pink,
                    relay.color.deepTeal,
                  ].map((color) => (
                    <OwnedToggleGroupItem
                      key={color}
                      value={color}
                      aria-label={`Use accent color ${color}`}
                      className="size-7 cursor-pointer border p-0 hover:opacity-90 data-[state=on]:border-foreground data-[state=on]:ring-2 data-[state=on]:ring-foreground data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-card data-[state=off]:border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </OwnedToggleGroup>
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
                  currencyLabels[settings.currencyCode] ?? settings.currencyCode
                }
                options={currencyOptions.map((code) => currencyLabels[code])}
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
      </div>
    </WorkspacePage>
  );
}

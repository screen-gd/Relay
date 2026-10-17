"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { MoreHorizontal as RelayActionMenuIcon } from "@/components/icons";
import {
  DropdownMenu as RelayActionMenu,
  DropdownMenuContent as RelayActionMenuContent,
  DropdownMenuItem as RelayActionMenuItem,
  DropdownMenuTrigger as RelayActionMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Check,
  CircleCheckBig,
  Download,
  Plus,
  Upload,
} from "@/components/icons";
import { AccentPicker } from "@/components/ui/accent-picker";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import { Label as OwnedLabel } from "@/components/ui/label";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  PageActions,
  PageContent,
  PageFilters,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { notificationCopy } from "@/features/notifications/notification-copy";
import { ProjectSelect } from "@/features/projects/project-select";
import { RevisionScopeSettings } from "@/features/revision-scope/revision-scope-settings";
import {
  successColor,
  warningColor,
} from "@/features/routes/shared/route-theme";
import type { ToastState } from "@/features/routes/shared/route-types";
import { money } from "@/features/routes/utils/number-utils";
import {
  canonicalWorkType,
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
} from "@/features/routes/utils/work-type-utils";
import type { TeamWorkspaceContract } from "@/features/team/team-types";
import { downloadWorkspaceCsv, type CsvDataset } from "@/lib/export-csv";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/telemetry";
import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  SegmentedSetting,
  SettingsLink,
  SettingsPanel,
} from "./settings-components";
import { useSettingsController } from "./settings-controller";
import {
  createDefaultSettings,
  currencyLabels,
  currencyOptions,
  defaultSalaryBatchAmount,
  defaultSalaryBatchSize,
  defaultSettings,
} from "./settings-defaults";
import { settingsNavigation } from "./settings-navigation";
import {
  nextProjectTagName,
  nextStageName,
  projectStageIssues,
  projectTagIssues,
} from "./settings-utils";
import { WorkspaceAiSettings } from "./workspace-ai-settings";

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
  const confirm = useConfirm();
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
  const [activeSection, setActiveSection] =
    useState<(typeof settingsNavigation)[number]["id"]>("workspace");
  const sectionHash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  useEffect(() => {
    const section =
      settingsNavigation.find(({ id }) => id === sectionHash) ??
      settingsNavigation[0];
    setActiveSection(section.id);
  }, [sectionHash]);
  const stageColors = [
    "var(--status-info)",
    "var(--status-warning)",
    "var(--status-success)",
    "var(--status-danger)",
    "var(--text-meta)",
    "var(--text-meta)",
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

  async function removeStage(index: number) {
    if (
      !(await confirm({
        title: "Remove workflow stage?",
        description: settings.projectStages[index],
        confirmLabel: "Remove",
        destructive: true,
      }))
    )
      return;
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

  async function removeProjectTag(index: number) {
    if (
      !(await confirm({
        title: "Remove project tag?",
        description: settings.projectTags[index],
        confirmLabel: "Remove",
        destructive: true,
      }))
    )
      return;
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

  async function resetSettings() {
    if (
      !(await confirm({
        title: "Reset settings?",
        description:
          "Appearance, workflow and saved integrations will return to defaults.",
        confirmLabel: "Reset",
        destructive: true,
      }))
    )
      return;
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
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-meta font-medium text-[var(--text-meta)]">
              {settingsSaveState === "saved" ? (
                <CircleCheckBig className="size-4 text-[var(--status-success)]" />
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
              <OwnedButton variant="secondary" onClick={retrySettingsSave}>
                Retry save
              </OwnedButton>
            ) : null}
            <PageActions
              more={[
                {
                  label: "Reset preferences",
                  onSelect: resetSettings,
                  destructive: true,
                },
              ]}
            />
          </div>
        }
      />
      <PageContent>
        <PageFilters className="lg:hidden" data-family-toolbar="settings">
          <OwnedSelect
            value={activeSection}
            onValueChange={(value) => {
              const section = settingsNavigation.find(({ id }) => id === value);
              if (section) {
                setActiveSection(section.id);
                void navigate({
                  to: "/settings",
                  hash: section.id,
                  replace: true,
                });
              }
            }}
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
        </PageFilters>

        <section
          aria-label={`${settingsNavigation.find((item) => item.id === activeSection)?.label} settings`}
          className="grid min-w-0 content-start gap-(--space-section)"
          tabIndex={0}
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
                        teamWorkspace
                          ? workspaceDraft.name
                          : settings.studioName
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
                    <OwnedLabel className="flex items-center justify-between gap-3 font-normal">
                      <span>
                        <span className="block font-medium">
                          Editors see all Team Projects
                        </span>
                        <span className="mt-1 block text-meta text-[var(--text-meta)]">
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
              <WorkspaceAiSettings
                workspaceId={teamWorkspace?._id}
                notify={notify}
              />
              <RevisionScopeSettings
                workspaceId={teamWorkspace?._id}
                templates={workflowTemplateOptions}
                notify={notify}
              />
              <SettingsPanel
                id="workspace-backup"
                title="Backup and restore"
                subtitle="Export local Workspace data without account or connected-service details."
              >
                <div className="flex flex-wrap gap-2">
                  <OwnedButton
                    type="button"
                    variant="secondary"
                    onClick={downloadBackup}
                  >
                    <Download aria-hidden="true" /> Export backup
                  </OwnedButton>
                  <OwnedButton
                    type="button"
                    variant="secondary"
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
                <p className="mt-3 text-meta text-[var(--text-meta)]">
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
                    variant="secondary"
                    onClick={() => exportCsv("projects")}
                  >
                    <Download aria-hidden="true" /> Export projects CSV
                  </OwnedButton>
                  <OwnedButton
                    type="button"
                    variant="secondary"
                    onClick={() => exportCsv("clients")}
                  >
                    <Download aria-hidden="true" /> Export clients CSV
                  </OwnedButton>
                  <OwnedButton
                    type="button"
                    variant="secondary"
                    onClick={() => exportCsv("payments")}
                  >
                    <Download aria-hidden="true" /> Export payments CSV
                  </OwnedButton>
                </div>
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

                      <RelayActionMenu>
                        <RelayActionMenuTrigger asChild>
                          <OwnedButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove project tag ${index + 1}`}
                            disabled={settings.projectTags.length <= 1}
                          >
                            <RelayActionMenuIcon aria-hidden="true" />
                          </OwnedButton>
                        </RelayActionMenuTrigger>
                        <RelayActionMenuContent align="end">
                          <RelayActionMenuItem
                            variant="destructive"
                            disabled={settings.projectTags.length <= 1}
                            onSelect={() => removeProjectTag(index)}
                          >{`Remove project tag ${index + 1}`}</RelayActionMenuItem>
                        </RelayActionMenuContent>
                      </RelayActionMenu>
                    </div>
                  ))}
                  <OwnedButton
                    type="button"
                    variant="secondary"
                    onClick={addProjectTag}
                    className="justify-self-start"
                  >
                    <Plus aria-hidden="true" />
                    Add Tag
                  </OwnedButton>
                  {tagIssues ? (
                    <p
                      role="alert"
                      className="text-body text-[var(--status-danger)]"
                    >
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
                  <p className="text-meta text-[var(--text-meta)]">
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
                    className="size-1.5 shrink-0 rounded-full"
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

                  <RelayActionMenu>
                    <RelayActionMenuTrigger asChild>
                      <OwnedButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove workflow stage ${index + 1}`}
                        disabled={settings.projectStages.length <= 1}
                      >
                        <RelayActionMenuIcon aria-hidden="true" />
                      </OwnedButton>
                    </RelayActionMenuTrigger>
                    <RelayActionMenuContent align="end">
                      <RelayActionMenuItem
                        variant="destructive"
                        disabled={settings.projectStages.length <= 1}
                        onSelect={() => removeStage(index)}
                      >{`Remove workflow stage ${index + 1}`}</RelayActionMenuItem>
                    </RelayActionMenuContent>
                  </RelayActionMenu>
                </div>
              ))}
              <OwnedButton
                type="button"
                variant="secondary"
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
                <p
                  role="alert"
                  className="text-body text-[var(--status-danger)]"
                >
                  {stageIssues}
                </p>
              ) : null}
            </SettingsPanel>
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
                  className="flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] py-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-body font-medium text-[var(--text-primary)]">
                      {item}
                    </p>
                    <p className="mt-1 text-meta text-[var(--text-meta)]">
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
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-4">
                <div>
                  <p className="text-body font-medium">
                    Optional product analytics
                  </p>
                  <p className="mt-1 text-meta text-[var(--text-meta)]">
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
              <div className="grid lg:grid-cols-3">
                {rolePolicy.map(({ role, permissions }) => (
                  <div
                    key={role}
                    className="border-t border-[var(--border-hairline)] py-4 first:border-t-0 first:pt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            role === "Owner"
                              ? "var(--text-meta)"
                              : role === "Editor"
                                ? warningColor
                                : successColor,
                        }}
                      />
                      <h3 className="text-body font-medium text-[var(--text-primary)]">
                        {role}
                      </h3>
                    </div>
                    <ul className="mt-3 grid gap-2">
                      {permissions.map((permission) => (
                        <li
                          key={permission}
                          className="flex items-start gap-2 text-body text-[var(--text-primary)]"
                        >
                          <Check
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 text-[var(--text-primary)]"
                          />
                          <span>{permission}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-meta text-[var(--text-meta)]">
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
              <div className="grid items-end gap-4 md:grid-cols-2">
                <SegmentedSetting
                  label="Theme"
                  options={["Light", "Dark", "System"]}
                  active={settings.theme}
                  onChange={(value) =>
                    setSettings({ ...settings, theme: value })
                  }
                />
                <AccentPicker
                  value={settings.accentColor}
                  onChange={(accentColor) =>
                    setSettings({ ...settings, accentColor })
                  }
                />
              </div>
            </SettingsPanel>
          ) : null}
          {activeSection === "regional" ? (
            <SettingsPanel
              id="regional"
              title="Regional Preferences"
              subtitle="Choose the currency used for earnings and payout totals."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ProjectSelect
                  label="Currency"
                  value={
                    currencyLabels[settings.currencyCode] ??
                    settings.currencyCode
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
        </section>
      </PageContent>
    </WorkspacePage>
  );
}

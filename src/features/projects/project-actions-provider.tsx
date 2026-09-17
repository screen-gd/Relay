"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectGroupsDialog } from "@/components/project-groups-dialog";
import { useClientActions } from "@/features/clients/use-client-actions";
import {
  useProjectController,
  useProjectCreationController,
} from "./project-controller";
import { DeleteProjectDialog, ProjectDialog } from "./project-dialogs";
import { createProjectPort } from "./project-port";
import { ProjectAccessProvider, useProjectAccess } from "./project-access";
import {
  ProjectActivityProvider,
  useProjectActivity,
} from "./project-activity";
import { projectHref } from "./project-view";
import {
  useData,
  useProjectGroups,
  useProjectWorkflow,
} from "@/lib/data-context";
import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import type { WorkItem } from "@/lib/types";
import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/lib/project-templates";
import { mergeClientRecords } from "@/lib/clients";
import { canDeleteProject as projectCanBeDeleted } from "./project-permissions";
import {
  normalizeChecklistCompleted,
  normalizeProjectIntegrationLinks,
  validateProject,
} from "@/features/routes/utils/project-utils";
import {
  canonicalClientName,
  canonicalWorkType,
  defaultProjectNotes,
  getTypeConfig,
  isSalaryWorkType,
  projectWorkTypeOptions,
} from "@/features/routes/utils/work-type-utils";
import { createId, iso, todayDate } from "@/features/routes/utils/date-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import { safeMoneyValue } from "@/features/routes/utils/number-utils";
import {
  resolveOnboardingVariant,
  trackOnboardingEvent,
  type OnboardingVariant,
} from "@/lib/onboarding";
import { trackOptionalEvent } from "@/lib/telemetry";

export type ProjectActionScope = "personal" | "team";

export type ProjectActions = {
  openNewProject: (scope?: ProjectActionScope) => void;
  openBlankProject: (scope?: ProjectActionScope) => void;
  openTemplateProject: (
    template: ProjectTemplate,
    scope?: ProjectActionScope
  ) => void;
  openEditProject: (project: WorkItem) => void;
  requestDeleteProject: (projectId: string) => void;
  openProjectDetails: (project: WorkItem) => void;
  openProjectGroups: (scope: ProjectActionScope) => void;
  archiveProject: (project: WorkItem) => void;
  updateProjectStatus: (project: WorkItem, stage: string) => Promise<void>;
  updateProjectPayment: (project: WorkItem, paid: boolean) => void;
  canDeleteProject: (project: WorkItem | null) => boolean;
};

type ProjectActionsProviderProps = {
  children: ReactNode;
  sample?: boolean;
};

const profile = getProfile(DEFAULT_PROFILE_ID);

function emptyProjectForm(): WorkItem {
  return {
    id: "",
    profileId: profile.id,
    title: "",
    client: "",
    status: "Planned",
    workType: "Freelance",
    startDate: iso(todayDate()),
    dueDate: iso(todayDate()),
    earnings: 0,
    notes: "",
    integrationLinks: {},
  };
}

export function ProjectActionsProvider({
  children,
  sample = false,
}: ProjectActionsProviderProps) {
  return (
    <ProjectAccessProvider sample={sample}>
      <ProjectActivityProvider sample={sample}>
        <ProjectActionsRuntime sample={sample}>
          {children}
        </ProjectActionsRuntime>
      </ProjectActivityProvider>
    </ProjectAccessProvider>
  );
}

function ProjectActionsRuntime({
  children,
  sample,
}: ProjectActionsProviderProps) {
  const {
    items,
    settings,
    setItems,
    setSettings,
    salaryPlans,
    isSignedIn,
    setToast,
  } = useData();
  const workflow = useProjectWorkflow();
  const { groups, saveGroup, setGroupArchived } = useProjectGroups();
  const access = useProjectAccess();
  const { clientRecords, clientOptions, addClient } = useClientActions();
  const { recordProjectActivity, removeProjectActivity } = useProjectActivity();
  const router = useRouter();
  const projectPort = useMemo(() => createProjectPort(setItems), [setItems]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTemplateId, setNewProjectTemplateId] = useState(
    "relay-default-workflow"
  );
  const [projectGroupsOpen, setProjectGroupsOpen] = useState(false);
  const [projectGroupsScope, setProjectGroupsScope] =
    useState<ProjectActionScope>("personal");
  const [projectStartScope, setProjectStartScope] =
    useState<ProjectActionScope>("personal");
  const [editingId, setEditingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [form, setForm] = useState<WorkItem>(emptyProjectForm);
  const [formError, setFormError] = useState("");
  const projectLauncherTriggerRef = useRef<HTMLElement | null>(null);
  const onboardingStartedAt = useRef(Date.now());
  const [onboardingVariant, setOnboardingVariant] =
    useState<OnboardingVariant>("v2");

  useEffect(() => {
    setOnboardingVariant(sample ? "v2" : resolveOnboardingVariant());
  }, [sample]);

  const notify = useCallback(
    (message: string, tone: "success" | "info" | "warning" = "success") => {
      setToast({ message, tone });
    },
    [setToast]
  );

  useEffect(() => {
    if (JSON.stringify(settings.clients) === JSON.stringify(clientRecords))
      return;
    setSettings((current) => ({ ...current, clients: clientRecords }));
  }, [clientRecords, setSettings, settings.clients]);

  const projectTagOptions = useMemo(
    () => projectWorkTypeOptions(settings, access.projects),
    [access.projects, settings]
  );
  const workflowTemplates = useMemo(
    () => [...PROJECT_TEMPLATES, ...settings.customProjectTemplates],
    [settings.customProjectTemplates]
  );
  useEffect(() => {
    const defaultTemplateId = access.teamWorkspace?.defaultWorkflowTemplateId;
    if (
      !defaultTemplateId ||
      !workflowTemplates.some((template) => template.id === defaultTemplateId)
    )
      return;
    setNewProjectTemplateId(defaultTemplateId);
  }, [access.teamWorkspace?.defaultWorkflowTemplateId, workflowTemplates]);
  const rememberProjectLauncherTrigger = useCallback(() => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      projectLauncherTriggerRef.current = document.activeElement;
    }
  }, []);

  const openNewProject = useCallback(
    (scope: ProjectActionScope = "personal") => {
      if (scope === "team" && !access.canCreateTeamProjects) {
        notify("Your team role cannot create projects.", "warning");
        return;
      }
      if (scope === "team" && !access.currentTeamId) {
        notify(
          "Create or join a team workspace before adding team projects.",
          "warning"
        );
        return;
      }
      rememberProjectLauncherTrigger();
      setProjectStartScope(scope);
      setNewProjectTemplateId("relay-default-workflow");
      setNewProjectOpen(true);
    },
    [
      access.canCreateTeamProjects,
      access.currentTeamId,
      notify,
      rememberProjectLauncherTrigger,
    ]
  );

  const openBlankProject = useCallback(
    (scope: ProjectActionScope = projectStartScope) => {
      rememberProjectLauncherTrigger();
      setProjectStartScope(scope);
      setNewProjectTemplateId("");
      setNewProjectOpen(true);
    },
    [projectStartScope, rememberProjectLauncherTrigger]
  );

  const openTemplateProject = useCallback(
    (
      template: ProjectTemplate,
      scope: ProjectActionScope = projectStartScope
    ) => {
      if (!access.canCreateProjects) {
        notify("Your team role cannot create projects.", "warning");
        return;
      }
      if (
        scope === "team" &&
        (!access.canCreateTeamProjects || !access.currentTeamId)
      ) {
        notify(
          "Your team role cannot create projects in this workspace.",
          "warning"
        );
        return;
      }
      rememberProjectLauncherTrigger();
      setProjectStartScope(scope);
      setNewProjectTemplateId(template.id);
      setNewProjectOpen(true);
    },
    [
      access.canCreateProjects,
      access.canCreateTeamProjects,
      access.currentTeamId,
      notify,
      projectStartScope,
      rememberProjectLauncherTrigger,
    ]
  );

  const openEditProject = useCallback(
    (project: WorkItem) => {
      if (project.teamId && !access.canEditProjects) {
        notify("Your team role cannot edit team projects.", "warning");
        return;
      }
      setEditingId(project.id);
      setForm(project);
      setFormError("");
      setDialogOpen(true);
    },
    [access.canEditProjects, notify]
  );

  const openProjectDetails = useCallback(
    (project: WorkItem) => {
      if (sample) {
        trackOnboardingEvent("sample_project_opened", {
          variant: "v2",
          entrySource: "sample_dashboard",
        });
      }
      router.push(projectHref({ projectId: project.id, sample }));
    },
    [router, sample]
  );

  const canDeleteProject = useCallback(
    (project: WorkItem | null) =>
      projectCanBeDeleted({
        project,
        currentUserId: access.teamData?.currentMember.userId,
        canEdit: access.canEditProjects,
        canManageTeam: access.canManageTeamProjects,
      }),
    [
      access.canEditProjects,
      access.canManageTeamProjects,
      access.teamData?.currentMember.userId,
    ]
  );

  const requestDeleteProject = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (target && !canDeleteProject(target)) {
        notify(
          "Only the project owner or a team owner can delete this team project.",
          "warning"
        );
        return;
      }
      if (target) setDeleteTarget(target);
    },
    [canDeleteProject, items, notify]
  );

  const { archiveProject, updateProjectStatus } = useProjectController({
    projects: projectPort,
    canEditTeamProjects: access.canEditProjects,
    canUpdateTeamStatus: access.canUpdateProjectStatus,
    salaryWorkType: settings.salaryWorkType,
    currencyCode: settings.currencyCode,
    workflow,
    confirmDelivery: (message) => window.confirm(message),
    notify,
    onStatusChanged: (project, previousStatus) => {
      const status = project.status;
      if (isDoneStatus(status) && !isDoneStatus(previousStatus)) {
        trackOptionalEvent("project_delivered", {
          mode: isSignedIn ? "account" : "local",
        });
      }
      recordProjectActivity(
        {
          projectId: project.id,
          kind: "status_changed",
          message: `${project.title} status changed from ${previousStatus} to ${status}.`,
        },
        {
          kind: isDoneStatus(status) ? "delivered" : "status",
          message: isDoneStatus(status)
            ? `${project.title} was delivered`
            : `${project.title} moved to ${status}`,
          projectId: project.id,
        }
      );
    },
  });

  const createProject = useProjectCreationController({
    clients: clientRecords,
    projectGroups: groups,
    workflowTemplates,
    salaryPlans,
    projectTags: settings.projectTags,
    salaryWorkType: settings.salaryWorkType,
    profileId: profile.id,
    baseNotes: defaultProjectNotes(settings),
    scope: projectStartScope,
    teamId: access.currentTeamId,
    ownerUserId: access.teamData?.currentMember.userId,
    projects: projectPort,
    notify,
    onCreated: (project) => {
      recordProjectActivity(
        {
          projectId: project.id,
          kind: "project_created",
          message: `${project.title} was created.`,
          createdAt: project.createdAt,
        },
        {
          kind: "created",
          message: `${project.title} was created`,
          projectId: project.id,
          createdAt: project.createdAt,
        }
      );
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
      setNewProjectOpen(false);
      notify("Project created.");
      router.push(projectHref({ projectId: project.id }));
    },
  });

  const isClientBillableProject = useCallback(
    (project: WorkItem) =>
      !isSalaryWorkType(project.workType, settings) &&
      isDoneStatus(project.status) &&
      safeMoneyValue(project.earnings) > 0,
    [settings]
  );

  const updateProjectPayment = useCallback(
    (project: WorkItem, paid: boolean) => {
      if (project.teamId && !access.canManageFinance) {
        notify("Your team role cannot manage project payments.", "warning");
        return;
      }
      if (!isClientBillableProject(project)) {
        notify(
          "Only delivered billable client projects can be marked paid.",
          "warning"
        );
        return;
      }
      const paidDate = paid ? new Date().toISOString() : "";
      projectPort.update(project.id, (item) => ({ ...item, paid, paidDate }));
      recordProjectActivity({
        projectId: project.id,
        kind: "project_updated",
        message: `${project.title} was marked ${paid ? "paid" : "unpaid"}.`,
      });
      notify(`${project.title} marked ${paid ? "paid" : "unpaid"}.`);
    },
    [
      access.canManageFinance,
      isClientBillableProject,
      notify,
      projectPort,
      recordProjectActivity,
    ]
  );

  const confirmDeleteProject = useCallback(() => {
    if (!deleteTarget) return;
    projectPort.remove(deleteTarget.id);
    removeProjectActivity(deleteTarget.id);
    setDeleteTarget(null);
    notify("Project deleted.", "warning");
  }, [deleteTarget, notify, projectPort, removeProjectActivity]);

  const saveProject = useCallback(() => {
    const canonicalClient = canonicalClientName(
      form.client || "",
      clientOptions
    );
    const clientRecord =
      clientRecords.find(
        (client) => client.name.toLowerCase() === canonicalClient.toLowerCase()
      ) ?? mergeClientRecords([], [canonicalClient])[0];
    const normalizedWorkType = canonicalWorkType(
      form.workType,
      projectTagOptions
    );
    const normalizedForm = {
      ...form,
      client: canonicalClient,
      workType: normalizedWorkType,
      integrationLinks: normalizeProjectIntegrationLinks(form.integrationLinks),
    };
    const typeConfig = getTypeConfig(normalizedForm.workType, settings);
    const error = validateProject(
      normalizedForm,
      typeConfig,
      projectTagOptions
    );
    if (error) {
      setFormError(error);
      return;
    }
    const payload: WorkItem = {
      ...normalizedForm,
      title: normalizedForm.title.trim(),
      id: editingId || createId(),
      teamId: normalizedForm.teamId,
      ownerUserId:
        normalizedForm.ownerUserId ??
        (!editingId && normalizedForm.teamId
          ? access.teamData?.currentMember.userId
          : undefined),
      assigneeUserIds: normalizedForm.assigneeUserIds ?? [],
      createdAt: form.createdAt || new Date().toISOString(),
      profileId: profile.id,
      client: normalizedForm.client?.trim() || "",
      clientId: clientRecord?.id,
      notes: normalizedForm.notes.trim(),
      earnings:
        typeConfig.earningsMode === "batch"
          ? 0
          : safeMoneyValue(normalizedForm.earnings),
      paid:
        typeConfig.earningsMode === "batch"
          ? false
          : Boolean(normalizedForm.paid),
      paidDate:
        typeConfig.earningsMode === "batch" || !normalizedForm.paid
          ? ""
          : normalizedForm.paidDate || new Date().toISOString(),
      checklistCompleted: normalizeChecklistCompleted(
        normalizedForm.checklistItems,
        normalizedForm.checklistCompleted
      ),
      integrationLinks: normalizedForm.integrationLinks,
    };
    if (
      clientRecord &&
      !settings.clients.some((client) => client.id === clientRecord.id)
    ) {
      setSettings((current) => ({
        ...current,
        customClients: [...current.customClients, clientRecord.name],
        clients: [...current.clients, clientRecord],
      }));
    }
    if (editingId) projectPort.replace(payload);
    else projectPort.add(payload);
    if (!editingId) {
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
    }
    recordProjectActivity(
      {
        projectId: payload.id,
        kind: editingId ? "project_updated" : "project_created",
        message: editingId
          ? `${payload.title} was updated.`
          : `${payload.title} was created.`,
        createdAt: editingId ? undefined : payload.createdAt,
      },
      {
        kind: editingId ? "updated" : "created",
        message: editingId
          ? `${payload.title} was updated`
          : `${payload.title} was created`,
        projectId: payload.id,
        ...(editingId ? {} : { createdAt: payload.createdAt }),
      }
    );
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyProjectForm());
    notify(editingId ? "Project updated." : "Project created.");
    if (!editingId) router.push(projectHref({ projectId: payload.id }));
  }, [
    access.teamData?.currentMember.userId,
    clientOptions,
    clientRecords,
    editingId,
    form,
    isSignedIn,
    notify,
    onboardingVariant,
    projectPort,
    projectTagOptions,
    recordProjectActivity,
    router,
    setSettings,
    settings,
  ]);

  const openProjectGroups = useCallback((scope: ProjectActionScope) => {
    setProjectGroupsScope(scope);
    setProjectGroupsOpen(true);
  }, []);

  const actions = useMemo<ProjectActions>(
    () => ({
      openNewProject,
      openBlankProject,
      openTemplateProject,
      openEditProject,
      requestDeleteProject,
      openProjectDetails,
      openProjectGroups,
      archiveProject,
      updateProjectStatus,
      updateProjectPayment,
      canDeleteProject,
    }),
    [
      archiveProject,
      canDeleteProject,
      openBlankProject,
      openEditProject,
      openNewProject,
      openProjectDetails,
      openProjectGroups,
      openTemplateProject,
      requestDeleteProject,
      updateProjectPayment,
      updateProjectStatus,
    ]
  );

  return (
    <ProjectActionsContext.Provider value={actions}>
      {children}
      <NewProjectDialog
        open={newProjectOpen}
        clients={clientRecords}
        projectGroups={groups.filter(
          (group) =>
            group.teamId ===
            (projectStartScope === "team" ? access.currentTeamId : undefined)
        )}
        workflowTemplates={workflowTemplates}
        initialTemplateId={newProjectTemplateId}
        salaryPlanLabel={`${settings.salaryWorkType} Plan`}
        salaryPlans={
          isSignedIn
            ? projectStartScope === "team"
              ? []
              : salaryPlans
            : undefined
        }
        currencyCode={settings.currencyCode}
        settings={settings}
        returnFocusRef={projectLauncherTriggerRef}
        onCreateClient={(client) =>
          addClient({
            ...client,
            contactName: "",
            phone: "",
            notes: "",
          })
        }
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProject}
      />
      <ProjectGroupsDialog
        open={projectGroupsOpen}
        teamId={
          projectGroupsScope === "team" ? access.currentTeamId : undefined
        }
        clients={clientRecords}
        groups={groups}
        projects={
          projectGroupsScope === "team"
            ? access.teamProjects
            : access.personalProjects
        }
        currency={settings.currencyCode}
        onClose={() => setProjectGroupsOpen(false)}
        onSave={saveGroup}
        onArchive={setGroupArchived}
      />
      <ProjectDialog
        open={dialogOpen}
        editing={Boolean(editingId)}
        returnFocusRef={projectLauncherTriggerRef}
        form={form}
        onFormChange={(next) => {
          setForm(next);
          if (formError) setFormError("");
        }}
        clientOptions={clientOptions}
        workTypeOptions={projectTagOptions}
        settings={settings}
        teamMembers={access.activeTeamMembers}
        formError={formError}
        onClose={() => setDialogOpen(false)}
        onSave={saveProject}
      />
      <DeleteProjectDialog
        project={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProject}
      />
    </ProjectActionsContext.Provider>
  );
}

export function useProjectActions(): ProjectActions {
  const value = useContext(ProjectActionsContext);
  if (!value) {
    throw new Error(
      "useProjectActions must be used within a ProjectActionsProvider"
    );
  }
  return value;
}

const ProjectActionsContext = createContext<ProjectActions | null>(null);

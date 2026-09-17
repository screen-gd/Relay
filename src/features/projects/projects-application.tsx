"use client";

import { FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";

import { PrecisionProjects } from "@/components/precision-projects";
import { PageEmptyState } from "@/components/workspace-page";
import { useData, useProjectGroups } from "@/lib/data-context";
import { useProjectAccess } from "./project-access";
import { useProjectActions } from "./project-actions-provider";
import { useProjectActivity } from "./project-activity";
import { ProjectWorkspace } from "./project-workspace";
import { projectHref } from "./project-view";
import { useProjectsApplicationState } from "./use-projects-application-state";

export function ProjectsApplication({
  projectId,
  projectView,
  sample = false,
}: {
  projectId?: string;
  projectView?: string;
  sample?: boolean;
}) {
  const router = useRouter();
  const { settings, isAuthLoaded } = useData();
  const { groups } = useProjectGroups();
  const access = useProjectAccess();
  const actions = useProjectActions();
  const { localActivity } = useProjectActivity();
  const { activeProjectView, setActiveProjectView, detailProjectId } =
    useProjectsApplicationState({ projectId, projectView });
  const isSample = sample || access.sample;

  if (projectId) {
    const detailProject =
      access.items.find((project) => project.id === detailProjectId) ?? null;

    if (!detailProject) {
      return (
        <PageEmptyState
          icon={<FolderKanban />}
          title="Project not found"
          description="This Project does not exist or you cannot access it."
        />
      );
    }

    return (
      <ProjectWorkspace
        project={detailProject}
        projectGroup={groups.find(
          (group) => group.id === detailProject.projectGroupId
        )}
        settings={settings}
        view={activeProjectView}
        canEdit={!isSample && (access.canEditProjects || !detailProject.teamId)}
        canManagePayment={
          !isSample && (access.canManageFinance || !detailProject.teamId)
        }
        canManagePortal={
          !isSample && (access.canManagePortals || !detailProject.teamId)
        }
        clientHubEnabled={access.clientHubCapabilityEnabled}
        customPortalBrandingEnabled={
          access.customPortalBrandingCapabilityEnabled
        }
        canDelete={actions.canDeleteProject(detailProject)}
        canUpdateStatus={
          !isSample &&
          (access.canUpdateProjectStatus ||
            access.canEditProjects ||
            !detailProject.teamId)
        }
        canComment={!isSample && access.canCommentProjects}
        teamMembers={access.activeTeamMembers}
        localActivity={localActivity.filter(
          (event) => event.projectId === detailProject.id
        )}
        onBack={() => router.push(isSample ? "/sample-studio" : "/projects")}
        onViewChange={(view) => {
          setActiveProjectView(view);
          window.localStorage.setItem(
            "relay:last-project-workspace-view",
            view
          );
          router.replace(
            projectHref({
              projectId: detailProject.id,
              view,
              sample: isSample,
            })
          );
        }}
        onEdit={actions.openEditProject}
        onDelete={(project) => actions.requestDeleteProject(project.id)}
        onStatusChange={actions.updateProjectStatus}
        onPaymentChange={actions.updateProjectPayment}
      />
    );
  }

  return (
    <PrecisionProjects
      settings={settings}
      personalProjects={access.personalProjects}
      teamProjects={access.teamProjects}
      teamName={access.teamWorkspace?.name}
      currentUserId={access.teamData?.currentMember.userId ?? ""}
      currentUserRole={access.teamData?.currentMember.role}
      teamMembers={access.activeTeamMembers.map((member) => ({
        userId: member.userId,
        name: member.name,
      }))}
      allowAllTeamProjects={access.teamWorkspace?.allowAllTeamProjects ?? false}
      loading={!isAuthLoaded}
      error={
        access.teamSyncUnavailable
          ? "Team Projects are unavailable until cloud authentication reconnects."
          : undefined
      }
      onNewProject={actions.openNewProject}
      onViewProject={actions.openProjectDetails}
      onEditProject={actions.openEditProject}
      onDeleteProject={actions.requestDeleteProject}
      onArchiveProject={actions.archiveProject}
      onUpdateProjectStatus={actions.updateProjectStatus}
      canCreateProjects={access.canCreateProjects}
      canCreateTeamProjects={access.canCreateTeamProjects}
      canEditProjects={access.canEditProjects}
      canUpdateProjectStatus={
        access.canUpdateProjectStatus || access.canEditProjects
      }
      canDeleteProject={actions.canDeleteProject}
      onManageProjectGroups={actions.openProjectGroups}
    />
  );
}

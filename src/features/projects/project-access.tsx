"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { api } from "../../../convex/_generated/api";
import { useData } from "@/lib/data-context";
import { DEFAULT_PROFILE_ID } from "@/lib/profiles";
import type { WorkItem } from "@/lib/types";
import { resolveProjectPermissions } from "./project-permissions";

type ProjectTeamData = FunctionReturnType<typeof api.team.getMyWorkspace>;
type ProjectTeamWorkspace = NonNullable<ProjectTeamData>["workspace"];
type ProjectTeamMember = NonNullable<ProjectTeamData>["members"][number];
type ProjectSubscription = FunctionReturnType<
  typeof api.workspaceSubscriptions.getCurrent
>;

export type ProjectAccess = {
  sample: boolean;
  items: WorkItem[];
  projects: WorkItem[];
  personalProjects: WorkItem[];
  teamProjects: WorkItem[];
  teamData: ProjectTeamData | undefined;
  activeTeamMembers: ProjectTeamMember[];
  teamDataLoading: boolean;
  teamSyncUnavailable: boolean;
  currentTeamId?: ProjectTeamWorkspace["_id"];
  teamWorkspace?: ProjectTeamWorkspace;
  workspaceSubscription: ProjectSubscription | undefined;
  canCreateProjects: boolean;
  canCreateTeamProjects: boolean;
  canEditProjects: boolean;
  canUpdateProjectStatus: boolean;
  canCommentProjects: boolean;
  canManagePortals: boolean;
  canManageFinance: boolean;
  canManageTeamProjects: boolean;
  customWorkflowTemplatesLocked: boolean;
  clientHubCapabilityEnabled: boolean;
  customPortalBrandingCapabilityEnabled: boolean;
};

type ProjectAccessProviderProps = {
  children: ReactNode;
  sample?: boolean;
};

export function ProjectAccessProvider({
  children,
  sample = false,
}: ProjectAccessProviderProps) {
  const value = useProjectAccessValue(sample);
  return (
    <ProjectAccessContext.Provider value={value}>
      {children}
    </ProjectAccessContext.Provider>
  );
}

export function useProjectAccess(): ProjectAccess {
  const value = useProjectAccessContext();
  return value;
}

function useProjectAccessValue(sample: boolean): ProjectAccess {
  const { items, isAuthEnabled, isSignedIn, isAuthLoaded } = useData();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const shouldLoadTeamPermissions = Boolean(
    isSignedIn && isConvexAuthenticated
  );
  const teamData = useQuery(
    api.team.getMyWorkspace,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const workspaceSubscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    shouldLoadTeamPermissions ? {} : "skip"
  );

  const projects = useMemo(
    () =>
      items.filter(
        (item) => (item.profileId || DEFAULT_PROFILE_ID) === DEFAULT_PROFILE_ID
      ),
    [items]
  );
  const personalProjects = useMemo(
    () => projects.filter((item) => !item.teamId),
    [projects]
  );
  const currentTeamId = teamData?.workspace?._id;
  const teamProjects = useMemo(
    () =>
      currentTeamId
        ? projects.filter((project) => project.teamId === currentTeamId)
        : [],
    [currentTeamId, projects]
  );
  const activeTeamMembers = useMemo(
    () =>
      teamData?.members.filter((member) => member.status === "active") ?? [],
    [teamData]
  );
  const teamDataLoading = Boolean(
    isSignedIn &&
    (isConvexAuthLoading || (isConvexAuthenticated && teamData === undefined))
  );
  const teamSyncUnavailable = Boolean(
    isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );
  const permissions = resolveProjectPermissions({
    sample,
    teamConnected: Boolean(teamData),
    loading: teamDataLoading,
    unavailable: teamSyncUnavailable,
    role: teamData?.currentMember.role,
    permissions: teamData?.currentMember.permissions,
  });
  const customWorkflowTemplatesLocked = Boolean(
    isSignedIn &&
    isConvexAuthenticated &&
    workspaceSubscription &&
    !workspaceSubscription.capabilities.customWorkflowTemplates
  );
  const clientHubCapabilityEnabled = Boolean(
    !isAuthEnabled ||
    !isSignedIn ||
    workspaceSubscription?.capabilities.clientHub
  );
  const customPortalBrandingCapabilityEnabled = Boolean(
    !isAuthEnabled ||
    !isSignedIn ||
    workspaceSubscription?.capabilities.customPortalBranding
  );

  return {
    sample,
    items,
    projects,
    personalProjects,
    teamProjects,
    teamData,
    activeTeamMembers,
    teamDataLoading,
    teamSyncUnavailable,
    currentTeamId,
    teamWorkspace: teamData?.workspace,
    workspaceSubscription,
    ...permissions,
    customWorkflowTemplatesLocked,
    clientHubCapabilityEnabled,
    customPortalBrandingCapabilityEnabled,
  };
}

const ProjectAccessContext = createContext<ProjectAccess | null>(null);

function useProjectAccessContext(): ProjectAccess {
  const value = useContext(ProjectAccessContext);
  if (!value) {
    throw new Error(
      "useProjectAccess must be used within a ProjectAccessProvider"
    );
  }
  return value;
}

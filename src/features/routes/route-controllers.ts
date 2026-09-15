"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { WorkItem } from "@/lib/types";
import { api } from "../../../convex/_generated/api";

const teamApi = {
  updateWorkspaceSettings: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      name: string;
      currencyCode: string;
      timeZone: string;
      defaultWorkflowTemplateId?: string;
      allowAllTeamProjects: boolean;
    },
    null
  >("team:updateWorkspaceSettings"),
  updateMemberPermissions: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      memberId: string;
      permissions: Record<string, boolean>;
    },
    null
  >("team:updateMemberPermissions"),
  transferOwnership: makeFunctionReference<
    "mutation",
    { teamId: string; memberId: string },
    null
  >("team:transferOwnership"),
};

export function useAccountController() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();
  return { isAuthEnabled, isSignedIn, isLoaded, openSignIn, openSignUp };
}

export function useTemplateController() {
  const { items, settings, setSettings } = useData();
  return { items, settings, setSettings };
}

export function useTeamController({
  projects,
  selectedProjectId,
}: {
  projects: WorkItem[];
  selectedProjectId: string;
}) {
  const { isSignedIn, isLoaded: isUserLoaded, openSignIn, openSignUp } =
    useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const createWorkspace = useMutation(api.team.createWorkspace);
  const joinWorkspace = useMutation(api.team.joinWorkspace);
  const inviteMember = useMutation(api.team.inviteMember);
  const updateMemberRole = useMutation(api.team.updateMemberRole);
  const updateMemberPermissions = useMutation(teamApi.updateMemberPermissions);
  const transferOwnership = useMutation(teamApi.transferOwnership);
  const normalizeLegacyRoles = useMutation(api.team.normalizeLegacyRoles);
  const removeMember = useMutation(api.team.removeMember);
  const leaveWorkspace = useMutation(api.team.leaveWorkspace);
  const addProjectComment = useMutation(api.team.addProjectComment);
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(
    api.team.markAllNotificationsRead
  );
  const teamId = teamData?.workspace?._id;
  const teamProjects = projects.filter((project) => project.teamId === teamId);
  const selectedProject =
    teamProjects.find((project) => project.id === selectedProjectId) ??
    teamProjects[0] ??
    null;
  const projectComments = useQuery(
    api.team.listProjectComments,
    isConvexAuthenticated && teamId && selectedProject
      ? { teamId, projectId: selectedProject.id }
      : "skip"
  );

  return {
    isSignedIn,
    isUserLoaded,
    openSignIn,
    openSignUp,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    createWorkspace,
    joinWorkspace,
    inviteMember,
    updateMemberRole,
    updateMemberPermissions,
    transferOwnership,
    normalizeLegacyRoles,
    removeMember,
    leaveWorkspace,
    addProjectComment,
    markNotificationRead,
    markAllNotificationsRead,
    teamId,
    teamProjects,
    selectedProject,
    projectComments,
  };
}

export function useTeamChatController() {
  const { isSignedIn, isLoaded: isUserLoaded, openSignIn } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const sendChatMessage = useMutation(api.team.sendChatMessage);
  return {
    isSignedIn,
    isUserLoaded,
    openSignIn,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    sendChatMessage,
  };
}

export function useSettingsController() {
  const {
    exportBackup,
    importBackup,
    settingsSaveState,
    retrySettingsSave,
  } = useData();
  const updateWorkspaceSettings = useMutation(teamApi.updateWorkspaceSettings);
  return {
    exportBackup,
    importBackup,
    settingsSaveState,
    retrySettingsSave,
    updateWorkspaceSettings,
  };
}

export function useProfileController() {
  const { isSignedIn } = useData();
  const publishPublicProfile = useMutation(api.publicProfiles.publish);
  return { isSignedIn, publishPublicProfile };
}

export function useNotificationController() {
  const { isSignedIn, isLoaded: isUserLoaded } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(
    api.team.markAllNotificationsRead
  );
  return {
    isSignedIn,
    isUserLoaded,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    markNotificationRead,
    markAllNotificationsRead,
  };
}

export function useSubscriptionController() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const subscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    isSignedIn && isConvexAuthenticated ? {} : "skip"
  );
  return {
    isAuthEnabled,
    isSignedIn,
    isLoaded,
    openSignIn,
    openSignUp,
    isConvexAuthenticated,
    isConvexAuthLoading,
    subscription,
  };
}

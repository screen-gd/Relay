"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { WorkItem } from "@/lib/types";
import { api } from "../../../convex/_generated/api";

export function useTeamController({
  projects,
  selectedProjectId,
}: {
  projects: WorkItem[];
  selectedProjectId: string;
}) {
  const {
    isSignedIn,
    isLoaded: isUserLoaded,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
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
  const updateMemberPermissionsMutation = useMutation(
    api.team.updateMemberPermissions
  );
  const transferOwnershipMutation = useMutation(api.team.transferOwnership);
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
    updateMemberPermissions: updateMemberPermissionsMutation,
    transferOwnership: transferOwnershipMutation,
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

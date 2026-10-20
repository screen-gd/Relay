"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useOptionalAuth } from "@/lib/optional-auth";
import { api } from "../../../convex/_generated/api";

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

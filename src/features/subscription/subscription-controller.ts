"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import { api } from "../../../convex/_generated/api";

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

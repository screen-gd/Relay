"use client";

import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";

export function useAccountController() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();
  return { isAuthEnabled, isSignedIn, isLoaded, openSignIn, openSignUp };
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

type UserState = ReturnType<typeof useUser>;
type ClerkState = ReturnType<typeof useClerk>;
type AuthAction = () => void;

type OptionalAuthValue = {
  isLoaded: UserState["isLoaded"];
  isSignedIn: UserState["isSignedIn"];
  user: UserState["user"];
  openSignIn: AuthAction;
  openSignUp: AuthAction;
  signOut: ClerkState["signOut"];
};

const localOpenSignIn: AuthAction = () => undefined;
const localOpenSignUp: AuthAction = () => undefined;
const localSignOut: ClerkState["signOut"] = async () => undefined;

const localAuth: OptionalAuthValue = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
  openSignIn: localOpenSignIn,
  openSignUp: localOpenSignUp,
  signOut: localSignOut
};

const OptionalAuthContext = createContext<OptionalAuthValue>(localAuth);

export function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const {
    openSignIn: clerkOpenSignIn,
    openSignUp: clerkOpenSignUp,
    signOut,
  } = useClerk();
  const [pendingAuthAction, setPendingAuthAction] = useState<"sign-in" | "sign-up" | null>(null);

  const openSignIn = useCallback<AuthAction>(() => {
    if (!isLoaded) {
      setPendingAuthAction("sign-in");
      return;
    }
    void clerkOpenSignIn();
  }, [clerkOpenSignIn, isLoaded]);

  const openSignUp = useCallback<AuthAction>(() => {
    if (!isLoaded) {
      setPendingAuthAction("sign-up");
      return;
    }
    void clerkOpenSignUp();
  }, [clerkOpenSignUp, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !pendingAuthAction) return;
    setPendingAuthAction(null);
    void (pendingAuthAction === "sign-in" ? clerkOpenSignIn() : clerkOpenSignUp());
  }, [clerkOpenSignIn, clerkOpenSignUp, isLoaded, pendingAuthAction]);

  const value = useMemo<OptionalAuthValue>(() => ({
    isLoaded,
    isSignedIn,
    user,
    openSignIn,
    openSignUp,
    signOut
  }), [isLoaded, isSignedIn, openSignIn, openSignUp, signOut, user]);

  return <OptionalAuthContext.Provider value={value}>{children}</OptionalAuthContext.Provider>;
}

export function useOptionalAuth() {
  return useContext(OptionalAuthContext);
}

"use client";

import { createContext, useContext } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

type AppAuthValue = {
  isSignedIn: boolean | undefined;
  isLoaded: boolean;
  user: ReturnType<typeof useUser>["user"];
  openSignIn: () => void;
  openSignUp: () => void;
  signOut: () => Promise<void>;
};

const guestAuth: AppAuthValue = {
  isSignedIn: false,
  isLoaded: true,
  user: null,
  openSignIn: () => undefined,
  openSignUp: () => undefined,
  signOut: async () => undefined,
};

const AppAuthContext = createContext<AppAuthValue>(guestAuth);

export function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { openSignIn, openSignUp, signOut } = useClerk();
  return (
    <AppAuthContext.Provider value={{
      isSignedIn,
      isLoaded,
      user,
      openSignIn: () => openSignIn(),
      openSignUp: () => openSignUp(),
      signOut: () => signOut(),
    }}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AppAuthContext);
}

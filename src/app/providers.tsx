"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { theme } from "./theme";
import { DataProvider } from "@/lib/data-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ClerkAuthBridge } from "@/lib/auth-context";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const localConvex = new ConvexReactClient("http://127.0.0.1:3210");

function useLocalConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

const clerkAppearance = {
  elements: {
    modalBackdrop: {
      alignItems: "center",
      display: "flex",
      justifyContent: "center",
      padding: "24px",
    },
    modalContent: {
      margin: "auto",
      maxHeight: "calc(100vh - 48px)",
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const app = (
    <DataProvider mode={convex && clerkPublishableKey ? "cloud" : "local"}>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <TooltipProvider delayDuration={250}>
            {children}
            <Toaster
              className="cutlab-sonner"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--app-panel)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-ink)",
                },
              }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </DataProvider>
  );

  if (!convex || !clerkPublishableKey) {
    return (
      <ConvexProviderWithAuth client={convex ?? localConvex} useAuth={useLocalConvexAuth}>
        {app}
      </ConvexProviderWithAuth>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} appearance={clerkAppearance}>
      <ClerkAuthBridge>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {app}
        </ConvexProviderWithClerk>
      </ClerkAuthBridge>
    </ClerkProvider>
  );
}

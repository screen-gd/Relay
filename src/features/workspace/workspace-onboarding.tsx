"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import {
  resolveOnboardingVariant,
  trackOnboardingEvent,
  type OnboardingVariant,
} from "@/lib/onboarding";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackOptionalEvent,
} from "@/lib/telemetry";
import { AnalyticsConsentDialog } from "@/features/onboarding/analytics-consent-dialog";
import { WelcomeChoiceDialog } from "@/features/onboarding/welcome-choice-dialog";

const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";

export function WorkspaceOnboarding({ sample }: { sample: boolean }) {
  const { isAuthEnabled, isSignedIn, isAuthLoaded, setToast } = useData();
  const {
    isLoaded: clerkAuthLoaded,
    isSignedIn: clerkIsSignedIn,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false);
  const [analyticsConsentOpen, setAnalyticsConsentOpen] = useState(false);
  const [variant, setVariant] = useState<OnboardingVariant>("v2");
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (sample) {
      trackOnboardingEvent("sample_studio_opened", {
        variant: "v2",
        entrySource: "first_run_dialog",
      });
      return;
    }
    setVariant(resolveOnboardingVariant());
  }, [sample]);

  useEffect(() => {
    if (sample) return;
    if (clerkIsSignedIn || isSignedIn) {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "account");
      setAuthChoiceOpen(false);
      return;
    }
    if (!clerkAuthLoaded || !isAuthLoaded) {
      setAuthChoiceOpen(false);
      return;
    }
    setAuthChoiceOpen(!window.localStorage.getItem(AUTH_MODE_STORAGE_KEY));
  }, [clerkAuthLoaded, clerkIsSignedIn, isAuthLoaded, isSignedIn, sample]);

  useEffect(() => {
    if (!authChoiceOpen) return;
    trackOnboardingEvent("onboarding_dialog_viewed", {
      variant,
      entrySource: "workspace_root",
    });
  }, [authChoiceOpen, variant]);

  useEffect(() => {
    trackOptionalEvent("weekly_return", {
      mode: isSignedIn ? "account" : "local",
    });
  }, [isSignedIn]);

  function chooseLocalMode() {
    window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "local");
    setAuthChoiceOpen(false);
    if (getAnalyticsConsent() === "unknown") setAnalyticsConsentOpen(true);
    trackOnboardingEvent("workspace_mode_selected", {
      variant,
      mode: "local",
      elapsedMs: Date.now() - startedAt.current,
    });
    setToast({ message: "Using local mode on this device.", tone: "info" });
  }

  function launchAccountFlow(mode: "sign-up" | "sign-in") {
    setAuthChoiceOpen(false);
    if (!isAuthEnabled) {
      setToast({
        message:
          "Sign-in is unavailable until Clerk and Convex are configured.",
        tone: "warning",
      });
      return;
    }
    trackOnboardingEvent("workspace_mode_selected", {
      variant,
      mode: "account",
      elapsedMs: Date.now() - startedAt.current,
    });
    if (mode === "sign-up") openSignUp();
    else openSignIn();
  }

  return (
    <>
      <WelcomeChoiceDialog
        open={authChoiceOpen && !clerkIsSignedIn && !isSignedIn}
        variant={variant}
        onChooseLocal={chooseLocalMode}
        onCreateAccount={() => launchAccountFlow("sign-up")}
        onSignIn={() => launchAccountFlow("sign-in")}
      />
      <AnalyticsConsentDialog
        open={analyticsConsentOpen}
        onChoose={(consent) => {
          setAnalyticsConsent(consent);
          setAnalyticsConsentOpen(false);
        }}
      />
    </>
  );
}

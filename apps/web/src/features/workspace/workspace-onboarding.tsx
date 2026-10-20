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
import {
  OnboardingStepperDialog,
  type OnboardingResult,
} from "@/features/onboarding/onboarding-stepper-dialog";

const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";
const DEVELOPMENT_DISCLAIMER_STORAGE_KEY = "relay:development-disclaimer:v1";

/** What the first-run dialog needs to show, read once from storage on mount. */
type OnboardingSnapshot = {
  showWelcome: boolean;
  askAnalytics: boolean;
};

/**
 * Mounted by the workspace runtime. Decides whether first-run setup is needed
 * and applies the result: workspace mode, profile defaults, analytics consent.
 */
export function WorkspaceOnboarding({ sample }: { sample: boolean }) {
  const {
    isAuthEnabled,
    isSignedIn,
    isAuthLoaded,
    settings,
    setSettings,
    setToast,
  } = useData();
  const {
    isLoaded: clerkAuthLoaded,
    isSignedIn: clerkIsSignedIn,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
  const [needsModeChoice, setNeedsModeChoice] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [variant, setVariant] = useState<OnboardingVariant>("v2");
  const startedAt = useRef(Date.now());
  const signedIn = clerkIsSignedIn || isSignedIn;
  // Wait for auth so the step list is final before the dialog opens.
  const authResolved = signedIn || (clerkAuthLoaded && isAuthLoaded);

  useEffect(() => {
    if (sample) return;
    setSnapshot({
      showWelcome:
        window.localStorage.getItem(DEVELOPMENT_DISCLAIMER_STORAGE_KEY) !==
        "acknowledged",
      askAnalytics: getAnalyticsConsent() === "unknown",
    });
  }, [sample]);

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
    if (signedIn) {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "account");
      setNeedsModeChoice(false);
      return;
    }
    if (!clerkAuthLoaded || !isAuthLoaded) {
      setNeedsModeChoice(false);
      return;
    }
    setNeedsModeChoice(!window.localStorage.getItem(AUTH_MODE_STORAGE_KEY));
  }, [clerkAuthLoaded, isAuthLoaded, sample, signedIn]);

  useEffect(() => {
    if (!needsModeChoice || dismissed) return;
    trackOnboardingEvent("onboarding_dialog_viewed", {
      variant,
      entrySource: "workspace_root",
    });
  }, [dismissed, needsModeChoice, variant]);

  useEffect(() => {
    trackOptionalEvent("weekly_return", {
      mode: isSignedIn ? "account" : "local",
    });
  }, [isSignedIn]);

  function acknowledgeWelcome() {
    window.localStorage.setItem(
      DEVELOPMENT_DISCLAIMER_STORAGE_KEY,
      "acknowledged"
    );
  }

  function completeLocalSetup({ profile, analytics }: OnboardingResult) {
    setDismissed(true);
    // A note-only flow (already signed in or mode already chosen) ends here.
    if (!needsModeChoice || signedIn) return;
    window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "local");
    setSettings((current) => ({
      ...current,
      profileName: profile.profileName.trim() || current.profileName,
      studioName: profile.studioName.trim() || current.studioName,
      profileTitle: profile.profileTitle.trim() || current.profileTitle,
      currencyCode: profile.currencyCode,
    }));
    if (analytics) setAnalyticsConsent(analytics);
    trackOnboardingEvent("workspace_mode_selected", {
      variant,
      mode: "local",
      elapsedMs: Date.now() - startedAt.current,
    });
    setToast({ message: "Using local mode on this device.", tone: "info" });
  }

  function launchAccountFlow(mode: "sign-up" | "sign-in") {
    setDismissed(true);
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

  const showSetup = needsModeChoice && !signedIn;
  const open =
    !sample &&
    snapshot !== null &&
    authResolved &&
    !dismissed &&
    (snapshot.showWelcome || showSetup);

  return (
    <OnboardingStepperDialog
      open={open}
      showWelcome={snapshot?.showWelcome ?? false}
      showSetup={showSetup}
      askAnalytics={snapshot?.askAnalytics ?? false}
      initialProfile={{
        profileName: settings.profileName,
        studioName: settings.studioName,
        profileTitle: settings.profileTitle,
        currencyCode: settings.currencyCode,
      }}
      onWelcomeSeen={acknowledgeWelcome}
      onChooseAccount={() => launchAccountFlow("sign-up")}
      onSignIn={() => launchAccountFlow("sign-in")}
      onCompleteLocal={completeLocalSetup}
    />
  );
}

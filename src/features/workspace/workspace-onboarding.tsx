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
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { RelayBrand } from "@/app/relay-brand";
import { AnalyticsConsentDialog } from "@/features/onboarding/analytics-consent-dialog";
import { WelcomeChoiceDialog } from "@/features/onboarding/welcome-choice-dialog";

const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";
const DEVELOPMENT_DISCLAIMER_STORAGE_KEY = "relay:development-disclaimer:v1";

export function WorkspaceOnboarding({ sample }: { sample: boolean }) {
  const { isAuthEnabled, isSignedIn, isAuthLoaded, setToast } = useData();
  const {
    isLoaded: clerkAuthLoaded,
    isSignedIn: clerkIsSignedIn,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
  const [developmentDisclaimerOpen, setDevelopmentDisclaimerOpen] =
    useState(true);
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false);
  const [analyticsConsentOpen, setAnalyticsConsentOpen] = useState(false);
  const [variant, setVariant] = useState<OnboardingVariant>("v2");
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (sample) return;
    if (
      window.localStorage.getItem(DEVELOPMENT_DISCLAIMER_STORAGE_KEY) ===
      "acknowledged"
    ) {
      setDevelopmentDisclaimerOpen(false);
    }
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

  function acknowledgeDevelopmentDisclaimer() {
    window.localStorage.setItem(
      DEVELOPMENT_DISCLAIMER_STORAGE_KEY,
      "acknowledged"
    );
    setDevelopmentDisclaimerOpen(false);
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
      <DevelopmentDisclaimerDialog
        open={!sample && developmentDisclaimerOpen}
        onAcknowledge={acknowledgeDevelopmentDisclaimer}
      />
      <WelcomeChoiceDialog
        open={
          !developmentDisclaimerOpen &&
          authChoiceOpen &&
          !clerkIsSignedIn &&
          !isSignedIn
        }
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

function DevelopmentDisclaimerDialog({
  open,
  onAcknowledge,
}: {
  open: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <OwnedDialog open={open} onOpenChange={() => {}}>
      <OwnedDialogContent
        showCloseButton={false}
        data-testid="development-disclaimer-dialog"
        className="border-[var(--app-border)] bg-[var(--app-panel)] p-5 text-[var(--app-ink)] sm:max-w-md sm:p-6"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <RelayBrand compact />
        <OwnedDialogHeader>
          <OwnedDialogTitle className="text-2xl leading-tight">
            A quick note
          </OwnedDialogTitle>
          <OwnedDialogDescription className="text-left leading-relaxed">
            Relay is currently under active development. If you find a bug or
            glitch, please contact us on X at{" "}
            <a
              className="font-medium text-[var(--app-accent)] underline underline-offset-4"
              href="https://x.com/connect_relay"
              target="_blank"
              rel="noreferrer"
            >
              @connect_relay
            </a>{" "}
            or email us at{" "}
            <a
              className="font-medium text-[var(--app-accent)] underline underline-offset-4"
              href="mailto:connect.relay@protonmail.com"
            >
              connect.relay@protonmail.com
            </a>
            . Thanks for reading.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <OwnedButton type="button" onClick={onAcknowledge} className="w-full">
          Continue to Relay
        </OwnedButton>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

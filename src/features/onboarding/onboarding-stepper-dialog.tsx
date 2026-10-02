"use client";

import { supportEmail } from "@/lib/support-contact";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { RelayBrand } from "@/app/relay-brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Step, Stepper } from "@/components/ui/stepper";
import {
  currencyLabels,
  currencyOptions,
} from "@/features/settings/settings-defaults";
import type { AnalyticsConsent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export type WorkspaceMode = "local" | "account";
export type OnboardingProfile = {
  profileName: string;
  studioName: string;
  profileTitle: string;
  currencyCode: string;
};
export type OnboardingResult = {
  profile: OnboardingProfile;
  analytics: Exclude<AnalyticsConsent, "unknown"> | null;
};

type StepId = "welcome" | "mode" | "profile" | "analytics";

/**
 * First-run setup shown as one stepped dialog:
 * note -> workspace mode -> profile (local) -> analytics (local, if unasked).
 * Choosing an account hands off to Clerk at the mode step. Signed-in users
 * who have not seen the note get the note step only (`showSetup` false).
 *
 * Keep `showWelcome` and `askAnalytics` stable while the dialog is open:
 * they decide which steps exist, and the step index points into that list.
 */
export function OnboardingStepperDialog({
  open,
  showWelcome,
  showSetup,
  askAnalytics,
  initialProfile,
  onWelcomeSeen,
  onChooseAccount,
  onSignIn,
  onCompleteLocal,
}: {
  open: boolean;
  showWelcome: boolean;
  showSetup: boolean;
  askAnalytics: boolean;
  initialProfile: OnboardingProfile;
  onWelcomeSeen: () => void;
  onChooseAccount: () => void;
  onSignIn: () => void;
  /** Called when the last step finishes; without setup it only closes the note. */
  onCompleteLocal: (result: OnboardingResult) => void;
}) {
  const stepIds: StepId[] = [
    ...(showWelcome ? (["welcome"] as const) : []),
    ...(showSetup ? (["mode", "profile"] as const) : []),
    ...(showSetup && askAnalytics ? (["analytics"] as const) : []),
  ];
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<WorkspaceMode>("local");
  const [profile, setProfile] = useState(initialProfile);
  const [analytics, setAnalytics] =
    useState<OnboardingResult["analytics"]>(null);
  const current = stepIds[Math.min(step, stepIds.length) - 1] ?? "welcome";

  function complete() {
    if (current === "welcome") onWelcomeSeen();
    onCompleteLocal({ profile, analytics });
  }

  function changeStep(next: number) {
    if (current === "welcome" && next > step) onWelcomeSeen();
    // An account hands off to Clerk instead of continuing locally.
    if (current === "mode" && next > step && mode === "account") {
      onChooseAccount();
      return;
    }
    setStep(next);
  }

  const titles: Record<StepId, { title: string; description: string }> = {
    welcome: {
      title: "A quick note",
      description: "Relay is in active development.",
    },
    mode: {
      title: "Choose how to use Relay",
      description: "You can switch to an account later.",
    },
    profile: {
      title: "Set up your workspace",
      description: "Shown on your projects and client pages. All optional.",
    },
    analytics: {
      title: "Product analytics",
      description: "Anonymous feature-use events only.",
    },
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        data-testid="onboarding-dialog"
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-[var(--app-ink)] sm:max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {/* One accessible title for the dialog; steps render visible headings. */}
        <DialogTitle className="sr-only">{titles[current].title}</DialogTitle>
        <DialogDescription className="sr-only">
          {titles[current].description}
        </DialogDescription>
        <RelayBrand compact className="mb-6" />
        <Stepper
          step={step}
          onStepChange={changeStep}
          onComplete={complete}
          canContinue={current !== "analytics" || analytics !== null}
          nextLabel={
            current === "welcome"
              ? "Continue to Relay"
              : current === "mode" && mode === "account"
                ? "Create account"
                : "Continue"
          }
          completeLabel={
            current === "welcome" ? "Continue to Relay" : "Start using Relay"
          }
        >
          {stepIds.map((id) => (
            <Step key={id}>
              <header>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">
                  {titles[id].title}
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {titles[id].description}
                </p>
              </header>
              {id === "welcome" ? <WelcomeStep /> : null}
              {id === "mode" ? (
                <ModeStep
                  mode={mode}
                  onModeChange={setMode}
                  onSignIn={onSignIn}
                />
              ) : null}
              {id === "profile" ? (
                <ProfileStep profile={profile} onChange={setProfile} />
              ) : null}
              {id === "analytics" ? (
                <AnalyticsStep value={analytics} onChange={setAnalytics} />
              ) : null}
            </Step>
          ))}
        </Stepper>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeStep() {
  return (
    <p className="text-sm leading-relaxed text-[var(--app-ink)]">
      If you find a bug, tell us on X at{" "}
      <a
        className="font-medium underline underline-offset-4"
        href="https://x.com/connect_relay"
        target="_blank"
        rel="noreferrer"
      >
        @connect_relay
      </a>{" "}
      or email{" "}
      <a
        className="font-medium underline underline-offset-4"
        href={`mailto:${supportEmail}`}
      >
        {supportEmail}
      </a>
      .
    </p>
  );
}

function ModeStep({
  mode,
  onModeChange,
  onSignIn,
}: {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onSignIn: () => void;
}) {
  return (
    <>
      <ChoiceGroup label="Workspace mode">
        <Choice
          selected={mode === "local"}
          onSelect={() => onModeChange("local")}
          title="Local mode"
          body="Work on this device. No account needed."
          note="Stored in this browser. Clearing site data can remove your work."
        />
        <Choice
          selected={mode === "account"}
          onSelect={() => onModeChange("account")}
          title="Account"
          body="Sync your workspace and use Team features."
        />
      </ChoiceGroup>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-[var(--app-ink)]"
          onClick={onSignIn}
        >
          Sign in
        </Button>
        <Button
          asChild
          variant="link"
          className="h-auto px-0 text-[var(--app-ink)]"
        >
          <Link href="/sample-studio">Open sample workspace</Link>
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-[var(--app-muted)]">
        Read the{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>
        .
      </p>
    </>
  );
}

function ProfileStep({
  profile,
  onChange,
}: {
  profile: OnboardingProfile;
  onChange: (profile: OnboardingProfile) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FieldLayout label="Your name">
        <Input
          value={profile.profileName}
          autoComplete="name"
          onChange={(event) =>
            onChange({ ...profile, profileName: event.target.value })
          }
        />
      </FieldLayout>
      <FieldLayout label="Workspace name">
        <Input
          value={profile.studioName}
          placeholder="Your studio or channel"
          onChange={(event) =>
            onChange({ ...profile, studioName: event.target.value })
          }
        />
      </FieldLayout>
      <FieldLayout label="Role">
        <Input
          value={profile.profileTitle}
          placeholder="Video editor"
          onChange={(event) =>
            onChange({ ...profile, profileTitle: event.target.value })
          }
        />
      </FieldLayout>
      <FieldLayout label="Currency" controlId="onboarding-currency">
        <Select
          value={profile.currencyCode}
          onValueChange={(currencyCode) =>
            onChange({ ...profile, currencyCode })
          }
        >
          <SelectTrigger id="onboarding-currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {currencyLabels[code] ?? code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldLayout>
    </div>
  );
}

function AnalyticsStep({
  value,
  onChange,
}: {
  value: OnboardingResult["analytics"];
  onChange: (value: Exclude<AnalyticsConsent, "unknown">) => void;
}) {
  return (
    <>
      <p className="text-sm leading-relaxed text-[var(--app-ink)]">
        Relay never sends client names, project names, comments, files, links,
        portal tokens, or money.
      </p>
      <ChoiceGroup label="Product analytics">
        <Choice
          selected={value === "granted"}
          onSelect={() => onChange("granted")}
          title="Allow analytics"
          body="Help improve the private beta."
        />
        <Choice
          selected={value === "denied"}
          onSelect={() => onChange("denied")}
          title="No thanks"
          body="Nothing is shared."
        />
      </ChoiceGroup>
    </>
  );
}

function ChoiceGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2">
      {children}
    </div>
  );
}

/** A selectable row in a `ChoiceGroup`, marked by its border and check. */
function Choice({
  selected,
  onSelect,
  title,
  body,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-[var(--app-ink)]"
          : "border-[var(--app-border)] hover:border-[var(--app-muted)]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
          selected
            ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
            : "border-[var(--app-border)]"
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--app-muted)]">
          {body}
        </span>
        {note ? (
          <span className="mt-1.5 block text-xs text-[var(--app-warning)]">
            {note}
          </span>
        ) : null}
      </span>
    </button>
  );
}

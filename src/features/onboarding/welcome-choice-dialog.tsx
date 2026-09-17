"use client";

import Link from "next/link";
import { RelayBrand } from "@/app/relay-brand";
import type { OnboardingVariant } from "@/lib/onboarding";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";

export function WelcomeChoiceDialog({
  open,
  onChooseLocal,
  onCreateAccount,
  onSignIn,
}: {
  open: boolean;
  variant: OnboardingVariant;
  onChooseLocal: () => void;
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  return (
    <OwnedDialog open={open} onOpenChange={() => {}}>
      <OwnedDialogContent
        showCloseButton={false}
        data-testid="welcome-choice-dialog"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[var(--app-border)] bg-[var(--app-panel)] p-5 text-[var(--app-ink)] sm:max-w-[880px] sm:p-6"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <RelayBrand compact />
        <OwnedDialogHeader>
          <OwnedDialogTitle className="text-2xl leading-tight sm:text-[28px]">
            Choose how to use Relay
          </OwnedDialogTitle>
          <OwnedDialogDescription>
            Keep work on this device, sync an account, or explore a read-only
            sample.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Local Mode
            </p>
            <h3 className="mt-2 text-lg font-semibold">Work on this device</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Fast solo workspace with no account.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-[var(--app-warning)]">
              Stored in this browser. Clearing site data can remove your work.
            </p>
            <OwnedButton
              type="button"
              onClick={onChooseLocal}
              className="mt-4 w-full"
            >
              Use Local Mode
            </OwnedButton>
          </section>

          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Account
            </p>
            <h3 className="mt-2 text-lg font-semibold">Sync your workspace</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Create an account for supported cloud and Team features.
            </p>
            <OwnedButton
              type="button"
              variant="outline"
              onClick={onCreateAccount}
              className="mt-4 w-full"
            >
              Create account
            </OwnedButton>
          </section>

          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sample Workspace
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              Explore a real workflow
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Open realistic read-only projects, reviews, activity, and delivery
              data.
            </p>
            <OwnedButton asChild variant="outline" className="mt-4 w-full">
              <Link href="/sample-studio">Open Sample Workspace</Link>
            </OwnedButton>
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm text-muted-foreground">
          <p>Already have an account?</p>
          <OwnedButton type="button" variant="ghost" onClick={onSignIn}>
            Sign in
          </OwnedButton>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Account sync covers supported workspace records. Integrations store
          links and settings only. Read the{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

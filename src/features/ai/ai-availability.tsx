"use client";

import { LockKeyhole } from "@/components/icons";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useOptionalAuth } from "@/lib/optional-auth";
import { cn } from "@/lib/utils";

/**
 * What unlocks an AI action: `signIn` for local mode and a signed-out visit,
 * `settings` for a signed-in Workspace that has AI switched off.
 */
export type AiAccess = "signIn" | "settings";

/** Reports whether this visit has a Workspace that can run AI at all. */
export function useAiAccount() {
  const { isSignedIn, openSignIn } = useOptionalAuth();
  return { hasAccount: Boolean(isSignedIn), signIn: openSignIn };
}

/** Marks a surface as AI, so the feature is visible before it is unlocked. */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-highlight)]",
        className
      )}
    >
      AI
    </span>
  );
}

/**
 * Stands in for an AI action the Workspace cannot run yet. It names the action,
 * says what unlocks it, and offers the one control that gets there, so a local
 * person can see the feature instead of never meeting it.
 */
export function AiLockedNotice({
  feature,
  access = "signIn",
  hint,
  className,
}: {
  feature: string;
  access?: AiAccess;
  hint?: string;
  className?: string;
}) {
  const { signIn } = useAiAccount();
  return (
    <div
      data-slot="ai-locked-notice"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--app-muted)]",
        className
      )}
    >
      <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="font-medium text-[var(--app-ink)]">{feature}</span>
      {hint ? <span>{hint}</span> : null}
      {access === "signIn" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => signIn()}
        >
          Sign in to use AI
        </Button>
      ) : (
        <Link
          to="/settings"
          className="font-semibold text-[var(--app-highlight)] hover:underline"
        >
          Turn on AI in Settings
        </Link>
      )}
    </div>
  );
}

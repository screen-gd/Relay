"use client";

import { ArrowLeft, FlaskConical } from "lucide-react";
import Link from "next/link";
import { trackOnboardingEvent } from "@/lib/onboarding";

export function SampleModeBar() {
  return (
    <aside className="sticky top-14 z-20 flex min-h-12 flex-col gap-3 border-b border-[var(--app-strong-border)] bg-[var(--app-active)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Sample studio mode">
      <p className="flex items-center gap-2 font-semibold"><FlaskConical className="size-4 text-[var(--app-highlight)]" />Sample studio <span className="font-normal text-[var(--app-muted)]">Read-only production data</span></p>
      <div className="flex items-center gap-4">
        <Link className="font-semibold text-[var(--app-highlight)] hover:underline" href="/?onboarding=v2" onClick={() => trackOnboardingEvent("sample_studio_exited", { variant: "v2", entrySource: "start_workspace" })}>Start my workspace</Link>
        <Link className="flex items-center gap-1.5 text-[var(--app-muted)] hover:text-[var(--app-ink)]" href="/?onboarding=v2" onClick={() => trackOnboardingEvent("sample_studio_exited", { variant: "v2", entrySource: "exit_sample" })}><ArrowLeft className="size-4" />Exit sample</Link>
      </div>
    </aside>
  );
}

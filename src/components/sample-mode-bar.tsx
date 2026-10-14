import { ArrowLeft, FlaskConical } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { trackOnboardingEvent } from "@/lib/onboarding";

const barClassName =
  "flex min-h-12 shrink-0 flex-col gap-3 border-b border-[var(--app-strong-border)] bg-[var(--app-active)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between";

export function SampleModeBar() {
  return (
    <aside className={barClassName} aria-label="Sample studio mode">
      <p className="flex items-center gap-2 font-semibold">
        <FlaskConical className="size-4 text-[var(--app-highlight)]" />
        Sample studio{" "}
        <span className="font-normal text-[var(--app-muted)]">
          Read-only production data
        </span>
      </p>
      <div className="flex items-center gap-4">
        <Link
          className="font-semibold text-[var(--app-highlight)] hover:underline"
          to="/"
          search={{ onboarding: "v2" }}
          onClick={() =>
            trackOnboardingEvent("sample_studio_exited", {
              variant: "v2",
              entrySource: "start_workspace",
            })
          }
        >
          Start my workspace
        </Link>
        <Link
          className="flex items-center gap-1.5 text-[var(--app-muted)] hover:text-[var(--app-ink)]"
          to="/"
          search={{ onboarding: "v2" }}
          onClick={() =>
            trackOnboardingEvent("sample_studio_exited", {
              variant: "v2",
              entrySource: "exit_sample",
            })
          }
        >
          <ArrowLeft className="size-4" />
          Exit sample
        </Link>
      </div>
    </aside>
  );
}

/** Shown while the workspace holds sample data loaded from the first run. */
export function WorkspaceSampleBar({ onClear }: { onClear: () => void }) {
  return (
    <aside className={barClassName} aria-label="Sample data">
      <p className="flex items-center gap-2 font-semibold">
        <FlaskConical className="size-4 text-[var(--app-highlight)]" />
        Sample data{" "}
        <span className="font-normal text-[var(--app-muted)]">
          Demo client, projects, and payments
        </span>
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear sample data
      </Button>
    </aside>
  );
}

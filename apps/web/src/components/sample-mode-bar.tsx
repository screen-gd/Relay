import { ArrowLeft, FlaskConical } from "@/components/icons";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { trackOnboardingEvent } from "@/lib/onboarding";

const barClassName =
  "flex min-h-10 shrink-0 flex-col gap-2 bg-well px-4 py-2 shadow-[inset_0_-1px_0_var(--line-row)] type-label sm:flex-row sm:items-center sm:justify-between sm:px-6";

export function SampleModeBar() {
  return (
    <aside className={barClassName} aria-label="Sample studio mode">
      <p className="flex items-center gap-2 font-semibold">
        <FlaskConical className="size-4 text-text-1" />
        Sample studio{" "}
        <span className="font-normal text-text-2">
          Read-only production data
        </span>
      </p>
      <div className="flex items-center gap-4">
        <Link
          className="font-semibold text-text-1 hover:underline"
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
          className="flex items-center gap-1.5 text-text-2 hover:text-text-1"
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
        <FlaskConical className="size-4 text-text-1" />
        Sample data{" "}
        <span className="font-normal text-text-2">
          Demo client and projects
        </span>
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear sample data
      </Button>
    </aside>
  );
}

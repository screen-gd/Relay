import {
  CalendarClock,
  Check,
  FolderPlus,
  Link2,
  LockKeyhole,
  Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";

export function FirstRunChecklist({
  mode,
  onCreateProject,
}: {
  mode: "local" | "account";
  onCreateProject: () => void;
}) {
  const { sampleWorkspace, setToast } = useData();
  const canLoadSample = sampleWorkspace.canLoad;

  async function loadSample() {
    try {
      await sampleWorkspace.load();
      setToast({
        message: "Sample data loaded. Clear it whenever you want.",
        tone: "success",
      });
    } catch {
      setToast({
        message: "The sample data could not be loaded. Try again.",
        tone: "warning",
      });
    }
  }

  const steps = [
    canLoadSample
      ? {
          icon: Sparkles,
          title: "Load the sample workspace",
          body: "One click adds a demo client and three projects with their outputs.",
        }
      : {
          icon: FolderPlus,
          title: "Create your first project",
          body: "Start blank or use a production template. You can adjust every field before saving.",
        },
    {
      icon: CalendarClock,
      title: "Confirm the deadline and stage",
      body: "Give the team one reliable view of what is next and what is at risk.",
    },
    {
      icon: Link2,
      title:
        mode === "account" ? "Share the workflow" : "Share when you are ready",
      body:
        mode === "account"
          ? "Invite collaborators or create a private client review link."
          : "Collaboration is optional. Local projects stay in this browser until you choose account sync.",
    },
  ];

  return (
    <section
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
      aria-labelledby="first-run-title"
    >
      <div>
        <h2 id="first-run-title" className="max-w-2xl type-heading">
          {canLoadSample
            ? "See Relay filled with a sample production"
            : "Turn one active edit into a clear production plan"}
        </h2>
        <p className="mt-3 max-w-2xl text-text-2 type-body">
          {canLoadSample
            ? "Demo work you can clear at any time. Nothing you add yourself is removed with it."
            : "Create a real project first. Relay will reveal the full dashboard once there is useful work to organize."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {canLoadSample ? (
            <Button onClick={loadSample}>Load sample data</Button>
          ) : null}
          <Button
            variant={canLoadSample ? "outline" : "default"}
            onClick={onCreateProject}
          >
            {canLoadSample ? "Create a blank project" : "Create first project"}
          </Button>
        </div>

        <ol className="mt-8 grid overflow-hidden rounded-frame bg-well p-1 lg:grid-cols-3 lg:gap-1">
          {steps.map((step, index) => {
            return (
              <li
                key={step.title}
                className="rounded-soft bg-page p-4 shadow-[0_0_0_1px_var(--line-frame)]"
              >
                <span className="text-text-3 type-label-sm data">
                  Step {index + 1}
                </span>
                <h3 className="mt-1 type-label">{step.title}</h3>
                <p className="mt-1 text-text-2 type-body-sm">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-col gap-3 text-text-3 sm:flex-row sm:items-center sm:justify-between type-body-sm">
          <p className="flex items-center gap-2">
            <LockKeyhole className="size-4" />
            {mode === "local"
              ? "Local mode stores this workspace in this browser."
              : "Account mode syncs supported workspace records."}
          </p>
        </div>
      </div>
      <p className="sr-only">
        <Check /> The checklist completes when your first project is saved.
      </p>
    </section>
  );
}

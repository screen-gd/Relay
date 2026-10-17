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
        tone: "error",
        retry: () => void loadSample(),
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
      className="grid gap-6 rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-4 text-body sm:p-6"
      aria-labelledby="first-run-title"
    >
      <div>
        <h2 id="first-run-title" className="max-w-2xl text-section">
          {canLoadSample
            ? "See Relay filled with a sample production"
            : "Turn one active edit into a clear production plan"}
        </h2>
        <p className="mt-3 max-w-2xl text-meta text-[var(--text-meta)]">
          {canLoadSample
            ? "Demo work you can clear at any time. Nothing you add yourself is removed with it."
            : "Create a real project first. Relay will reveal the full dashboard once there is useful work to organize."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {canLoadSample ? (
            <Button variant="secondary" onClick={loadSample}>
              Load sample data
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onCreateProject}>
            {canLoadSample ? "Create a blank project" : "Create first project"}
          </Button>
        </div>
      </div>
      <ol className="grid gap-6 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center text-[var(--text-primary)]">
                  <Icon className="size-4" />
                </span>
                <span className="font-mono text-meta text-[var(--text-meta)]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-section">{step.title}</h3>
              <p className="mt-2 text-body text-[var(--text-primary)]">
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="text-meta text-[var(--text-meta)]">
        <p className="flex items-center gap-2">
          <LockKeyhole className="size-4" />
          {mode === "local"
            ? "Local mode stores this workspace in this browser."
            : "Account mode syncs supported workspace records."}
        </p>
      </div>
      <p className="sr-only">
        <Check /> The checklist completes when your first project is saved.
      </p>
    </section>
  );
}

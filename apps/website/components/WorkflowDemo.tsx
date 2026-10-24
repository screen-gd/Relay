"use client";

import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FilmStripIcon,
  ImageIcon,
  LockKeyIcon,
} from "@phosphor-icons/react/ssr";
import { Tabs } from "radix-ui";
import { useState, type ReactNode } from "react";
import AppWindow, {
  ProjectTabs,
  StageBar,
  type ProjectTab,
} from "./features/AppWindow";
import DemoDialog from "./features/DemoDialog";
import DemoOutputs from "./features/DemoOutputs";
import ProjectProperties from "./features/ProjectProperties";
import ui from "./features/app-ui.module.css";
import chapter from "./features/chapter.module.css";
import Reveal from "./site/Reveal";
import styles from "./WorkflowDemo.module.css";

type Tone = "info" | "warning" | "success" | undefined;

const stageLabels = ["Planned", "In Progress", "Review", "Delivered"] as const;

const stages = [
  {
    id: "plan",
    label: "Plan",
    title: "Set the brief and deadline.",
    description: "Client, due date, and status in one place.",
    tab: "Overview",
    stage: 0,
    badge: { label: "Planned", tone: undefined },
    payment: "Not billable",
  },
  {
    id: "link",
    label: "Link",
    title: "Keep every version together.",
    description:
      "Link YouTube, Vimeo, Drive, or Dropbox. No Relay storage used.",
    tab: "Outputs",
    stage: 1,
    badge: { label: "In Progress", tone: "info" },
    payment: "Not billable",
  },
  {
    id: "review",
    label: "Review",
    title: "Get feedback on the right moment.",
    description:
      "Password-protected link. Timestamped comments, no client account.",
    tab: "Client review",
    stage: 2,
    badge: { label: "Client Review", tone: "warning" },
    payment: "Not billable",
  },
  {
    id: "deliver",
    label: "Deliver",
    title: "Track the final handoff.",
    description: "The approved version, delivery status, and payment together.",
    tab: "Overview",
    stage: 3,
    badge: { label: "Delivered", tone: "success" },
    payment: "Paid",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  title: string;
  description: string;
  tab: string;
  stage: number;
  badge: { label: string; tone: Tone };
  payment: string;
}[];

type Stage = (typeof stages)[number];
type StageId = Stage["id"];
type Recording = { src: string; captions?: string };

// Add the actual Relay recordings here when supplied. Do not substitute stock footage.
const recordings: Partial<Record<StageId, Recording>> = {};

const comments = [
  {
    author: "Maya Chen",
    initials: "MC",
    time: "00:07",
    text: "Hold this shot a little longer.",
  },
  {
    author: "Jordan Patel",
    initials: "JP",
    time: "00:16",
    text: "Love the pace here.",
  },
  {
    author: "Alex Rivera",
    initials: "AR",
    time: "00:21",
    text: "Brighten the midtones a touch.",
  },
];

/** Card with a title row and optional right-side slot. */
function Panel({
  title,
  aside,
  flush,
  children,
}: {
  title: string;
  aside?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={ui.panel}>
      <div className={ui.panelHead}>
        <h4 className={ui.panelTitle}>{title}</h4>
        {aside}
      </div>
      <div className={ui.panelBody} data-flush={flush || undefined}>
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  title,
  detail,
  children,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <li>
      <span className={ui.tile}>{icon}</span>
      <span className={ui.rowMain}>
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      {children}
    </li>
  );
}

function StageView({
  stage,
  notes,
  onEditNotes,
}: {
  stage: Pick<Stage, "id" | "stage">;
  notes: string;
  onEditNotes: () => void;
}) {
  if (stage.id === "review")
    return (
      <>
        <Panel
          title="Client Portal"
          aside={<span className={ui.badge}>Waiting on client</span>}
          flush
        >
          <ul className={ui.rows}>
            <Row
              icon={<LockKeyIcon size={14} />}
              title="Summer launch v4"
              detail="Password protected · No account needed"
            >
              <a className={ui.button} href="#client-review">
                Open sample review
              </a>
            </Row>
          </ul>
        </Panel>
        <Panel
          title="Comments"
          aside={<span className={ui.badge}>{comments.length}</span>}
          flush
        >
          <ul className={ui.rows}>
            {comments.map((item) => (
              <li key={item.time}>
                <span className={ui.avatar}>{item.initials}</span>
                <span className={ui.rowMain}>
                  <b>{item.author}</b>
                  <span>{item.text}</span>
                </span>
                <span className={ui.mono}>{item.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </>
    );
  return (
    <>
      <Panel title="Workflow">
        <StageBar stages={stageLabels} current={stage.stage} />
        <p className={styles.note}>
          {stage.stage === 0
            ? "Confirm the brief and deadline before production starts."
            : stage.stage === 1
              ? "In production. Upload a version under Outputs when it is ready for review."
              : stage.stage === 2
                ? "Collect review notes and prepare the next cut."
                : "Project delivered. Confirm payment in Properties."}
        </p>
      </Panel>
      <Panel
        title="Internal notes"
        aside={
          <button type="button" className={ui.textButton} onClick={onEditNotes}>
            Edit notes
          </button>
        }
      >
        <p className={styles.note}>{notes}</p>
      </Panel>
      <section className={ui.panel}>
        <div className={ui.panelHead}>
          <div>
            <h4 className={ui.panelTitle}>Revision rounds</h4>
            <p className={styles.note}>Counted in a team Workspace.</p>
          </div>
        </div>
        <div className={ui.panelBody}>
          <span>Draft a change order</span>
        </div>
      </section>
    </>
  );
}

/**
 * Workflow chapter on /features: four steps (Radix Tabs) above a Relay
 * project page. Each step switches the page to the matching tab and stage;
 * the Details panel follows. A supplied recording replaces the page.
 */
export default function WorkflowDemo() {
  const [stageId, setStageId] = useState<StageId>("plan");

  return (
    <section
      className={`story-section ${chapter.chapter}`}
      id="workflow"
      aria-labelledby="workflow-title"
    >
      <Reveal className={chapter.head}>
        <h2 className={chapter.title} id="workflow-title">
          From project brief to final delivery.
        </h2>
        <p>Follow one sample project through each step.</p>
      </Reveal>
      <Reveal delay={0.1}>
        <Tabs.Root
          value={stageId}
          onValueChange={(value) => {
            const nextStage = stages.find((stage) => stage.id === value);
            if (nextStage) setStageId(nextStage.id);
          }}
        >
          <Tabs.List
            className={styles.steps}
            aria-label="Project workflow steps"
          >
            {stages.map((item, index) => (
              <Tabs.Trigger
                key={item.id}
                value={item.id}
                className={styles.step}
              >
                <span className={styles.stepNumber}>0{index + 1}</span>
                <span className={styles.stepLabel}>{item.title}</span>
                <span className={styles.stepText}>{item.description}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value={stageId} className={styles.content}>
            <StagePage
              stage={stages.find((stage) => stage.id === stageId) ?? stages[0]}
              onStageChange={setStageId}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Reveal>
    </section>
  );
}

/** The project page for one step, or that step's recording when supplied. */
function StagePage({
  stage: item,
  onStageChange,
}: {
  stage: Stage;
  onStageChange: (id: StageId) => void;
}) {
  const [failedVideo, setFailedVideo] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<{
    stage: StageId;
    tab: ProjectTab;
  } | null>(null);
  const view = selectedView?.stage === item.id ? selectedView.tab : item.tab;
  const [title, setTitle] = useState("Summer launch film");
  const [notes, setNotes] = useState(
    "Picture lock is due next. Sound mix and final captions follow after approval."
  );
  const [editing, setEditing] = useState(false);
  const [paid, setPaid] = useState(true);
  const contentStage =
    view === "Outputs"
      ? stages[1]
      : view === "Client review"
        ? stages[2]
        : item.id === "deliver"
          ? stages[3]
          : stages[0];
  const recording = recordings[item.id];
  // Same scale as the app: Planned 0%, then 33%, 67%, Delivered 100%.
  const percent = Math.round((item.stage / (stageLabels.length - 1)) * 100);

  return (
    <AppWindow
      crumbs={["Projects", title]}
      page="projects"
      label={`Sample project, ${item.label} step`}
      action="Edit"
      onAction={() => setEditing(true)}
      className={ui.record}
    >
      {recording && failedVideo !== recording.src ? (
        <video
          key={recording.src}
          className={styles.video}
          controls
          playsInline
          preload="metadata"
          aria-label={`${item.label} in Relay`}
          onError={() => setFailedVideo(recording.src)}
        >
          <source src={recording.src} />
          {recording.captions && (
            <track
              kind="captions"
              src={recording.captions}
              srcLang="en"
              label="English"
              default
            />
          )}
        </video>
      ) : (
        <>
          <div className={styles.page}>
            <div className={styles.main}>
              <ProjectTabs
                active={view}
                onChange={(tab) => setSelectedView({ stage: item.id, tab })}
              />
              <div hidden={view !== "Outputs"}>
                <DemoOutputs />
              </div>
              {view === "Outputs" ? null : view === "Files" ? (
                <Panel title="External links" flush>
                  <ul className={ui.rows}>
                    <Row
                      icon={<FileTextIcon size={14} />}
                      title="Brand brief.pdf"
                      detail="Google Drive · Project brief"
                    />
                    <Row
                      icon={<ImageIcon size={14} />}
                      title="Poster.psd"
                      detail="Dropbox · Brand artwork"
                    />
                  </ul>
                </Panel>
              ) : view === "Assets" ? (
                <Panel title="Stage assets" flush>
                  <ul className={ui.rows}>
                    <Row
                      icon={<FileTextIcon size={14} />}
                      title="Summer blend brief"
                      detail="Planning · Brief"
                    />
                    <Row
                      icon={<FilmStripIcon size={14} />}
                      title="Coffee roastery selects"
                      detail="In Progress · Raw footage"
                    />
                  </ul>
                </Panel>
              ) : view === "Activity" ? (
                <Panel title="Activity" flush>
                  <ul className={ui.rows}>
                    {stages.slice(0, item.stage + 1).map((stage) => (
                      <Row
                        key={stage.id}
                        icon={<CheckIcon size={14} />}
                        title={stage.title}
                        detail={`Maya Chen · ${stage.badge.label}`}
                      />
                    ))}
                  </ul>
                </Panel>
              ) : (
                <StageView
                  stage={{ ...contentStage, stage: item.stage }}
                  notes={notes}
                  onEditNotes={() => setEditing(true)}
                />
              )}
            </div>
            <ProjectProperties
              status={item.badge.label}
              onStatusChange={(status) => {
                const stage = stages.find(
                  (stage) => stage.badge.label === status
                );
                if (stage) onStageChange(stage.id);
              }}
              paid={paid}
              onPaidChange={() => setPaid((value) => !value)}
            />
          </div>
        </>
      )}
      <DemoDialog open={editing} onOpenChange={setEditing} title="Edit project">
        <form
          className={ui.form}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const nextTitle = String(data.get("title") ?? "").trim();
            if (!nextTitle) return;
            setTitle(nextTitle);
            setNotes(String(data.get("notes") ?? "").trim());
            setEditing(false);
          }}
        >
          <label className={ui.field}>
            Project title
            <input
              className={ui.input}
              name="title"
              defaultValue={title}
              required
              maxLength={100}
            />
          </label>
          <label className={ui.field}>
            Internal notes
            <textarea
              className={ui.input}
              name="notes"
              defaultValue={notes}
              rows={4}
              maxLength={1000}
            />
          </label>
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            Save changes
          </button>
        </form>
      </DemoDialog>
    </AppWindow>
  );
}

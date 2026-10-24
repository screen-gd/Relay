"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  FilmStripIcon,
  LockKeyIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
import AppWindow, {
  ProjectTabs,
  StageBar,
  type ProjectTab,
} from "./features/AppWindow";
import DemoDialog from "./features/DemoDialog";
import DemoOutputs, { type OutputState } from "./features/DemoOutputs";
import ProjectProperties from "./features/ProjectProperties";
import projectStyles from "./WorkflowDemo.module.css";
import ui from "./features/app-ui.module.css";
import chapter from "./features/chapter.module.css";
import Reveal from "./site/Reveal";
import styles from "./DeliveryDemo.module.css";

type Tone = "info" | "warning" | "success" | undefined;

const steps = [
  {
    label: "Add version",
    title: "Add the new cut",
    detail:
      "Paste a YouTube, Vimeo, Drive, or Dropbox link for the new version.",
    action: "Share review link",
    meta: "YouTube · Linked",
    badge: { label: "In Progress", tone: "info" },
    log: { title: "v4 linked", who: "Maya Chen", time: "9:40 AM" },
  },
  {
    label: "Share link",
    title: "Share a private review link",
    detail: "Clients watch and comment without creating an account.",
    action: "Mark client approved",
    meta: "Password protected · 4 comments",
    badge: { label: "Client Review", tone: "warning" },
    log: { title: "Review link shared", who: "Maya Chen", time: "9:42 AM" },
  },
  {
    label: "Approval",
    title: "Capture the client decision",
    detail: "Keep the reviewer and the exact approved version on record.",
    action: "Confirm delivery",
    meta: "Approved by Jordan Patel",
    badge: { label: "Approved", tone: "success" },
    log: { title: "v4 approved", who: "Jordan Patel", time: "3:12 PM" },
  },
  {
    label: "Delivered",
    title: "Hand off the final file",
    detail: "The approved file and its delivery status stay together.",
    action: "Start again",
    meta: "Delivered to Aperture Coffee",
    badge: { label: "Delivered", tone: "success" },
    log: { title: "Delivered to client", who: "Maya Chen", time: "5:01 PM" },
  },
] as const satisfies readonly {
  label: string;
  title: string;
  detail: string;
  action: string;
  meta: string;
  badge: { label: string; tone: Tone };
  log: { title: string; who: string; time: string };
}[];

const facts = [
  {
    icon: LockKeyIcon,
    title: "Private review links",
    text: "Password protected. Clients never make an account.",
  },
  {
    icon: CheckCircleIcon,
    title: "Approval on record",
    text: "Who approved, which version, and when.",
  },
  {
    icon: PaperPlaneTiltIcon,
    title: "Clear handoff",
    text: "The team sees which file is ready to send.",
  },
] as const;

/**
 * Delivery chapter on /features: a Relay project's Outputs and Versions tab.
 * Output review states and the walkthrough action move a version through
 * delivery; the Activity view grows as steps complete.
 */
export default function DeliveryDemo() {
  const [outputState, setOutputState] = useState<OutputState>("Draft");
  const [view, setView] = useState<ProjectTab>("Outputs");
  const [editing, setEditing] = useState(false);
  const [paid, setPaid] = useState(false);
  const outputStates: OutputState[] = [
    "Draft",
    "Sent to Client",
    "Approved",
    "Final Delivered",
  ];
  const activeStep =
    outputState === "Changes Requested"
      ? 1
      : Math.max(0, outputStates.indexOf(outputState));
  const setActiveStep = (update: number | ((current: number) => number)) => {
    const index = typeof update === "function" ? update(activeStep) : update;
    const nextState = outputStates[index];
    if (nextState) setOutputState(nextState);
  };
  const [title, setTitle] = useState("Summer launch film");
  const step = steps[activeStep];

  return (
    <section
      className={`story-section ${chapter.chapter}`}
      id="delivery"
      aria-labelledby="delivery-title"
    >
      <Reveal className={chapter.head}>
        <h2 className={chapter.title} id="delivery-title">
          Track approvals and delivery.
        </h2>
        <p>
          See the file, reviewer, and handoff status at each step. Click through
          the sample.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <AppWindow
          crumbs={["Projects", title]}
          page="projects"
          label="Sample delivery record"
          action="Edit"
          onAction={() => setEditing(true)}
          className={ui.record}
        >
          <div className={projectStyles.page}>
            <div className={projectStyles.main}>
              <ProjectTabs active={view} onChange={setView} />
              <div hidden={view !== "Outputs"}>
                <DemoOutputs
                  seeded
                  state={outputState}
                  onStateChange={setOutputState}
                />
                <div className={styles.actions}>
                  <button
                    className={ui.button}
                    type="button"
                    onClick={() =>
                      setActiveStep((value) => (value + 1) % steps.length)
                    }
                  >
                    {step.action}
                  </button>
                  <span className={styles.next}>{step.detail}</span>
                </div>
              </div>
              {view === "Outputs" ? null : view === "Overview" ? (
                <section className={ui.panel}>
                  <div className={ui.panelHead}>
                    <h3 className={ui.panelTitle}>Workflow</h3>
                  </div>
                  <div className={ui.panelBody}>
                    <StageBar
                      stages={["Planned", "In Progress", "Review", "Delivered"]}
                      current={Math.min(3, activeStep + 1)}
                    />
                    <p>{step.detail}</p>
                  </div>
                </section>
              ) : view === "Activity" ? (
                <section className={ui.panel}>
                  <div className={ui.panelHead}>
                    <h3 className={ui.panelTitle}>Project Activity</h3>
                  </div>
                  <div className={ui.panelBody}>
                    <ol className={styles.activity}>
                      {steps
                        .slice(0, activeStep + 1)
                        .reverse()
                        .map((item) => (
                          <li key={item.label}>
                            <b>{item.log.title}</b>
                            <span>
                              {item.log.who} · {item.log.time}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>
                </section>
              ) : (
                <section className={ui.panel}>
                  <div className={ui.panelHead}>
                    <h3 className={ui.panelTitle}>
                      {view === "Client review" ? "Client Portal" : view}
                    </h3>
                  </div>
                  <div className={ui.panelBody}>
                    {view === "Client review" ? (
                      <a href="#client-review" className={ui.button}>
                        Open sample review
                      </a>
                    ) : (
                      <p>
                        {view === "Files"
                          ? "External links · Summer launch v4 · YouTube"
                          : "Planning · Launch film brief"}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
            <ProjectProperties
              status={
                activeStep === 3
                  ? "Delivered"
                  : activeStep === 0
                    ? "In Progress"
                    : "Client Review"
              }
              onStatusChange={(status) =>
                setActiveStep(
                  status === "Delivered"
                    ? 3
                    : status === "Client Review"
                      ? 1
                      : 0
                )
              }
              paid={paid}
              onPaidChange={() => setPaid((value) => !value)}
            />
          </div>
          <DemoDialog
            open={editing}
            onOpenChange={setEditing}
            title="Edit project"
          >
            <form
              className={ui.form}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("title") ?? "").trim();
                if (!name) return;
                setTitle(name);
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
              <button type="submit" className={`${ui.button} ${ui.primary}`}>
                Save changes
              </button>
            </form>
          </DemoDialog>
        </AppWindow>
      </Reveal>

      <div className="box-grid-frame is-facts">
        <ul className="box-grid">
          {facts.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={20} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

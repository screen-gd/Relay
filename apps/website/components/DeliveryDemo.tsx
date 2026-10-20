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
import AppWindow, { ProjectTabs } from "./features/AppWindow";
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
 * The stage bar and the white primary action move one version from link to
 * delivery; the Activity panel grows as steps complete.
 */
export default function DeliveryDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];
  const isComplete = activeStep === steps.length - 1;
  const next = steps[activeStep + 1];

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
          crumbs={["Projects", "Summer launch film"]}
          page="projects"
          label="Sample delivery record"
        >
          <ProjectTabs active="Outputs and Versions" />
          <div className={styles.page}>
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Summer launch v4</h3>
                <span className={ui.badge} data-tone={step.badge.tone}>
                  {step.badge.label}
                </span>
              </div>
              <div className={ui.panelBody}>
                <div
                  className={styles.stages}
                  role="group"
                  aria-label="Sample delivery steps"
                >
                  {steps.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      className={styles.stage}
                      data-reached={index <= activeStep}
                      aria-pressed={index === activeStep}
                      onClick={() => setActiveStep(index)}
                    >
                      <span aria-hidden="true" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className={styles.current} aria-live="polite">
                  <h4>{step.title}</h4>
                  <p>{step.detail}</p>
                  <div className={styles.file}>
                    <span className={ui.tile}>
                      <FilmStripIcon size={14} aria-hidden="true" />
                    </span>
                    <span className={ui.rowMain}>
                      <b>Summer launch v4</b>
                      <span>{step.meta}</span>
                    </span>
                    <span className={ui.mono}>00:23</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={`${ui.button} ${isComplete ? "" : ui.primary}`}
                    type="button"
                    onClick={() =>
                      setActiveStep((current) =>
                        current === steps.length - 1 ? 0 : current + 1
                      )
                    }
                  >
                    {isComplete ? (
                      <ArrowCounterClockwiseIcon size={13} aria-hidden="true" />
                    ) : (
                      <CheckIcon size={13} aria-hidden="true" />
                    )}
                    {step.action}
                  </button>
                  {next ? (
                    <span className={styles.next}>
                      Next: {next.label}{" "}
                      <ArrowRightIcon size={12} aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={ui.panel} aria-label="Version activity">
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Activity</h3>
                <span className={`${ui.badge} ${ui.mono}`}>
                  {activeStep + 1}
                </span>
              </div>
              <ol className={styles.activity}>
                {steps
                  .slice(0, activeStep + 1)
                  .reverse()
                  .map((item) => (
                    <li key={item.label}>
                      <b>{item.log.title}</b>
                      <span>
                        {item.log.who} ·{" "}
                        <span className={ui.mono}>{item.log.time}</span>
                      </span>
                    </li>
                  ))}
              </ol>
            </section>
          </div>
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

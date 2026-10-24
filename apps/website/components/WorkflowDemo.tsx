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
import AppWindow, { ProjectTabs, StageBar } from "./features/AppWindow";
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
    tab: "Outputs and Versions",
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
    tab: "Client Review",
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

const checklist = [
  "Organize selects",
  "Complete fine cut",
  "Send review link",
  "Export masters",
];

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
      {flush ? children : <div className={ui.panelBody}>{children}</div>}
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

function StageView({ stage }: { stage: Stage }) {
  const workflow = (
    <Panel title="Workflow">
      <StageBar stages={stageLabels} current={stage.stage} />
    </Panel>
  );

  switch (stage.id) {
    case "plan":
      return (
        <>
          {workflow}
          <Panel title="Internal notes">
            <p className={styles.note}>
              60-second launch film for the summer blend. One master cut and
              three 9:16 cutdowns. Picture lock before sound and captions.
            </p>
          </Panel>
          <Panel
            title="Checklist"
            aside={<span className={ui.mono}>0 / 4</span>}
            flush
          >
            <ul className={ui.rows}>
              {checklist.map((item) => (
                <li key={item}>
                  <span className={styles.check} />
                  <span className={ui.rowMain}>
                    <b>{item}</b>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      );
    case "link":
      return (
        <>
          <Panel
            title="Project Outputs"
            aside={<span className={ui.badge}>2 versions</span>}
            flush
          >
            <ul className={ui.rows}>
              <Row
                icon={<FilmStripIcon size={14} />}
                title="Summer launch v4"
                detail="YouTube link · Added today"
              >
                <span className={ui.badge} data-tone="info">
                  Current
                </span>
              </Row>
              <Row
                icon={<FilmStripIcon size={14} />}
                title="Summer launch v3"
                detail="Vimeo link · Jul 20"
              >
                <span className={ui.badge}>Previous</span>
              </Row>
            </ul>
          </Panel>
          <Panel
            title="External links"
            aside={<span className={ui.badge}>2</span>}
            flush
          >
            <ul className={ui.rows}>
              <Row
                icon={<FileTextIcon size={14} />}
                title="Brand brief.pdf"
                detail="Google Drive"
              />
              <Row
                icon={<ImageIcon size={14} />}
                title="Poster.psd"
                detail="Dropbox"
              />
            </ul>
          </Panel>
          <p className={styles.foot}>Linked files use 0 GB of Relay storage.</p>
        </>
      );
    case "review":
      return (
        <>
          <Panel
            title="Client Portal"
            aside={
              <span className={ui.badge} data-tone="warning">
                Waiting on client
              </span>
            }
            flush
          >
            <ul className={ui.rows}>
              <Row
                icon={<LockKeyIcon size={14} />}
                title="Summer launch v4"
                detail="Password protected · No account needed"
              >
                <span className={ui.button}>
                  <CopyIcon size={13} /> Copy link
                </span>
              </Row>
            </ul>
          </Panel>
          <Panel
            title="Comments"
            aside={
              <span className={`${ui.badge} ${ui.mono}`}>
                {comments.length}
              </span>
            }
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
    case "deliver":
      return (
        <>
          {workflow}
          <Panel title="Project Outputs" flush>
            <ul className={ui.rows}>
              <Row
                icon={<FilmStripIcon size={14} />}
                title="Launch film · 16:9"
                detail="v4 · Approved by Maya Chen, Jul 23"
              >
                <span className={ui.badge} data-tone="success">
                  Delivered
                </span>
              </Row>
              <Row
                icon={<FilmStripIcon size={14} />}
                title="Social cutdowns · 9:16"
                detail="3 files"
              >
                <span className={ui.badge} data-tone="success">
                  Delivered
                </span>
              </Row>
            </ul>
          </Panel>
          <Panel
            title="Client payment"
            aside={<span className={ui.switch} data-on="true" />}
          >
            <p className={styles.note}>
              Paid <span className={ui.mono}>Jul 26</span> ·{" "}
              <span className={ui.mono}>$1,800</span>
            </p>
          </Panel>
        </>
      );
  }
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
          onValueChange={(value) => setStageId(value as StageId)}
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

          {stages.map((item) => (
            <Tabs.Content
              key={item.id}
              value={item.id}
              className={styles.content}
            >
              <StagePage stage={item} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Reveal>
    </section>
  );
}

/** The project page for one step, or that step's recording when supplied. */
function StagePage({ stage: item }: { stage: Stage }) {
  const [failedVideo, setFailedVideo] = useState<string | null>(null);
  const recording = recordings[item.id];
  // Same scale as the app: Planned 0%, then 33%, 67%, Delivered 100%.
  const percent = Math.round((item.stage / (stageLabels.length - 1)) * 100);

  return (
    <AppWindow
      crumbs={["Projects", "Summer launch film"]}
      page="projects"
      label={`Sample project, ${item.label} step`}
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
          <ProjectTabs active={item.tab} />
          <div className={styles.page}>
            <div className={styles.main}>
              <StageView stage={item} />
            </div>
            <section className={`${ui.panel} ${styles.detailsPanel}`}>
              <div className={ui.panelHead}>
                <h4 className={ui.panelTitle}>Details</h4>
                <span className={ui.mono}>{percent}%</span>
              </div>
              <div className={ui.panelBody}>
                <div className={ui.progress}>
                  <i style={{ width: `${percent}%` }} />
                </div>
                <dl className={ui.details}>
                  <div>
                    <dt>Stage</dt>
                    <dd>
                      <span className={ui.badge} data-tone={item.badge.tone}>
                        {item.badge.label}
                      </span>
                    </dd>
                  </div>
                  {[
                    ["Client", "Aperture Coffee"],
                    ["Lead", "Maya Chen"],
                    ["Due", "Jul 24, 2026"],
                    ["Work type", "Client Work"],
                    ["Value", "$1,800"],
                  ].map(([term, value]) => (
                    <div key={term}>
                      <dt>{term}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Payment</dt>
                    <dd>
                      {item.payment === "Paid" ? (
                        <span className={ui.status} data-tone="success">
                          <CheckIcon size={12} aria-hidden="true" /> Paid
                        </span>
                      ) : (
                        item.payment
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </>
      )}
    </AppWindow>
  );
}

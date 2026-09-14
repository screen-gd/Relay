"use client";

import { useState } from "react";
import styles from "./WorkflowDemo.module.css";

const stages = [
  {
    id: "plan",
    label: "Plan",
    title: "Set the brief and deadline.",
    description:
      "Keep the client, due date, and project status together so you know what to work on next.",
    rows: [
      ["Project", "Summer launch film"],
      ["Client", "Aperture Coffee"],
      ["Due", "May 5, 5:00 PM"],
      ["Status", "In progress"],
    ],
  },
  {
    id: "upload",
    label: "Upload",
    title: "Keep the project files together.",
    description:
      "Upload the brief, images, and video versions to the project. Third-party video embeds do not use upload storage.",
    rows: [
      ["Brand brief.pdf", "240 KB"],
      ["Poster.jpg", "1.2 MB"],
      ["Summer-launch-v4.mp4", "28 MB"],
    ],
  },
  {
    id: "review",
    label: "Review",
    title: "Get feedback on the right moment.",
    description:
      "Share a password-protected link. Clients can leave timestamped comments on uploaded videos without creating an account.",
    rows: [
      ["Version", "Summer-launch-v4.mp4"],
      ["00:07 · Maya", "Hold this shot a little longer."],
      ["00:16 · Jordan", "Love the pace here."],
    ],
  },
  {
    id: "deliver",
    label: "Deliver",
    title: "Track the final handoff.",
    description:
      "Keep the approved version and delivery status together, so the team knows which file is ready for the client.",
    rows: [
      ["Version", "Summer-launch-v4.mp4"],
      ["Review", "Approved by Maya"],
      ["Delivery", "Ready to deliver"],
    ],
  },
] as const;

type StageId = (typeof stages)[number]["id"];
type Recording = { src: string; captions?: string };

// Add the actual Relay recordings here when supplied. Do not substitute stock footage.
const recordings: Partial<Record<StageId, Recording>> = {};

export default function WorkflowDemo() {
  const [stageId, setStageId] = useState<StageId>("plan");
  const [failedVideo, setFailedVideo] = useState<string | null>(null);
  const stage = stages.find((item) => item.id === stageId) ?? stages[0];
  const recording = recordings[stage.id];

  return (
    <section
      className="story-section workflow-story"
      id="workflow"
      aria-labelledby="workflow-title"
    >
      <div className="story-heading">
        <h2 className="story-title" id="workflow-title">
          From project brief to final delivery.
        </h2>
        <p>Follow one project through each step.</p>
      </div>
      <div className={styles.workflow}>
        <div
          className={styles.stages}
          role="group"
          aria-label="Project workflow steps"
        >
          {stages.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === stageId}
              aria-controls="workflow-example"
              onClick={() => setStageId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.content} id="workflow-example">
          <div className={styles.explanation}>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
          </div>
          {recording && failedVideo !== recording.src ? (
            <video
              key={recording.src}
              className={styles.video}
              controls
              playsInline
              preload="metadata"
              aria-label={`${stage.label} in Relay`}
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
            <div className={styles.example}>
              <p>Sample project · Summer launch film</p>
              <dl>
                {stage.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import {
  Check,
  CheckCircle2,
  Link2,
  LockKeyhole,
  RotateCcw,
  Send,
  Upload,
} from "lucide-react";
import { useState } from "react";
import styles from "./DeliveryDemo.module.css";

const steps = [
  {
    label: "Upload version",
    title: "Upload the cut",
    detail: "Keep the working source and its version in one project.",
    action: "Share review link",
    icon: Upload,
    file: "Summer-launch-v4.mp4",
    status: "Uploaded",
    meta: "28 MB · H.264 · v4",
    record: ["Summer launch film", "Version v4", "Ready to share"],
  },
  {
    label: "Share password link",
    title: "Share a private review link",
    detail: "Clients can watch and comment without creating an account.",
    action: "Mark client approved",
    icon: Link2,
    file: "Summer-launch-v4.mp4",
    status: "Link ready",
    meta: "Password protected · 4 comments",
    record: ["Summer launch film", "Private review link", "Password required"],
  },
  {
    label: "Client approval",
    title: "Capture the client decision",
    detail: "Keep the reviewer and the exact approved version visible.",
    action: "Confirm delivery",
    icon: CheckCircle2,
    file: "Summer-launch-v4.mp4",
    status: "Approved by Maya Chen",
    meta: "Approved version · v4",
    record: ["Summer launch film", "Maya Chen approved", "Version v4"],
  },
  {
    label: "Delivered",
    title: "Hand off the final file",
    detail: "Keep the approved file and its delivery status together.",
    action: "Start again",
    icon: Send,
    file: "Summer-launch-v4.mp4",
    status: "Delivered",
    meta: "Approved by Maya Chen · v4",
    record: ["Summer launch film", "Version v4", "Handoff confirmed"],
  },
] as const;

export default function DeliveryDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];
  const Icon = step.icon;
  const isComplete = activeStep === steps.length - 1;

  const advance = () => {
    setActiveStep((current) =>
      current === steps.length - 1 ? 0 : current + 1
    );
  };

  return (
    <section
      className={`story-section delivery-story ${styles.section}`}
      id="delivery"
      aria-label="Tracking and delivery"
    >
      <div className="delivery-copy">
        <h2 className="story-title">Track approvals and delivery.</h2>
        <p>See the file, reviewer, and handoff status at each step.</p>
        <div
          className={styles.steps}
          role="group"
          aria-label="Sample delivery workflow"
        >
          {steps.map((item, index) => {
            const StepIcon = item.icon;
            return (
              <button
                key={item.label}
                className={`${styles.step} ${index === activeStep ? styles.active : ""} ${index < activeStep ? styles.complete : ""}`}
                type="button"
                aria-pressed={index === activeStep}
                onClick={() => setActiveStep(index)}
              >
                <span className={styles.stepNumber}>
                  {index < activeStep ? <Check size={13} /> : `0${index + 1}`}
                </span>
                <span>{item.label}</span>
                <StepIcon size={15} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={styles.panel}
        role="region"
        aria-label="Sample delivery record"
        aria-live="polite"
      >
        <div className={styles.panelTopline}>
          <span className={styles.brandMark}>RELAY / SAMPLE WORKFLOW</span>
          <span className={styles.demoBadge}>DEMO ONLY</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.preview} aria-label={`${step.label} record`}>
            <div className={styles.recordHeader}>
              <span>SUMMER LAUNCH FILM</span>
              <span className={styles.recordVersion}>V4</span>
            </div>
            <div className={styles.recordList}>
              {step.record.map((item, index) => (
                <div className={styles.recordItem} key={item}>
                  <span className={styles.recordCheck}>
                    <Check size={13} />
                  </span>
                  <span>{item}</span>
                  {index === step.record.length - 1 && (
                    <span className={styles.recordState}>{step.status}</span>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.recordFooter}>
              <LockKeyhole size={14} /> Sample project record · no upload
              required
            </div>
          </div>
          <div className={styles.details}>
            <div className={styles.titleRow}>
              <h3>{step.title}</h3>
              <span className={styles.statusIcon}>
                <Icon size={16} />
              </span>
            </div>
            <p>{step.detail}</p>
            <div className={styles.fileCard}>
              <div className={styles.fileIcon}>
                <LockKeyhole size={16} />
              </div>
              <div>
                <strong>{step.file}</strong>
                <span>{step.meta}</span>
              </div>
              <span className={styles.fileStatus}>{step.status}</span>
            </div>
            <button className={styles.action} type="button" onClick={advance}>
              {isComplete ? <RotateCcw size={15} /> : <Check size={15} />}
              {step.action}
            </button>
            <span className={styles.nextHint}>
              {isComplete
                ? "Reset the sample workflow"
                : `Next: ${steps[activeStep + 1].label}`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

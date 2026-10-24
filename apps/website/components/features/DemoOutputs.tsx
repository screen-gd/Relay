"use client";

import { useState } from "react";
import { PlusIcon, CaretRightIcon } from "./AppIcons";
import DemoDialog from "./DemoDialog";
import ui from "./app-ui.module.css";
import styles from "./DemoOutputs.module.css";

const states = [
  "Draft",
  "Sent to Client",
  "Changes Requested",
  "Approved",
  "Final Delivered",
] as const;
export type OutputState = (typeof states)[number];
const nextAction = {
  Draft: "Add or send a Media Version",
  "Sent to Client": "Await Client review",
  "Changes Requested": "Upload the requested revision",
  Approved: "Deliver the approved version",
  "Final Delivered": "No action needed",
} satisfies Record<OutputState, string>;

export default function DemoOutputs({
  seeded = false,
  state = "Draft",
  onStateChange,
}: {
  seeded?: boolean;
  state?: OutputState;
  onStateChange?: (state: OutputState) => void;
}) {
  const [outputs, setOutputs] = useState([
    "Fine cut",
    "Picture lock",
    "Sound mix",
    "Captions",
  ]);
  const [versions, setVersions] = useState<
    { output: string; label: string; url: string }[]
  >(
    seeded
      ? [1, 2, 3, 4].map((version) => ({
          output: "Fine cut",
          label: "Summer launch v" + version,
          url: "/api/client-review-video",
        }))
      : []
  );
  const [localStates, setLocalStates] = useState<Record<string, OutputState>>(
    {}
  );
  const [dialog, setDialog] = useState<
    { kind: "output" } | { kind: "version"; output: string } | null
  >(null);
  const [error, setError] = useState("");
  return (
    <section className={ui.panel}>
      <div className={ui.panelHead}>
        <h3 className={ui.panelTitle}>Project Outputs</h3>
        <button
          type="button"
          className={`${ui.button} ${ui.inkPrimary}`}
          onClick={() => {
            setError("");
            setDialog({ kind: "output" });
          }}
        >
          <PlusIcon size={14} />
          Add Output
        </button>
      </div>
      <div className={ui.panelBody}>
        {outputs.map((output, index) => {
          const currentState =
            index === 0 && onStateChange
              ? state
              : (localStates[output] ?? "Draft");
          const history = versions.filter(
            (version) => version.output === output
          );
          const current = history.at(-1);
          return (
            <article className={styles.output} key={output}>
              <div className={styles.head}>
                <div className={styles.identity}>
                  <b>{output}</b>
                  <span className={styles.category}>Deliverable</span>
                  <p>Due 2026-07-24 · Next: {nextAction[currentState]}</p>
                </div>
                <div className={styles.actions}>
                  <select
                    className={ui.input}
                    aria-label={`Review state for ${output}`}
                    value={currentState}
                    onChange={(event) => {
                      const value = states.find(
                        (value) => value === event.target.value
                      );
                      if (value) {
                        setLocalStates((current) => ({
                          ...current,
                          [output]: value,
                        }));
                        if (index === 0) onStateChange?.(value);
                      }
                    }}
                  >
                    {states.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={ui.textButton}
                    onClick={() => {
                      setError("");
                      setDialog({ kind: "version", output });
                    }}
                  >
                    <PlusIcon size={14} />
                    Media Version
                  </button>
                </div>
              </div>
              <div className={styles.version}>
                {current ? (
                  <>
                    <div>
                      <b>Current: {current.label}</b>
                      <p>Version {history.length} · External link</p>
                    </div>
                    <a
                      className={ui.textButton}
                      href={current.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open ↗
                    </a>
                  </>
                ) : (
                  <span>No Media Version yet.</span>
                )}
              </div>
              {history.length > 0 && (
                <details className={styles.history}>
                  <summary>
                    <CaretRightIcon size={14} />
                    Version history ({history.length})
                  </summary>
                  <ul className={ui.rows}>
                    {history.map((version, index) => (
                      <li key={`${version.label}:${index}`}>
                        <span>
                          v{index + 1} · {version.label}
                          {index === history.length - 1
                            ? " · Current"
                            : " · Internal"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
      <DemoDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={
          dialog?.kind === "version"
            ? "Add Media Version"
            : "Add Project Output"
        }
      >
        <form
          className={ui.form}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const title = String(data.get("title") ?? "").trim();
            if (!title || !dialog) return;
            if (dialog.kind === "output") {
              if (outputs.includes(title)) {
                setError("This sample already has an output with that title.");
                return;
              }
              setOutputs((current) => [...current, title]);
            } else {
              const raw = String(data.get("url") ?? "");
              let url;
              try {
                url = new URL(raw);
              } catch {
                setError("Enter a valid video link.");
                return;
              }
              if (!["https:", "http:"].includes(url.protocol)) {
                setError("Use an HTTPS or HTTP link.");
                return;
              }
              setVersions((current) => [
                ...current,
                { output: dialog.output, label: title, url: url.href },
              ]);
            }
            setDialog(null);
          }}
        >
          <label className={ui.field}>
            {dialog?.kind === "version" ? "Version label" : "Output title"}
            <input className={ui.input} name="title" required maxLength={100} />
          </label>
          {dialog?.kind === "version" && (
            <label className={ui.field}>
              Media URL
              <input
                className={ui.input}
                name="url"
                type="url"
                placeholder="https://…"
                required
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          <button type="submit" className={`${ui.button} ${ui.inkPrimary}`}>
            Save
          </button>
        </form>
      </DemoDialog>
    </section>
  );
}

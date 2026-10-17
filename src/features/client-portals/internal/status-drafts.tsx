"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AiLockedNotice, useAiAccount } from "@/features/ai/ai-availability";
import { projectHref } from "@/features/projects/project-view";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function DraftEditor({
  draft,
  portalId,
}: {
  draft: Doc<"statusDrafts">;
  portalId?: Id<"projectPortals">;
}) {
  const [text, setText] = useState(draft.text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = useMutation(api.statusDrafts.update);
  const publish = useMutation(api.projectPortals.updateSettings);
  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await update({ draftId: draft._id, text });
      await operation();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save draft."
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 grid gap-2">
      <p className="text-meta">
        AI-drafted ·{" "}
        {draft.channel === "whatsapp"
          ? "WhatsApp"
          : draft.channel === "email"
            ? "Email"
            : "Portal note"}
      </p>
      <Textarea
        aria-label="Client update draft"
        value={text}
        disabled={busy}
        maxLength={draft.channel === "whatsapp" ? 700 : 2000}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || !text.trim()}
          onClick={() => void act(async () => {}, "Saved")}
        >
          Save draft
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || !text.trim()}
          onClick={() =>
            void act(() => navigator.clipboard.writeText(text.trim()), "Copied")
          }
        >
          Copy text
        </Button>
        {draft.channel === "portal" && portalId ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || !text.trim()}
            onClick={() =>
              void act(
                () =>
                  publish({ portalId, changes: { publicNotes: text.trim() } }),
                "Portal note published"
              )
            }
          >
            Replace portal note
          </Button>
        ) : null}
      </div>
      <p className="text-meta">
        Sources:{" "}
        <a
          className="underline"
          href={projectHref({ projectId: draft.projectId, view: "overview" })}
        >
          Project status
        </a>
        {draft.sourceOutputIds.map((id, index) => (
          <a
            key={id}
            className="ml-3 underline"
            href={`${projectHref({ projectId: draft.projectId, view: "outputs" })}#output-${id}`}
          >
            Output {index + 1}
          </a>
        ))}
        {draft.sourceCommentIds.map((id, index) => (
          <a
            key={id}
            className="ml-3 underline"
            href={`${projectHref({ projectId: draft.projectId, view: "outputs" })}#comment-${id}`}
          >
            Comment {index + 1}
          </a>
        ))}
      </p>
      {message ? (
        <p role="status" className="text-body">
          {message}
        </p>
      ) : null}
    </div>
  );
}

const sectionClassName =
  "py-3 dark:bg-black text-[var(--text-primary)] [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_textarea]:dark:bg-black [&_button]:text-[var(--text-primary)]";

/** Reviews channel-specific updates; copying and portal publishing require a click. */
export function StatusDrafts({
  projectId,
  portalId,
  aiEnabled,
}: {
  projectId: string;
  portalId?: Id<"projectPortals">;
  /** Whether this project's Workspace can run AI at all. */
  aiEnabled: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { hasAccount } = useAiAccount();

  const generate = useMutation(api.statusDrafts.generate);
  const [channel, setChannel] =
    useState<Doc<"statusDrafts">["channel"]>("portal");
  const [runId, setRunId] = useState<Id<"aiRuns"> | null>(null);
  const drafts = useQuery(
    api.statusDrafts.list,
    isAuthenticated ? { projectId, ...(runId ? { runId } : {}) } : "skip"
  );
  const run = useQuery(
    api.aiRuns.getRun,
    isAuthenticated && runId ? { runId } : "skip"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(modelTier: "default" | "better") {
    setBusy(true);
    setError("");
    try {
      setRunId((await generate({ projectId, channel, modelTier })).runId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not generate update."
      );
    } finally {
      setBusy(false);
    }
  }
  if (!isAuthenticated) {
    return (
      <section aria-label="Client status draft" className={sectionClassName}>
        <h4 className="mb-2 text-body font-semibold">Client update</h4>
        <AiLockedNotice
          feature="Draft a client status update"
          access={hasAccount ? "settings" : "signIn"}
        />
      </section>
    );
  }
  const running = busy || run?.status === "queued" || run?.status === "running";
  const selected =
    drafts?.find((d) => d.runId === runId && d.channel === channel) ??
    drafts?.find((d) => d.channel === channel);
  return (
    <section aria-label="Client status draft" className={sectionClassName}>
      <h4 className="mb-2 text-body font-semibold">Client update</h4>
      <div className="flex flex-wrap items-center gap-2">
        {aiEnabled || drafts?.length ? (
          <Select
            value={channel}
            onValueChange={(value) => {
              if (
                value === "portal" ||
                value === "email" ||
                value === "whatsapp"
              )
                setChannel(value);
            }}
            disabled={running}
          >
            <SelectTrigger className="w-36" aria-label="Update channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="[&_[data-slot=select-item]:focus]:bg-transparent">
              <SelectItem value="portal">Portal note</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {/* Reading, editing, copying, and publishing a saved draft needs no AI
            consent, so the locked notice replaces generation only. */}
        {aiEnabled ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={running}
              onClick={() => void request("default")}
            >
              Draft a client status update
            </Button>
            {run || selected ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={running}
                onClick={() => void request("better")}
              >
                Retry with better model
              </Button>
            ) : null}
          </>
        ) : (
          <AiLockedNotice
            feature="Draft a client status update"
            access={hasAccount ? "settings" : "signIn"}
          />
        )}
      </div>
      {run ? (
        <p role="status" className="mt-2 text-meta">
          {run.status === "queued"
            ? "Queued"
            : run.status === "running"
              ? "Drafting..."
              : run.status === "failed"
                ? "Generation failed. Check AI settings or retry."
                : "Draft ready"}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-body">
          {error}
        </p>
      ) : null}
      {selected ? (
        <DraftEditor key={selected._id} draft={selected} portalId={portalId} />
      ) : null}
    </section>
  );
}

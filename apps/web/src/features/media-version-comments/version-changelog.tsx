"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiLockedNotice, useAiAccount } from "@/features/ai/ai-availability";

function ChangelogEditor({ row }: { row: Doc<"versionChangelogs"> }) {
  const [text, setText] = useState(row.text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = useMutation(api.versionChangelog.update);
  async function save(approve: boolean) {
    setBusy(true);
    setMessage("");
    try {
      await update({ changelogId: row._id, text, approve });
      setMessage(approve ? "Approved for the Client Portal" : "Draft saved");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save changelog."
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 grid gap-2">
      <p className="type-label-sm">
        AI-drafted
        {row.approvedText ? " · Approved copy in portal" : " · Private draft"}
      </p>
      <Textarea
        aria-label="Version changelog draft"
        maxLength={2000}
        value={text}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || !text.trim()}
          onClick={() => void save(false)}
        >
          Save draft
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || !text.trim()}
          onClick={() => void save(true)}
        >
          Approve for portal
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 type-label-sm">
        {row.sourceRevisionIds.map((id, index) => (
          <a key={id} className="underline" href={`#revision-${id}`}>
            Revision {index + 1}
          </a>
        ))}
      </div>
      {message ? (
        <p role="status" className="type-body">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Keeps changelog generation and approval within the editor's review view. */
export function VersionChangelog({
  mediaVersionId,
  canEdit,
  enabled,
}: {
  mediaVersionId: string;
  canEdit: boolean;
  /** Whether this version's Workspace can run AI at all. */
  enabled: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { hasAccount } = useAiAccount();
  const available = enabled && isAuthenticated && canEdit;

  const generate = useMutation(api.versionChangelog.generate);
  const [runId, setRunId] = useState<Id<"aiRuns"> | null>(null);
  const rows = useQuery(
    api.versionChangelog.list,
    available ? { mediaVersionId, ...(runId ? { runId } : {}) } : "skip"
  );
  const run = useQuery(
    api.aiRuns.getRun,
    available && runId ? { runId } : "skip"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(modelTier: "default" | "better") {
    setBusy(true);
    setError("");
    try {
      setRunId((await generate({ mediaVersionId, modelTier })).runId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not generate changelog."
      );
    } finally {
      setBusy(false);
    }
  }
  if (!available)
    return canEdit ? (
      <section aria-label="Version changelog" className="mt-4">
        <AiLockedNotice
          feature="Draft a version changelog"
          access={hasAccount ? "settings" : "signIn"}
        />
      </section>
    ) : null;
  const selected = rows?.find((row) => row.runId === runId) ?? rows?.[0];
  const running = busy || run?.status === "queued" || run?.status === "running";
  return (
    <section aria-label="Version changelog" className="mt-4 ">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="type-label">What changed</h4>
        <Button
          variant="ghost"
          size="sm"
          disabled={running}
          onClick={() => void request("default")}
        >
          Draft a version changelog
        </Button>
        {run || rows?.length ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={running}
            onClick={() => void request("better")}
          >
            Retry with better model
          </Button>
        ) : null}
      </div>
      {run ? (
        <p role="status" className="mt-2 type-label-sm">
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
        <p role="alert" className="mt-2 type-body">
          {error}
        </p>
      ) : null}
      {selected ? <ChangelogEditor key={selected._id} row={selected} /> : null}
    </section>
  );
}

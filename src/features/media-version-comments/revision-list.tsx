"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiLockedNotice, useAiAccount } from "@/features/ai/ai-availability";
import { VersionChangelog } from "./version-changelog";
import { formatReviewTimestamp } from "./review-timestamps";
import { TranscriptLine } from "./transcript-review";

function RevisionRow({
  item,
  canEdit,
  act,
}: {
  item: Doc<"revisionItems">;
  canEdit: boolean;
  act: (operation: () => Promise<unknown>) => Promise<boolean>;
}) {
  const update = useMutation(api.revisionItems.update);
  const remove = useMutation(api.revisionItems.remove);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [busy, setBusy] = useState(false);
  async function perform(operation: () => Promise<unknown>) {
    setBusy(true);
    const saved = await act(operation);
    setBusy(false);
    if (saved) setEditing(false);
  }
  return (
    <li id={`revision-${item._id}`} className="grid gap-2 py-3">
      <p className="type-label-sm">
        {item.status === "draft"
          ? "AI-drafted"
          : item.status === "resolved"
            ? "Resolved"
            : "Accepted"}
        {item.timestamps.length
          ? ` · ${item.timestamps.map(formatReviewTimestamp).join(", ")}`
          : " · General"}
      </p>
      {editing ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void perform(() => update({ itemId: item._id, text }));
          }}
        >
          <Textarea
            aria-label="Revision text"
            value={text}
            maxLength={1200}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy || !text.trim()}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap type-body">{item.text}</p>
      )}
      {item.vague ? (
        <p className="type-body">Vague note · {item.clarifyingQuestion}</p>
      ) : null}
      <TranscriptLine commentIds={item.sourceCommentIds} />
      {item.possibleNewScope ? (
        <p className="type-label-sm">Possible new scope</p>
      ) : null}
      <div className="flex flex-wrap gap-3 type-label-sm">
        {item.sourceCommentIds.map((id, index) => (
          <a
            key={id}
            href={`#comment-${id}`}
            className="underline underline-offset-4"
          >
            Source {index + 1}
          </a>
        ))}
      </div>
      {canEdit && !editing ? (
        <div className="flex flex-wrap gap-2">
          {item.status === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void perform(() =>
                  update({ itemId: item._id, status: "accepted" })
                )
              }
            >
              Accept
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setText(item.text);
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void perform(() =>
                update({
                  itemId: item._id,
                  status: item.status === "resolved" ? "accepted" : "resolved",
                })
              )
            }
          >
            {item.status === "resolved" ? "Reopen" : "Resolve"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void perform(() => remove({ itemId: item._id }))}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function RevisionList({
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
  const items = useQuery(
    api.revisionItems.list,
    enabled && isAuthenticated ? { mediaVersionId } : "skip"
  );
  const generate = useMutation(api.revisionItems.generate);
  const [runId, setRunId] = useState<Id<"aiRuns"> | null>(null);
  const run = useQuery(
    api.aiRuns.getRun,
    enabled && isAuthenticated && runId ? { runId } : "skip"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(operation: () => Promise<unknown>) {
    setError("");
    try {
      await operation();
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update revisions."
      );
      return false;
    }
  }
  async function request(modelTier: "default" | "better") {
    setBusy(true);
    await act(async () => {
      const result = await generate({ mediaVersionId, modelTier });
      setRunId(result.runId);
    });
    setBusy(false);
  }
  if (!enabled || !isAuthenticated)
    return canEdit ? (
      <section aria-label="Revision list" className="mt-3">
        <AiLockedNotice
          feature="Turn feedback into revisions"
          access={hasAccount ? "settings" : "signIn"}
        />
        <VersionChangelog
          mediaVersionId={mediaVersionId}
          canEdit={canEdit}
          enabled={false}
        />
      </section>
    ) : null;
  const running = busy || run?.status === "queued" || run?.status === "running";
  const groups = new Map<string, Doc<"revisionItems">[]>();
  for (const item of items ?? [])
    groups.set(item.theme, [...(groups.get(item.theme) ?? []), item]);
  return (
    <section aria-label="Revision list" className="mt-3 text-foreground ">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="type-label">Revision list</h4>
        {canEdit ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              title="Uses up to 40 comments and the first 1,000 characters of each."
              onClick={() => void request("default")}
            >
              Turn feedback into revisions
            </Button>
            {run || items?.length ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={running}
                onClick={() => void request("better")}
              >
                Retry with better model
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      {run ? (
        <p role="status" className="mt-2 type-label-sm">
          {run.status === "queued"
            ? "Queued"
            : run.status === "running"
              ? "Generating revisions..."
              : run.status === "succeeded"
                ? "Revisions ready"
                : "Generation failed. Check AI settings or retry."}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-destructive type-body">
          {error}
        </p>
      ) : null}
      {[...groups].map(([theme, rows]) => (
        <div key={theme} className="mt-4">
          <h5 className="type-label">{theme}</h5>
          <ul className="divide-y divide-border">
            {rows
              .sort(
                (a, b) =>
                  (a.timestamps[0] ?? Infinity) - (b.timestamps[0] ?? Infinity)
              )
              .map((item) => (
                <RevisionRow
                  key={item._id}
                  item={item}
                  canEdit={canEdit}
                  act={act}
                />
              ))}
          </ul>
        </div>
      ))}
      <VersionChangelog
        key={mediaVersionId}
        mediaVersionId={mediaVersionId}
        canEdit={canEdit}
        enabled
      />
    </section>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MAX_TRANSCRIPT_BYTES } from "./transcript-parser";
import { formatReviewTimestamp } from "./review-timestamps";

const TranscriptContext = createContext<{
  data: FunctionReturnType<typeof api.transcripts.get> | undefined;
  reveal: () => void;
} | null>(null);

export function TranscriptLine({
  commentIds,
}: {
  commentIds: readonly string[];
}) {
  const context = useContext(TranscriptContext);
  const matches =
    context?.data?.matches.filter((match) =>
      commentIds.includes(match.commentId)
    ) ?? [];
  const seen = new Set<string>();
  return matches
    .filter((match) => {
      if (seen.has(match.segmentId)) return false;
      seen.add(match.segmentId);
      return true;
    })
    .map((match) => (
      <p key={match.segmentId} className="text-sm dark:text-white">
        {match.aiDrafted ? "AI-drafted · " : ""}
        <a
          href={`#transcript-${match.segmentId}`}
          onClick={context?.reveal}
          className="underline underline-offset-4"
        >
          {formatReviewTimestamp(match.startSeconds)} · {match.text}
        </a>
      </p>
    ));
}

export function TranscriptReview({
  mediaVersionId,
  canEdit,
  enabled,
  children,
}: {
  mediaVersionId: string;
  canEdit: boolean;
  enabled: boolean;
  children: ReactNode;
}) {
  return enabled ? (
    <ConnectedTranscriptReview
      mediaVersionId={mediaVersionId}
      canEdit={canEdit}
    >
      {children}
    </ConnectedTranscriptReview>
  ) : (
    children
  );
}

function ConnectedTranscriptReview({
  mediaVersionId,
  canEdit,
  children,
}: {
  mediaVersionId: string;
  canEdit: boolean;
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.transcripts.get,
    isAuthenticated ? { mediaVersionId } : "skip"
  );
  const upload = useMutation(api.transcripts.upload);
  const generate = useMutation(api.transcripts.generate);
  const [runId, setRunId] = useState<Id<"aiRuns">>();
  const run = useQuery(api.aiRuns.getRun, runId ? { runId } : "skip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const running = busy || run?.status === "queued" || run?.status === "running";
  async function perform(operation: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await operation();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update transcript."
      );
    } finally {
      setBusy(false);
    }
  }
  async function request(modelTier: "default" | "better") {
    await perform(async () => {
      const result = await generate({ mediaVersionId, modelTier });
      setRunId(result.runId);
    });
  }
  const replacing = Boolean(data?.transcript);
  // Uploading again replaces the transcript and clears its AI matches.
  const uploadControl = canEdit ? (
    <label className="grid gap-1 text-xs">
      {replacing ? "Replace transcript" : "Upload transcript"}
      <Input
        type="file"
        accept=".srt,.vtt,text/vtt"
        aria-label={`${replacing ? "Replace" : "Upload"} SRT or VTT transcript (32 KB, up to 300 cues)`}
        disabled={running || !data}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file)
            void perform(async () => {
              if (file.size > MAX_TRANSCRIPT_BYTES)
                throw new Error("Transcript must be 32 KB or smaller");
              await upload({
                mediaVersionId,
                sourceName: file.name,
                text: await file.text(),
              });
              setRunId(undefined);
            });
        }}
      />
    </label>
  ) : null;
  return (
    <TranscriptContext.Provider
      value={{ data, reveal: () => setExpanded(true) }}
    >
      <section
        aria-label="Transcript"
        className="grid gap-2 py-2 dark:bg-black dark:text-white [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_input]:bg-transparent"
      >
        {data?.transcript ? (
          <>
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="px-0">
                  Transcript · {data.transcript.sourceName}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ol className="max-h-64 overflow-y-auto divide-y divide-border">
                  {data.segments.map((segment) => (
                    <li
                      id={`transcript-${segment._id}`}
                      key={segment._id}
                      className="py-2 text-sm"
                    >
                      <span className="font-mono text-xs">
                        {formatReviewTimestamp(segment.startSeconds)}
                      </span>{" "}
                      {segment.text}
                    </li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>
            {canEdit ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={running}
                  onClick={() => void request("default")}
                >
                  Match ambiguous comments
                </Button>
                {run ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={running}
                    onClick={() => void request("better")}
                  >
                    Retry with better model
                  </Button>
                ) : null}
              </div>
            ) : null}
            {uploadControl}
          </>
        ) : (
          uploadControl
        )}
        {run ? (
          <p role="status" className="text-xs">
            {run.status === "queued" || run.status === "running"
              ? "Matching..."
              : run.status === "failed"
                ? "Matching failed. Check AI settings or retry."
                : "Matches ready"}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>
      {children}
    </TranscriptContext.Provider>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronRight, MessageCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  commentsForVersion,
  type MediaVersionComment,
  type MediaVersionSummary,
} from "@/features/media-version-comments/media-version-comments";

import {
  formatReviewTimestamp,
  parseReviewTimestamp,
} from "@/features/media-version-comments/review-timestamps";
import type { ReviewPlayer } from "@/components/review-video-player";

function commentDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : "Recently";
}

function CommentRow({
  comment,
  action,
  busy,
  onSeek,
}: {
  comment: MediaVersionComment;
  action?: () => Promise<void>;
  busy?: boolean;
  onSeek?: (seconds: number) => void;
}) {
  return (
    <article className="rounded-lg bg-[var(--surface-inset)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {comment.authorName}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-sm">
            {comment.resolved ? "Resolved" : "Open"}
          </Badge>
          <time
            className="text-xs text-muted-foreground"
            dateTime={comment.createdAt}
          >
            {commentDate(comment.createdAt)}
          </time>
        </div>
      </div>
      {comment.timestampSeconds !== undefined ? (
        onSeek ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onSeek(comment.timestampSeconds!)}
          >
            Jump to {formatReviewTimestamp(comment.timestampSeconds)}
          </Button>
        ) : (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            At {formatReviewTimestamp(comment.timestampSeconds)}
          </p>
        )
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {comment.body}
      </p>
      {action ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2 -ml-2.5"
          disabled={busy}
          onClick={() => void action()}
        >
          {comment.resolved ? (
            <RotateCcw aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {busy ? "Saving..." : comment.resolved ? "Reopen" : "Resolve"}
        </Button>
      ) : null}
    </article>
  );
}

export function PublicMediaVersionComments({
  versionId,
  player,
  supportsPlayerTimestamps = false,
  comments,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onSubmit,
  onReopen,
  busyCommentId,
  busy = false,
  loading = false,
  disabled = false,
}: {
  versionId: string;
  player?: ReviewPlayer;
  supportsPlayerTimestamps?: boolean;
  comments: readonly MediaVersionComment[];
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onSubmit: (body: string, timestampSeconds?: number) => Promise<void>;
  onReopen: (commentId: string) => Promise<void>;
  busyCommentId?: string;
  busy?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [timestamp, setTimestamp] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const currentComments = commentsForVersion(comments, versionId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      setError("Enter your display name before commenting.");
      return;
    }
    if (!body.trim()) {
      setError("Write a comment before sending it.");
      return;
    }
    setError("");
    try {
      await onSubmit(body.trim(), parseReviewTimestamp(timestamp));
      setTimestamp("");
      setBody("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add the comment."
      );
    }
  }

  async function reopen(commentId: string) {
    setError("");
    try {
      await onReopen(commentId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not reopen the comment."
      );
    }
  }

  return (
    <section aria-labelledby={`comments-${versionId}`} className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`comments-${versionId}`} className="text-sm font-semibold">
          Comments
        </h4>
        <span className="text-xs text-muted-foreground">
          {currentComments.length}{" "}
          {currentComments.length === 1 ? "thread" : "threads"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {supportsPlayerTimestamps
          ? "Display names are unverified. YouTube and Vimeo support playback timestamps."
          : "Display names are unverified. Enter timestamps manually for external links."}
      </p>
      {loading ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Loading comments...
        </p>
      ) : null}
      <div className="mt-3 grid gap-2">
        {currentComments.length ? (
          currentComments.map((comment) => (
            <CommentRow
              key={comment.id}
              onSeek={
                player
                  ? (seconds) => {
                      void player
                        .seekTo(seconds)
                        .catch(() =>
                          setError(
                            "Could not seek in this player. Use the timestamp shown on the comment."
                          )
                        );
                    }
                  : undefined
              }
              comment={comment}
              busy={busyCommentId === comment.id}
              action={
                comment.resolved && !disabled
                  ? () => reopen(comment.id)
                  : undefined
              }
            />
          ))
        ) : (
          <p className="rounded-lg bg-[var(--surface-inset)] p-3 text-sm text-muted-foreground">
            No comments on this version yet.
          </p>
        )}
      </div>
      {!disabled && !loading ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="mt-4 grid gap-3 rounded-lg bg-[var(--surface-inset)] p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label
              htmlFor={`comment-name-${versionId}`}
              className="text-sm font-medium"
            >
              Display name
            </Label>
            {displayName ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClearDisplayName}
              >
                Clear saved name
              </Button>
            ) : null}
          </div>
          <Input
            id={`comment-name-${versionId}`}
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            maxLength={120}
            autoComplete="name"
          />
          <Label
            htmlFor={`comment-time-${versionId}`}
            className="text-sm font-medium"
          >
            Timestamp (optional)
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`comment-time-${versionId}`}
              placeholder="m:ss or h:mm:ss"
              value={timestamp}
              onChange={(event) => setTimestamp(event.target.value)}
              className="max-w-48"
            />
            {player ? (
              <Button
                type="button"
                variant="outline"
                disabled={capturing || busy}
                onClick={() => {
                  setCapturing(true);
                  setError("");
                  void player
                    .getCurrentTime()
                    .then((seconds) => {
                      if (!Number.isFinite(seconds) || seconds < 0)
                        throw new Error("Invalid playback time");
                      setTimestamp(formatReviewTimestamp(seconds));
                    })
                    .catch(() =>
                      setError(
                        "Could not capture playback time. Enter a timestamp manually."
                      )
                    )
                    .finally(() => setCapturing(false));
                }}
              >
                {capturing ? "Capturing..." : "Use current time"}
              </Button>
            ) : null}
          </div>
          <Label
            htmlFor={`comment-body-${versionId}`}
            className="text-sm font-medium"
          >
            Comment
          </Label>
          <Textarea
            id={`comment-body-${versionId}`}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setError("");
            }}
            maxLength={2000}
            placeholder="Describe what needs attention"
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={!displayName.trim() || !body.trim() || busy}
          >
            {busy ? "Sending..." : "Add comment"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

export function MediaVersionComments({
  versions,
  comments,
  onResolve,
  loading = false,
  readOnly = false,
}: {
  versions: readonly MediaVersionSummary[];
  comments: readonly MediaVersionComment[];
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}) {
  const [busyCommentId, setBusyCommentId] = useState("");
  const [error, setError] = useState("");
  if (loading)
    return (
      <section aria-label="Media Version comments">
        <p role="status" className="text-sm text-muted-foreground">
          Loading review history...
        </p>
      </section>
    );
  if (!versions.length) return null;
  async function update(comment: MediaVersionComment) {
    if (!onResolve) return;
    setBusyCommentId(comment.id);
    setError("");
    try {
      await onResolve(comment.id, !comment.resolved);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update the comment."
      );
    } finally {
      setBusyCommentId("");
    }
  }
  return (
    <section
      data-testid="media-version-review-history"
      aria-labelledby="internal-media-comments"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="internal-media-comments" className="text-sm font-semibold">
          Review history
        </h3>
        <span className="text-xs text-muted-foreground">
          {comments.length} comments
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2">
        {versions.map((version) => {
          const versionComments = commentsForVersion(comments, version.id);
          const openByDefault =
            version.current ||
            versionComments.some((comment) => !comment.resolved);
          return (
            // Keyed on the default so it re-opens when a comment is reopened.
            <Collapsible
              key={`${version.id}-${openByDefault}`}
              defaultOpen={openByDefault}
            >
              <CollapsibleTrigger className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]">
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
                />

                <span className="font-medium">
                  v{version.versionNumber} · {version.label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {version.current ? "Current" : "Internal history"} ·{" "}
                  {versionComments.length}{" "}
                  {versionComments.length === 1 ? "comment" : "comments"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-2 pt-2">
                {versionComments.length ? (
                  versionComments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      busy={busyCommentId === comment.id}
                      action={
                        !readOnly && onResolve
                          ? () => update(comment)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No comments on this version.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}

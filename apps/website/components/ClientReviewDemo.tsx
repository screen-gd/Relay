"use client";

import Image from "next/image";
import {
  ChatCircleIcon,
  CheckIcon,
  LinkSimpleIcon,
  LockKeyIcon,
  PauseIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import chapter from "./features/chapter.module.css";
import DemoDialog from "./features/DemoDialog";
import ui from "./features/app-ui.module.css";
import styles from "./ClientReviewDemo.module.css";
import FrameNotes, { type FrameMark } from "./features/FrameNotes";
import AnimatedList from "./react-bits/AnimatedList";
import Reveal from "./site/Reveal";
import SectionHeading from "./site/SectionHeading";

const heading = {
  title: "Client reviews without accounts.",
  description:
    "Share one link. Clients watch, comment on the exact moment, and approve.",
};

const facts = [
  {
    icon: LockKeyIcon,
    title: "Password-protected links",
    text: "Clients open the link and review. No account needed.",
  },
  {
    icon: ChatCircleIcon,
    title: "Timestamped comments",
    text: "YouTube and Vimeo comments land on the exact moment.",
  },
  {
    icon: LinkSimpleIcon,
    title: "Drive and Dropbox",
    text: "General comments and manual timestamps on linked files.",
  },
] as const;

type ReviewComment = {
  id: number;
  author: string;
  avatar: string;
  time: string;
  text: string;
  seconds: number;
  marks?: readonly FrameMark[];
};
const initialComments: ReviewComment[] = [
  {
    id: 1,
    author: "Maya Chen",
    avatar: "/avatars/maya-chen.jpg",
    time: "00:04",
    text: "Hold this shot a little longer.",
    seconds: 4,
  },
  {
    id: 2,
    author: "Jordan Patel",
    avatar: "/avatars/jordan-patel.jpg",
    time: "00:09",
    text: "Love the pace here.",
    seconds: 9,
  },
  {
    id: 3,
    author: "Alex Rivera",
    avatar: "/avatars/alex-rivera.jpg",
    time: "00:14",
    text: "Let's brighten the midtones just a touch.",
    seconds: 14,
  },
  {
    id: 4,
    author: "Samir Khan",
    avatar: "/avatars/samir-khan.jpg",
    time: "00:20",
    text: "Can we soften the highlights on the road?",
    seconds: 20,
  },
];

const formatTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return `${Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
};

const clampTime = (seconds: number, duration: number) => {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.min(safeSeconds, safeDuration || safeSeconds);
};

/**
 * Interactive sample of the client review page: a 16:9 player with comment
 * markers on its timeline, a comment list that seeks the video, and an
 * approve button. Used on the home page and, with `variant="chapter"`, as a
 * framed chapter on /features.
 */
export default function ClientReviewDemo({ variant }: { variant?: "chapter" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [commentId, setCommentId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [approved, setApproved] = useState(false);
  const version = "v4";
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [postedComments, setComments] = useState(initialComments);
  const [displayName, setDisplayName] = useState("Maya Chen");
  const [manualTime, setManualTime] = useState("");
  const [commentError, setCommentError] = useState("");
  const [marks, setMarks] = useState<FrameMark[]>([]);
  const comments = postedComments;
  const readOnly = approved;
  const [draft, setDraft] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const comment = comments.find((item) => item.id === commentId);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const syncDuration = (video: HTMLVideoElement) => {
    const nextDuration = video.duration;
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;

    setDuration(nextDuration);
    setCurrentTime((time) => clampTime(time, nextDuration));
  };

  useEffect(() => {
    // Metadata can already be cached by the time React attaches the element.
    const video = videoRef.current;
    if (video) syncDuration(video);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.35) {
          video.pause();
        }
      },
      { threshold: [0, 0.35, 0.75] }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    setPlaybackError(false);
    if (video.paused || video.ended) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
        setPlaybackError(true);
      }
    } else {
      video.pause();
    }
  };

  const selectComment = async (id: number, seconds: number) => {
    const video = videoRef.current;
    const nextTime = clampTime(seconds, duration || video?.duration || 0);
    setCommentId(id);
    setCurrentTime(nextTime);
    if (!video || !Number.isFinite(nextTime)) return;

    setPlaybackError(false);
    video.pause();
    video.currentTime = nextTime;
    if (variant === "chapter") return;
    try {
      await video.play();
    } catch {
      setPlaying(false);
      setPlaybackError(true);
    }
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    const nextTime = clampTime(seconds, duration || video?.duration || 0);
    setCurrentTime(nextTime);
    if (video && Number.isFinite(nextTime)) video.currentTime = nextTime;
  };

  const resetReview = () => {
    setApproved(false);
    setComments(initialComments);
    setDraft("");
    setMarks([]);
    setManualTime("");
    setCommentId(null);
    videoRef.current?.pause();
    seek(0);
  };

  return (
    <section
      className={`story-section review-story ${variant === "chapter" ? chapter.chapter : ""}`}
      id="client-review"
      aria-labelledby="client-review-title"
    >
      {variant === "chapter" ? (
        <Reveal className={chapter.head}>
          <h2 className={chapter.title} id="client-review-title">
            {heading.title}
          </h2>
          <p>{heading.description}</p>
        </Reveal>
      ) : (
        <SectionHeading
          id="client-review-title"
          title={heading.title}
          description={heading.description}
          align="center"
        />
      )}

      <Reveal className="review-room" delay={0.1}>
        <div className="review-room-bar">
          <div className="review-room-title">
            <Image
              src="/brand/relay/mark-accent.svg"
              alt=""
              width={20}
              height={20}
            />
            <i aria-hidden="true" />
            <b>Summer launch film</b>
            <span className="review-version">{version}</span>
          </div>
          <button
            className="review-approve"
            type="button"
            aria-pressed={approved}
            disabled={approved}
            onClick={() => setConfirmApproval(true)}
          >
            {approved ? (
              <>
                <CheckIcon size={15} aria-hidden="true" /> Approved
              </>
            ) : (
              "Approve version"
            )}
          </button>
          {approved && (
            <button
              className={ui.textButton}
              type="button"
              onClick={resetReview}
            >
              Reset demo
            </button>
          )}
        </div>

        <div className="review-room-grid">
          <div className="review-player">
            <div
              className="review-video-stage"
              role="button"
              tabIndex={0}
              aria-label={playing ? "Pause video" : "Play video"}
              onClick={() => void togglePlayback()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void togglePlayback();
                }
              }}
            >
              <video
                aria-label="Sample client review video"
                ref={videoRef}
                src="/api/client-review-video"
                preload="metadata"
                playsInline
                muted={muted}
                onPlay={() => {
                  setPlaybackError(false);
                  setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={() => {
                  setPlaying(false);
                  setPlaybackError(true);
                }}
                onTimeUpdate={(event) => {
                  const video = event.currentTarget;
                  // Some browsers report duration=0 for loadedmetadata and only
                  // expose the real value after playback starts.
                  syncDuration(video);
                  const nextTime = clampTime(video.currentTime, video.duration);
                  setCurrentTime(nextTime);
                  const timedComment = comments.findLast(
                    (item) => nextTime >= item.seconds
                  );
                  setCommentId(timedComment?.id ?? null);
                }}
                onSeeked={(event) =>
                  setCurrentTime(
                    clampTime(
                      event.currentTarget.currentTime,
                      event.currentTarget.duration
                    )
                  )
                }
                onLoadedMetadata={(event) => syncDuration(event.currentTarget)}
                onDurationChange={(event) => syncDuration(event.currentTarget)}
                onCanPlay={(event) => syncDuration(event.currentTarget)}
              />
              {!playing && (
                <div className="review-play-overlay" aria-hidden="true">
                  <span>
                    <PlayIcon size={24} weight="fill" />
                  </span>
                </div>
              )}
              {comment && (
                <div className="frame-note">
                  <span>
                    {comment.time} · {comment.author}
                  </span>
                  {comment.text}
                </div>
              )}
              {playbackError && (
                <p className="review-error" role="status" aria-live="polite">
                  The video could not be played. Try again.
                </p>
              )}
            </div>

            <div className="review-controls">
              <button
                className="review-icon-button"
                type="button"
                aria-label={playing ? "Pause video" : "Play video"}
                onClick={() => void togglePlayback()}
              >
                {playing ? (
                  <PauseIcon size={16} weight="fill" />
                ) : (
                  <PlayIcon size={16} weight="fill" />
                )}
              </button>
              <span>{formatTime(currentTime)}</span>
              <div className="review-timeline">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={0.1}
                  value={Math.min(currentTime, duration > 0 ? duration : 1)}
                  disabled={duration <= 0}
                  aria-label="Video position"
                  style={{ "--progress": `${progress}%` } as CSSProperties}
                  onChange={(event) => seek(Number(event.currentTarget.value))}
                />
                {duration > 0 &&
                  comments.map((item) => (
                    <button
                      key={item.id}
                      className={`review-marker ${item.id === commentId ? "is-active" : ""}`}
                      type="button"
                      aria-label={`Jump to ${item.author}'s comment at ${item.time}`}
                      style={{ left: `${(item.seconds / duration) * 100}%` }}
                      onClick={() => void selectComment(item.id, item.seconds)}
                    />
                  ))}
              </div>
              <span>{formatTime(duration)}</span>
              <button
                className="review-icon-button"
                type="button"
                aria-label={muted ? "Unmute video" : "Mute video"}
                aria-pressed={muted}
                onClick={() => setMuted((value) => !value)}
              >
                {muted ? (
                  <SpeakerSlashIcon size={16} />
                ) : (
                  <SpeakerHighIcon size={16} />
                )}
              </button>
            </div>
            {variant === "chapter" && (
              <FrameNotes
                marks={marks}
                onChange={(nextMarks) => {
                  setMarks(nextMarks);
                  setCommentId(null);
                }}
                preview={comment?.marks}
                disabled={readOnly}
              />
            )}
          </div>

          <aside
            className="review-comments"
            aria-label="Client review comments"
          >
            <header>
              <span>Comments</span>
              <small>{comments.length}</small>
            </header>
            <AnimatedList
              disableAnimation={variant === "chapter"}
              className="review-comment-list"
              items={comments}
              selectedIndex={comments.findIndex(
                (item) => item.id === commentId
              )}
              getKey={(item) => item.id}
              onItemSelect={(item) => void selectComment(item.id, item.seconds)}
              renderItem={(item, _index, selected) => (
                <button
                  className={selected ? "is-active" : ""}
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => void selectComment(item.id, item.seconds)}
                >
                  <Image
                    className="review-avatar"
                    src={item.avatar}
                    alt=""
                    width={32}
                    height={32}
                  />
                  <span>
                    <span className="review-comment-meta">
                      <b>{item.author}</b>
                      <time>{item.time}</time>
                    </span>
                    <p>{item.text}</p>
                  </span>
                </button>
              )}
            />
            {readOnly ? (
              <p className={styles.locked} role="status">
                Approved · This version is read only.
              </p>
            ) : (
              <div className={styles.commentAction}>
                <button
                  className={ui.button}
                  type="button"
                  onClick={() => {
                    videoRef.current?.pause();
                    setCommentComposerOpen(true);
                  }}
                >
                  Leave a comment
                </button>
              </div>
            )}
          </aside>
        </div>
      </Reveal>

      <DemoDialog
        open={commentComposerOpen && !readOnly}
        onOpenChange={setCommentComposerOpen}
        title={"Comment at " + formatTime(currentTime)}
      >
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            if (variant === "chapter" && !displayName.trim()) {
              setCommentError("Enter your display name before commenting.");
              return;
            }
            const timestampParts = manualTime.trim().split(":");
            if (
              manualTime.trim() &&
              !/^\d+(:[0-5]\d){1,2}$/.test(manualTime.trim())
            ) {
              setCommentError("Use a timestamp such as 0:04 or 1:02:30.");
              return;
            }
            const enteredSeconds = timestampParts.reduce(
              (total, part) => total * 60 + Number(part),
              0
            );
            if (manualTime.trim() && !Number.isSafeInteger(enteredSeconds)) {
              setCommentError(
                "Enter a valid timestamp within this sample video."
              );
              return;
            }
            if (
              manualTime.trim() &&
              duration > 0 &&
              enteredSeconds > duration
            ) {
              setCommentError("Use a timestamp within this sample video.");
              return;
            }
            setCommentError("");
            const id = Math.max(...comments.map((item) => item.id)) + 1;
            const seconds = manualTime.trim()
              ? enteredSeconds
              : Math.floor(currentTime);
            setComments((current) =>
              [
                ...current,
                {
                  id,
                  author: variant === "chapter" ? displayName.trim() : "You",
                  avatar: "/avatars/maya-chen.jpg",
                  time: formatTime(seconds),
                  text,
                  seconds,
                  marks: [...marks],
                },
              ].sort((a, b) => a.seconds - b.seconds)
            );
            setCommentId(id);
            setDraft("");
            setManualTime("");
            setMarks([]);
            setCommentComposerOpen(false);
          }}
        >
          {variant === "chapter" && (
            <>
              <div className={styles.nameLabel}>
                <span>Display name</span>
                <button
                  type="button"
                  className={ui.textButton}
                  onClick={() => setDisplayName("")}
                >
                  Clear saved name
                </button>
              </div>
              <input
                className={ui.input}
                aria-label="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
              />
              <label className={ui.field}>
                Timestamp (optional)
                <span className={styles.timestampRow}>
                  <input
                    className={ui.input}
                    value={manualTime}
                    onChange={(event) => setManualTime(event.target.value)}
                    placeholder="m:ss or h:mm:ss"
                  />
                  <button
                    className={ui.button}
                    type="button"
                    onClick={() => setManualTime(formatTime(currentTime))}
                  >
                    Use current time
                  </button>
                </span>
              </label>
            </>
          )}
          <label className={ui.field}>
            {variant === "chapter"
              ? "Comment"
              : "Comment at " + formatTime(currentTime)}
            <textarea
              className={ui.input}
              value={draft}
              onFocus={() => videoRef.current?.pause()}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Leave feedback on this moment…"
              required
              maxLength={1000}
              rows={2}
            />
          </label>
          <button type="submit" className={ui.button} disabled={!draft.trim()}>
            Post comment
          </button>
          {commentError && <p role="alert">{commentError}</p>}
          <small role="status">
            Sample review. Comments stay in this page.
          </small>
        </form>
      </DemoDialog>

      <DemoDialog
        open={confirmApproval}
        onOpenChange={setConfirmApproval}
        title="Approve Summer launch v4?"
      >
        <p>
          This locks the version against further comments. You can reset this
          sample to try again.
        </p>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="button"
          onClick={() => {
            setApproved(true);
            setConfirmApproval(false);
            videoRef.current?.pause();
          }}
        >
          Approve version
        </button>
      </DemoDialog>

      <div className="box-grid-frame is-facts">
        <ul className="box-grid">
          {facts.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <Reveal delay={0.15 + index * 0.05}>
                <Icon size={20} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

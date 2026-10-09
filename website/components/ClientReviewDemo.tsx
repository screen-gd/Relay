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

const comments = [
  {
    id: 1,
    author: "Maya Chen",
    avatar: "/avatars/maya-chen.jpg",
    time: "00:04",
    text: "Can we hold this shot for half a second longer?",
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
] as const;

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
            <span className="review-version">v4</span>
          </div>
          <button
            className="review-approve"
            type="button"
            aria-pressed={approved}
            onClick={() => setApproved((value) => !value)}
          >
            {approved ? (
              <>
                <CheckIcon size={15} aria-hidden="true" /> Approved
              </>
            ) : (
              "Approve v4"
            )}
          </button>
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
                src="/videos/client-review-city.mp4"
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
                {muted ? <SpeakerSlashIcon size={16} /> : <SpeakerHighIcon size={16} />}
              </button>
            </div>
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
          </aside>
        </div>
      </Reveal>

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

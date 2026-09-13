"use client";

import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AnimatedList from "./react-bits/AnimatedList";
import ElasticSlider from "./ElasticSlider";

const comments = [
  {
    id: 1,
    author: "Maya Chen",
    time: "00:04",
    text: "Can we hold this shot for half a second longer?",
    seconds: 4,
  },
  {
    id: 2,
    author: "Jordan Patel",
    time: "00:09",
    text: "Love the pace here.",
    seconds: 9,
  },
  {
    id: 3,
    author: "Alex Rivera",
    time: "00:14",
    text: "Let's brighten the midtones just a touch.",
    seconds: 14,
  },
  {
    id: 4,
    author: "Samir Khan",
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

export default function ClientReviewDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [commentId, setCommentId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const comment = comments.find((item) => item.id === commentId);

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
    if (!video) return;

    video.volume = volume;
    video.muted = volume === 0;
  }, [volume]);

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
      className="story-section review-story"
      id="client-review"
      aria-label="Client review"
    >
      <div className="review-heading">
        <h2 className="story-title">Client reviews without accounts.</h2>
        <p>
          Clients open a password-protected shared link, with no account needed.
          They can comment on uploaded videos, but not embedded videos.
        </p>
      </div>

      <div className="review-room">
        <div className="review-room-bar">
          <span>
            <Image
              src="/brand/relay/mark-accent.svg"
              alt=""
              width={20}
              height={20}
            />
            Relay
          </span>
          <strong>Demo / v4 client review</strong>
          <span>{comments.length} comments</span>
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
                muted={volume === 0}
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
              {comment && (
                <div className="frame-note">
                  <span>
                    {comment.time} · {comment.author}
                  </span>
                  {comment.text}
                </div>
              )}
              <div className="review-controls">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={0.1}
                  value={Math.min(currentTime, duration > 0 ? duration : 1)}
                  disabled={duration <= 0}
                  aria-label="Video position"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => seek(Number(event.currentTarget.value))}
                />
                <span>{formatTime(duration)}</span>
              </div>
              {playbackError && (
                <p role="status" aria-live="polite">
                  The video could not be played. Try again.
                </p>
              )}
            </div>
            <div className="review-volume" aria-label="Video volume">
              <span className="review-volume-label">Volume</span>
              <ElasticSlider
                className="review-volume-slider"
                defaultValue={volume * 100}
                maxValue={100}
                leftIcon={<VolumeX size={14} />}
                rightIcon={<Volume2 size={14} />}
                onValueChange={(value) => setVolume(value / 100)}
              />
            </div>
          </div>
          <aside
            className="review-comments"
            aria-label="Client review comments"
          >
            <header>
              <span>Comments</span>
              <small>{comments.length} open</small>
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
                  <span>
                    {item.author}
                    <small>
                      {selected && playing ? "Playing · " : ""}
                      {item.time}
                    </small>
                  </span>
                  <p>{item.text}</p>
                </button>
              )}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

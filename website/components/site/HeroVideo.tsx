"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";

export type HeroVideoSource = { src: string; poster?: string };

/** Share of the frame that must be on screen before the showcase plays. */
const VISIBLE_AMOUNT = 0.8;

/** Why the showcase is running or not: the visitor's choice, or the page's. */
type PlaybackMode = "auto" | "play" | "pause";

/**
 * 16:9 product video frame under the home hero. With `video` it plays as a
 * silent, looping showcase once at least 80% of the frame is in view, and
 * pauses when it scrolls away. There is no audio and no autoplay for visitors
 * who prefer reduced motion; those visitors start it with the frame's control.
 * The control is a real button, so it works by keyboard and by click, and it
 * always shows what the video is actually doing. Styled by `.hero-video` and
 * `.hero-video-media` in globals.css.
 */
export default function HeroVideo({ video }: { video?: HeroVideoSource }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<PlaybackMode>("auto");
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  // A toggle choice wins; the page plays the showcase only when 80% is visible.
  const shouldPlay =
    mode === "auto" ? inView && !reducedMotion : mode === "play";

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !video) return;
    // One threshold: the observer reports as the frame crosses 80% visible and
    // the ratio in the entry tells us which side it landed on.
    const observer = new IntersectionObserver(
      (entries) => {
        const ratio = entries[0].intersectionRatio;
        setInView(ratio >= VISIBLE_AMOUNT);
        // A deliberate play lasts while the frame stays in view. Scrolling it
        // away hands playback back to the page, so nothing runs off screen.
        if (ratio < VISIBLE_AMOUNT) {
          setMode((current) => (current === "play" ? "auto" : current));
        }
      },
      { threshold: VISIBLE_AMOUNT }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [video]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (shouldPlay) void element.play().catch(() => undefined);
    else element.pause();
  }, [shouldPlay]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const sync = () => setPlaying(!element.paused);
    sync();
    element.addEventListener("play", sync);
    element.addEventListener("pause", sync);
    return () => {
      element.removeEventListener("play", sync);
      element.removeEventListener("pause", sync);
    };
  }, []);

  if (video) {
    return (
      <div className="hero-video is-showcase">
        <video
          ref={ref}
          className="hero-video-media"
          src={video.src}
          poster={video.poster}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-label="Relay product walkthrough"
        />
        <button
          type="button"
          className="hero-video-toggle"
          onClick={() => setMode(playing ? "pause" : "play")}
          aria-label={
            playing
              ? "Pause the product walkthrough"
              : "Play the product walkthrough"
          }
        >
          {playing ? (
            <PauseIcon size={16} aria-hidden="true" />
          ) : (
            <PlayIcon size={16} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className="hero-video is-placeholder"
      role="img"
      aria-label="Product video placeholder"
    >
      <span className="hero-video-play" aria-hidden="true">
        <PlayIcon size={28} weight="fill" />
      </span>
      <p>Product walkthrough coming soon</p>
    </div>
  );
}

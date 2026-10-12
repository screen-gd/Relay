"use client";

import { PlayIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useRef } from "react";

export type HeroVideoSource = { src: string; poster?: string };

/**
 * 16:9 product video frame under the home hero. With `video` it plays as a
 * silent, looping showcase: muted (the file has no audio track), no controls,
 * and not clickable. Visitors who prefer reduced motion see the paused poster.
 * Without `video` it shows a placeholder. Styled by `.hero-video` in
 * globals.css.
 */
export default function HeroVideo({ video }: { video?: HeroVideoSource }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (query.matches) element.pause();
      else void element.play().catch(() => undefined);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  if (video) {
    return (
      <video
        ref={ref}
        className="hero-video is-showcase"
        src={video.src}
        poster={video.poster}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        aria-label="Relay product walkthrough"
      />
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

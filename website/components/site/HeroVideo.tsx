import { Play } from "lucide-react";

export type HeroVideoSource = { src: string; poster?: string };

/**
 * 16:9 product video frame under the home hero. Without `video` it shows a
 * placeholder; pass e.g. `video={{ src: "/videos/relay-walkthrough.mp4" }}`
 * once the walkthrough is recorded. Styled by `.hero-video` in globals.css.
 */
export default function HeroVideo({ video }: { video?: HeroVideoSource }) {
  if (video) {
    return (
      <video
        className="hero-video"
        src={video.src}
        poster={video.poster}
        controls
        playsInline
        preload="metadata"
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
        <Play size={28} fill="currentColor" />
      </span>
      <p>Product walkthrough coming soon</p>
    </div>
  );
}

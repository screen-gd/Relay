import type { ComponentProps } from "react";
import { BlurFade } from "@/components/ui/blur-fade";

/**
 * The site's one entrance animation: Magic UI Blur Fade with shared defaults
 * (rise 12px, 4px blur, plays once when scrolled into view). Pass
 * `inView={false}` for above-the-fold content that should play on load.
 */
export default function Reveal(props: ComponentProps<typeof BlurFade>) {
  return (
    <BlurFade
      inView
      direction="up"
      offset={12}
      blur="4px"
      duration={0.5}
      {...props}
    />
  );
}

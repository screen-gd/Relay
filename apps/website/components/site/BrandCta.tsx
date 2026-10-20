import { APP_URL } from "../../lib/links";
import type { Rgb } from "@/components/dither-kit/palette";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import Grainient from "../react-bits/Grainient";
import DitherOverlay from "./DitherOverlay";
import Reveal from "./Reveal";

/** Dark ink for the fine dither over the shader (matches its darkest stop). */
const DITHER_INK: Rgb = [12, 15, 8];

/**
 * Closing brand card shown above the footer on every page (rendered in the
 * root layout). Always dark in both themes, filled with the React Bits
 * Grainient shader in acid lime and deep greens, with a fine dark dither
 * rising from the bottom edge. A static CSS gradient underneath covers the
 * moment before WebGL starts and browsers without it. Styled by `.brand-cta`.
 */
export default function BrandCta() {
  return (
    <section className="brand-cta-section" aria-labelledby="brand-cta-title">
      <Reveal className="container">
        <div className="brand-cta">
          <div className="brand-cta-shader" aria-hidden="true">
            <Grainient
              color1="#c6ff00"
              color2="#2f5a00"
              color3="#0c0f08"
              timeSpeed={0.12}
              colorBalance={-0.05}
              warpStrength={0.8}
              warpFrequency={4}
              warpSpeed={1.4}
              warpAmplitude={60}
              blendAngle={-20}
              blendSoftness={0.25}
              rotationAmount={380}
              grainAmount={0.06}
              contrast={1.25}
              saturation={0.95}
              zoom={0.85}
            />
            <DitherOverlay color={DITHER_INK} alpha={0.55} maxDensity={0.55} />
          </div>
          <h2 id="brand-cta-title">
            <span>Every client project in one place.</span>{" "}
            <span>Start free today.</span>
          </h2>
          <InteractiveHoverButton href={APP_URL} variant="brand" size="lg">
            Get started free
          </InteractiveHoverButton>
        </div>
      </Reveal>
    </section>
  );
}

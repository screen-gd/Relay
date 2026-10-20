"use client";

import { useEffect, useRef } from "react";
import type { Rgb } from "@/components/dither-kit/palette";
import { paintDither } from "./dither";

/** Dither cell size in CSS px. */
const CELL = 1.5;
/** Share of cells lit at the outer screen edge; the fade runs down from it. */
const MAX_DENSITY = 0.55;
/** Bends the fade so it drops off quickly away from the screen edge. */
const FALLOFF = 1.6;
/** Sides narrower than this get no dither. */
const MIN_SIDE = 32;

/** One dither color per theme. Light mode needs a stronger, deeper green to
 * show on white. */
const TONES: Record<"dark" | "light", { color: Rgb; alpha: number }> = {
  dark: { color: [198, 255, 0], alpha: 0.12 },
  light: { color: [92, 138, 0], alpha: 0.32 },
};

/** Reads the content frame width from the `--frame` CSS token. */
function frameWidth(): number {
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--frame")
  );
  return Number.isFinite(value) ? value : 1200;
}

/**
 * Page background texture: a faint single-color ordered-dither fade in the
 * two side areas outside the content rails, densest at each screen edge,
 * gone at the rail, slightly stronger toward the bottom of the screen.
 * Fixed to the viewport, so only the middle content scrolls. Static:
 * repaints only when the viewport size, display scaling, or theme changes.
 * Rendered first in <body>; styled by `.dither-backdrop`.
 */
export default function DitherBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!wrap || !left || !right) return;

    let frame = 0;
    let painted = "";

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = wrap.clientWidth;
        const height = wrap.clientHeight;
        const dark = document.documentElement.classList.contains("dark");
        const key = `${width}x${height}@${window.devicePixelRatio}:${dark}`;
        if (key === painted) return;
        painted = key;

        const rawSide = Math.floor((width - frameWidth()) / 2);
        const side = rawSide < MIN_SIDE ? 0 : rawSide;
        const tone = TONES[dark ? "dark" : "light"];
        // `edge` is 1 at the outer screen edge and 0 at the rail.
        const fade = (edge: number, v: number) =>
          MAX_DENSITY * Math.pow(edge, FALLOFF) * (0.6 + 0.4 * v);
        paintDither(left, side, height, {
          cell: CELL,
          ...tone,
          density: (u, v) => fade(1 - u, v),
        });
        paintDither(right, side, height, {
          cell: CELL,
          ...tone,
          density: (u, v) => fade(u, v),
        });
      });
    };

    schedule();
    const resize = new ResizeObserver(schedule);
    resize.observe(wrap);
    // Display scaling changes (zoom, moving screens) don't always resize.
    window.addEventListener("resize", schedule);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("resize", schedule);
      theme.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="dither-backdrop" aria-hidden="true">
      <canvas ref={leftRef} className="is-left" />
      <canvas ref={rightRef} className="is-right" />
    </div>
  );
}

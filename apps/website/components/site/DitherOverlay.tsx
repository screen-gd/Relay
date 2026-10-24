"use client";

import { useEffect, useRef } from "react";
import type { Rgb } from "@/components/dither-kit/palette";
import { paintDither } from "./dither";

/**
 * A fine ordered-dither texture that fills its nearest positioned ancestor.
 * Densest along the bottom edge, fading out by the top. Static: repaints
 * only when its box or display scaling changes. Styled by `.dither-overlay`.
 */
export default function DitherOverlay({
  color,
  alpha,
  maxDensity = 0.5,
  cell = 1.5,
}: {
  color: Rgb;
  alpha: number;
  /** Share of cells lit along the bottom edge. */
  maxDensity?: number;
  /** Cell size in CSS px. */
  cell?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;

    let frame = 0;
    let painted = "";
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { clientWidth: width, clientHeight: height } = box;
        const key = `${width}x${height}@${window.devicePixelRatio}`;
        if (key === painted) return;
        painted = key;
        paintDither(canvas, width, height, {
          cell,
          color,
          alpha,
          density: (_u, v) => maxDensity * Math.pow(v, 1.5),
        });
      });
    };

    schedule();
    const resize = new ResizeObserver(schedule);
    resize.observe(box);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("resize", schedule);
    };
    // Pass `color` as a stable (module-level) tuple to avoid repaints.
  }, [color, alpha, maxDensity, cell]);

  return (
    <canvas ref={canvasRef} className="dither-overlay" aria-hidden="true" />
  );
}

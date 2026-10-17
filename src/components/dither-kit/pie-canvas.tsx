"use client";

import { useEffect, useRef } from "react";
import { backingSize, BAYER, OFF_TIER } from "./dither-paint";
import { rgb } from "./palette";
import { sliceAtAngle } from "./polar";
import { usePolarChart } from "./polar-context";

/** Draw the full pie or donut; hover changes its fill without moving slices. */
export function PieCanvas() {
  const ctx = usePolarChart();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = ctx.plot;
  const { cols, rows } = backingSize(width, height);

  useEffect(() => {
    const canvas = canvasRef.current;
    const paint = canvas?.getContext("2d");
    if (!canvas || !paint) return;
    if (canvas.width !== cols) canvas.width = cols;
    if (canvas.height !== rows) canvas.height = rows;
    paint.clearRect(0, 0, cols, rows);
    if (!ctx.ready || !ctx.pie) return;
    const emphasis = ctx.selectedDataKey ?? ctx.focusDataKey;
    for (let row = 0; row < rows; row++) {
      const py = ((row + 0.5) * height) / rows;
      for (let column = 0; column < cols; column++) {
        const px = ((column + 0.5) * width) / cols;
        const dx = px - ctx.center.x;
        const dy = py - ctx.center.y;
        const radius = Math.hypot(dx, dy);
        if (radius < ctx.innerRadius || radius > ctx.outerRadius) continue;
        const index = sliceAtAngle(ctx.pie, Math.atan2(dy, dx));
        const slice = ctx.pie[index];
        if (!slice) continue;
        const seed = ctx.seedOf(slice.name);
        const dim = emphasis !== null && emphasis !== slice.name ? 0.3 : 1;
        if (ctx.outerRadius - radius < 1.4) {
          paint.fillStyle = rgb(seed.fill, 1, dim);
          paint.fillRect(column, row, 1, 1);
          continue;
        }
        const variant = ctx.variantOf(slice.name);
        if (variant === "hatched" && ((column + row) & 3) >= 2) continue;
        const density =
          (radius - ctx.innerRadius) /
          Math.max(ctx.outerRadius - ctx.innerRadius, 1);
        const bias = variant === "dotted" ? 0.12 : 0;
        const active = ctx.hoverIndex === index;
        const lit =
          variant === "solid" || density > BAYER[row & 3][column & 3] - bias;
        if (variant === "dotted" && !lit) continue;
        const alpha = Math.min(
          1,
          (0.35 + density * 0.65) *
            (active ? 1.22 : 1) *
            (lit ? 1 : OFF_TIER) *
            dim
        );
        paint.fillStyle = rgb(seed.fill, 1, alpha);
        paint.fillRect(column, row, 1, 1);
      }
    }
  }, [ctx, cols, rows, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        left: ctx.margins.left,
        top: ctx.margins.top,
        width,
        height,
        imageRendering: "pixelated",
      }}
    />
  );
}

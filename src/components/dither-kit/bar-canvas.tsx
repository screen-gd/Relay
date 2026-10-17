"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChart } from "./chart-context";
import { backingSize, paintColumn } from "./dither-paint";

type Bars = { top: number[]; base: number[] };

/** Static grouped or stacked bars; pointer and selection changes redraw once. */
export function BarCanvas() {
  const ctx = useChart();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = ctx.plot;
  const { cols, rows } = backingSize(width, height);
  const { ready, configKeys, bands, y } = ctx;
  const targets = useMemo(() => {
    const bars: Record<string, Bars> = {};
    if (!ready) return bars;
    for (const key of configKeys) {
      const band = bands[key];
      if (!band) continue;
      bars[key] = {
        top: band.map((point) => (y(point[1]) / (height || 1)) * (rows - 1)),
        base: band.map((point) => (y(point[0]) / (height || 1)) * (rows - 1)),
      };
    }
    return bars;
  }, [ready, configKeys, bands, y, height, rows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const paint = canvas?.getContext("2d");
    if (!canvas || !paint) return;
    if (canvas.width !== cols) canvas.width = cols;
    if (canvas.height !== rows) canvas.height = rows;
    paint.clearRect(0, 0, cols, rows);
    if (!ctx.ready) return;
    const stacked = ctx.stackType === "stacked" || ctx.stackType === "percent";
    const emphasis = ctx.selectedDataKey ?? ctx.focusDataKey;
    const scale = cols / Math.max(width, 1);
    ctx.configKeys.forEach((key, seriesIndex) => {
      const bars = targets[key];
      if (!bars) return;
      const seed = ctx.seedOf(key);
      const selectionDim = emphasis !== null && emphasis !== key ? 0.3 : 1;
      for (let index = 0; index < ctx.dataLength; index++) {
        const top = bars.top[index] ?? rows - 1;
        const base = bars.base[index] ?? rows - 1;
        const active = ctx.hoverIndex === index;
        const hoverDim =
          ctx.hoverIndex !== null && !active && ctx.isMouseInChart ? 0.5 : 1;
        const slot = ctx.barSlot(index, seriesIndex, ctx.configKeys.length);
        const first = Math.max(0, Math.round(slot.x * scale));
        const last = Math.min(cols, Math.round((slot.x + slot.width) * scale));
        for (let column = first; column < last; column++) {
          paintColumn(
            paint,
            column,
            Math.min(top, base),
            Math.max(top, base),
            seed,
            {
              variant: ctx.seriesSpecs[key]?.variant ?? "gradient",
              intensity: ctx.isMouseInChart || ctx.hovered ? 1 : 0,
              dim: selectionDim * hoverDim,
              stacked,
            }
          );
        }
      }
    });
  }, [ctx, targets, cols, rows, width]);

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

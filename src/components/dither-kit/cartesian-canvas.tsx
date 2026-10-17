"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChart } from "./chart-context";
import { backingSize, paintColumn, resample } from "./dither-paint";
import { rgb } from "./palette";
import { MAX_BAND_STEP } from "./scales";

type Surface = { top: number[]; floor: number[] };

/** Draw the current data and scrub marker once per input change. */
export function CartesianCanvas() {
  const ctx = useChart();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = ctx.plot;
  const { cols, rows } = backingSize(width, height);
  const {
    ready,
    chartType,
    configKeys,
    bands,
    seriesSpecs,
    y,
    dataLength,
    xCenter,
  } = ctx;
  // Where the series lives horizontally. A lone category has no width of its
  // own, so it is capped like a bar rather than stretched over the plot.
  const span = useMemo(() => {
    const count = Math.max(dataLength, 1);
    const first = xCenter(0) ?? 0;
    if (count < 2)
      return {
        start: first - MAX_BAND_STEP / 2,
        end: first + MAX_BAND_STEP / 2,
        width,
      };
    return { start: first, end: xCenter(count - 1) ?? width, width };
  }, [dataLength, xCenter, width]);
  const targets = useMemo(() => {
    const surfaces: Record<string, Surface> = {};
    if (!ready) return surfaces;
    const plotHeight = height || 1;
    for (const key of configKeys) {
      const band = bands[key];
      if (!band) continue;
      const line =
        (seriesSpecs[key]?.kind ?? (chartType === "line" ? "line" : "area")) ===
        "line";
      const top = band.map((point) => (y(point[1]) / plotHeight) * (rows - 1));
      const floor = band.map((point, index) =>
        line ? top[index] : (y(point[0]) / plotHeight) * (rows - 1)
      );
      surfaces[key] = {
        top: resample(top, cols, span),
        floor: resample(floor, cols, span),
      };
    }
    return surfaces;
  }, [
    ready,
    chartType,
    configKeys,
    bands,
    seriesSpecs,
    y,
    height,
    rows,
    cols,
    span,
  ]);

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
    const intensity = ctx.isMouseInChart || ctx.hovered ? 1 : 0;
    ctx.configKeys.forEach((key, seriesIndex) => {
      const surface = targets[key];
      if (!surface) return;
      const seed = ctx.seedOf(key);
      const line =
        (ctx.seriesSpecs[key]?.kind ??
          (ctx.chartType === "line" ? "line" : "area")) === "line";
      const dim = emphasis !== null && emphasis !== key ? 0.3 : 1;
      for (let column = 0; column < cols; column++) {
        const top = surface.top[column] ?? Number.NaN;
        const floor = surface.floor[column] ?? Number.NaN;
        // Columns outside the series' own span stay blank.
        if (Number.isNaN(top) || Number.isNaN(floor)) continue;
        if (
          line &&
          ctx.seriesSpecs[key]?.strokeVariant === "dashed" &&
          column % 6 >= 3
        ) {
          continue;
        }
        paintColumn(
          paint,
          column,
          Math.min(top, floor),
          Math.max(top, floor),
          seed,
          {
            variant: ctx.seriesSpecs[key]?.variant ?? "gradient",
            intensity,
            dim,
            stacked: stacked && !line,
            sparse: stacked ? 0 : seriesIndex * 0.14,
          }
        );
      }
    });

    const marker = ctx.hoverIndex ?? ctx.markerIndex;
    if (marker === null || ctx.dataLength < 2) return;
    const column = Math.round((marker / (ctx.dataLength - 1)) * (cols - 1));
    if (column < 0 || column >= cols) return;
    for (const key of ctx.configKeys) {
      const surface = targets[key];
      const row = Math.round(surface?.top[column] ?? Number.NaN);
      if (Number.isNaN(row)) continue;
      paint.fillStyle = rgb(ctx.seedOf(key).fill);
      paint.fillRect(column - 1, row - 1, 3, 3);
    }
  }, [ctx, targets, cols, rows]);

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

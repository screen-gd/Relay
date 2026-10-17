"use client";

import { useMemo } from "react";
import { Area } from "./area";
import { AreaChart } from "./area-chart";
import type { AreaVariant } from "./chart-context";
import type { DitherColor } from "./palette";

export type SparklineProps = {
  /** Plain numeric series — the common sparkline case. */
  data: number[];
  color: DitherColor;
  variant?: AreaVariant;
  /** Controlled crosshair position (e.g. a committed point). */
  markerIndex?: number | null;
  /** Parent-driven hover changes the fill. */
  hovered?: boolean;

  className?: string;
};

/**
 * Thin wrapper over {@link AreaChart} for the decorative-sparkline case: a
 * single `number[]` series, no axes/grid/tooltip, no scrub crosshair (unless a
 * `markerIndex` is supplied). Parent hover can emphasize its fill.
 */
export function Sparkline({
  data,
  color,
  variant = "gradient",
  markerIndex = null,
  hovered = false,
  className,
}: SparklineProps) {
  // Keep derived chart inputs stable across parent hover changes.
  const rows = useMemo(() => data.map((v) => ({ v })), [data]);
  const config = useMemo(() => ({ v: { color } }), [color]);

  return (
    <AreaChart
      data={rows}
      config={config}
      interactive={false}
      markerIndex={markerIndex}
      hovered={hovered}
      margins={{ top: 0, right: 0, bottom: 0, left: 0 }}
      className={className}
    >
      <Area dataKey="v" variant={variant} />
    </AreaChart>
  );
}

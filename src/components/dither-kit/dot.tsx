"use client";

import { useChart } from "./chart-context";
import { rgb, type Seed } from "./palette";
import { useSeries } from "./series-context";

export type DotVariant = "border" | "colored-border" | "filled";

function dotPaint(variant: DotVariant, seed: Seed) {
  switch (variant) {
    case "colored-border":
      return {
        fill: "var(--surface-page)",
        stroke: rgb(seed.line),
        strokeWidth: 1.5,
      };
    case "filled":
      return { fill: rgb(seed.star), stroke: rgb(seed.line), strokeWidth: 1 };
    default:
      return {
        fill: "var(--surface-page)",
        stroke: rgb(seed.star),
        strokeWidth: 1,
      };
  }
}

/** A marker at every data point along the series' top line. */
export function Dot({
  variant = "border",
  r = 2,
}: {
  variant?: DotVariant;
  r?: number;
}) {
  const ctx = useChart();
  const { dataKey, seed } = useSeries("Dot");
  const band = ctx.bands[dataKey];
  if (!ctx.ready || !band) return null;
  const paint = dotPaint(variant, seed);

  return (
    <g>
      {band.map((b, i) => (
        <circle
          {...paint}
          // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable x position
          key={i}
          cx={ctx.xCenter(i) ?? 0}
          cy={ctx.y(b[1])}
          r={r}
        />
      ))}
    </g>
  );
}

/** A single marker at the hovered point — keys off the shared hover index. */
export function ActiveDot({
  variant = "colored-border",
  r = 3,
}: {
  variant?: DotVariant;
  r?: number;
}) {
  const ctx = useChart();
  const { dataKey, seed } = useSeries("ActiveDot");
  const band = ctx.bands[dataKey];
  if (!ctx.ready || !band || ctx.hoverIndex == null) return null;
  const b = band[ctx.hoverIndex];
  if (!b) return null;
  const paint = dotPaint(variant, seed);
  const cx = ctx.xCenter(ctx.hoverIndex);
  const cy = ctx.y(b[1]);

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...paint} strokeWidth={2} />
    </g>
  );
}

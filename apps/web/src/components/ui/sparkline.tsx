"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FillPattern } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** Dither cell in CSS px; the viewBox tracks the rendered size so cells stay square. */
const CELL = 2;

/**
 * A trend line with no axes, drawn in the text color so it reads in both
 * themes, over a dithered area that fades out towards the baseline.
 * Values are plotted left to right, oldest first.
 */
export function Sparkline({
  data,
  className,
  "aria-label": ariaLabel,
}: {
  data: readonly number[];
  className?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const patternId = useId();
  // Rendered size in CSS px; null until measured, when a 100x24 box stands in.
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const measure = () => {
      const { width, height } = svg.getBoundingClientRect();
      if (width > 0 && height > 0)
        setSize((current) =>
          current?.width === width && current.height === height
            ? current
            : { width, height }
        );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  if (data.length < 2) return null;
  const width = size?.width ?? 100;
  const height = size?.height ?? 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data.map((value, index) => [
    (index / (data.length - 1)) * width,
    height - 1 - ((value - min) / span) * (height - 2),
  ]);
  const line = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("h-6 w-full overflow-visible text-text-2", className)}
    >
      {size ? (
        <>
          <defs>
            <FillPattern
              id={patternId}
              fill="gradient"
              color="--text-2"
              cell={CELL}
              level={0.5}
              ramp={{ edge: "top", at: 0, length: height }}
            />
          </defs>
          <path d={area} fill={`url(#${patternId})`} />
        </>
      ) : null}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

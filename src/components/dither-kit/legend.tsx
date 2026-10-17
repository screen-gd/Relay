"use client";

import { useCommonChart } from "./common-context";
import { cn } from "./lib";
import { rgb } from "./palette";

/** Overlay legend; use BlockLegend when wrapped entries need their own space. */
export function Legend({
  isClickable = false,
  align = "right",
}: {
  isClickable?: boolean;
  align?: "left" | "center" | "right";
}) {
  const chart = useCommonChart();
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-3 px-1",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        align === "left" && "justify-start"
      )}
    >
      {chart.names.map((name) => {
        const content = (
          <>
            <span
              aria-hidden="true"
              className="size-2 rounded-sm"
              style={{ backgroundColor: rgb(chart.seedOf(name).fill) }}
            />
            {chart.labelOf(name)}
          </>
        );
        return isClickable ? (
          <button
            key={name}
            type="button"
            aria-pressed={chart.selectedDataKey === name}
            onClick={() =>
              chart.selectDataKey(chart.selectedDataKey === name ? null : name)
            }
            onPointerEnter={() => chart.setFocusDataKey(name)}
            onPointerLeave={() => chart.setFocusDataKey(null)}
            onFocus={() => chart.setFocusDataKey(name)}
            onBlur={() => chart.setFocusDataKey(null)}
            className="pointer-events-auto flex min-h-6 items-center gap-2 rounded-sm px-1 text-meta text-[var(--text-primary)] hover:bg-[var(--surface-fill)]"
          >
            {content}
          </button>
        ) : (
          <span
            key={name}
            className="flex items-center gap-2 text-meta text-[var(--text-meta)]"
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

Legend.chartLayer = "dom" as const;

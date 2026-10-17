"use client";

import { useHydratedReducedMotion } from "@/lib/motion";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useCommonChart } from "./common-context";
import { rgb } from "./palette";

/** Floating chart values use the shared overlay surface and one-shot motion. */
export function Tooltip({
  labelKey,
  valueFormatter,
}: {
  labelKey?: string;
  valueFormatter?: (value: number, name: string) => string;
}) {
  const chart = useCommonChart();
  const reduceMotion = useHydratedReducedMotion();
  const show = chart.ready && chart.hoverIndex !== null;
  const [lastIndex, setLastIndex] = useState(0);
  if (chart.hoverIndex !== null && chart.hoverIndex !== lastIndex) {
    setLastIndex(chart.hoverIndex);
  }
  const index = chart.hoverIndex ?? lastIndex;
  const heading = chart.heading(index, labelKey);
  const items = chart.itemsAt(index);

  return (
    <AnimatePresence>
      {show && items.length > 0 && (
        <motion.div
          key="dither-tooltip"
          role="tooltip"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: reduceMotion ? 0 : 0.12 },
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ top: chart.tooltipTop, left: chart.tooltipLeft }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border-control)] bg-[var(--surface-overlay)] p-3 text-[var(--text-primary)] shadow-(--shadow-overlay)"
        >
          {heading ? (
            <div className="mb-1 font-mono text-meta text-[var(--text-meta)]">
              {heading}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-meta"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: rgb(item.seed.fill) }}
                />
                <span>{item.label}</span>
                <span className="ml-auto pl-2 font-mono tabular-nums">
                  {valueFormatter
                    ? valueFormatter(item.value, item.name)
                    : item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

Tooltip.chartLayer = "dom" as const;

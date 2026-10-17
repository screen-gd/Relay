"use client";

import { Progress as ProgressPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  label?: React.ReactNode;
  showValue?: boolean;
  valueLabel?: string;
};

function defaultValueLabel(value: number, max: number) {
  return `${Math.round((value / max) * 100)}%`;
}

function Progress({
  className,
  value = 0,
  max = 100,
  label,
  showValue = false,
  valueLabel,
  getValueLabel,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ProgressProps) {
  const generatedId = React.useId();
  const labelId = label ? `${generatedId}-label` : undefined;
  const normalizedMax = Number.isFinite(max) && max > 0 ? max : 100;
  const normalizedValue = Math.min(
    normalizedMax,
    Math.max(0, typeof value === "number" && Number.isFinite(value) ? value : 0)
  );
  const formatValue = getValueLabel ?? defaultValueLabel;
  const displayValue =
    valueLabel ?? formatValue(normalizedValue, normalizedMax);

  return (
    <div data-slot="progress-group" className="w-full">
      {(label || showValue) && (
        <div
          data-slot="progress-label"
          className="mb-2 flex items-center justify-between gap-3 text-body"
        >
          {label ? (
            <span id={labelId} className="font-medium">
              {label}
            </span>
          ) : (
            <span className="sr-only">Progress</span>
          )}
          {showValue && (
            <span className="font-mono text-[var(--text-meta)]">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        data-slot="progress"
        value={normalizedValue}
        max={normalizedMax}
        getValueLabel={
          valueLabel ? () => valueLabel : (getValueLabel ?? defaultValueLabel)
        }
        aria-label={
          ariaLabelledBy || labelId ? ariaLabel : (ariaLabel ?? "Progress")
        }
        aria-labelledby={ariaLabelledBy ?? labelId}
        className={cn(
          "relative h-1 w-full overflow-hidden rounded-md bg-[var(--surface-active)]",
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full flex-1 bg-[var(--accent-mark)]"
          style={{
            transform: `translateX(-${100 - (normalizedValue / normalizedMax) * 100}%)`,
          }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}

export { Progress };

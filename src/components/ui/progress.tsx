"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  label?: React.ReactNode
  showValue?: boolean
  valueLabel?: string
}

function defaultValueLabel(value: number, max: number) {
  return `${Math.round((value / max) * 100)}%`
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
  const generatedId = React.useId()
  const labelId = label ? `${generatedId}-label` : undefined
  const normalizedMax = max > 0 ? max : 100
  const normalizedValue =
    value === null ? null : Math.min(normalizedMax, Math.max(0, value))
  const formatValue = getValueLabel ?? defaultValueLabel
  const displayValue =
    valueLabel ??
    (normalizedValue === null
      ? "In progress"
      : formatValue(normalizedValue, normalizedMax))

  return (
    <div data-slot="progress-group" className="w-full">
      {(label || showValue) && (
        <div
          data-slot="progress-label"
          className="mb-1.5 flex items-center justify-between gap-3 text-sm"
        >
          {label ? (
            <span id={labelId} className="font-medium">
              {label}
            </span>
          ) : (
            <span className="sr-only">Progress</span>
          )}
          {showValue && (
            <span className="text-muted-foreground">{displayValue}</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        data-slot="progress"
        value={normalizedValue}
        max={normalizedMax}
        getValueLabel={
          valueLabel ? () => valueLabel : getValueLabel ?? defaultValueLabel
        }
        aria-label={
          ariaLabelledBy || labelId ? ariaLabel : ariaLabel ?? "Progress"
        }
        aria-labelledby={ariaLabelledBy ?? labelId}
        className={cn(
          "group/progress relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full flex-1 bg-primary transition-all group-data-[state=indeterminate]/progress:w-1/3 group-data-[state=indeterminate]/progress:animate-pulse"
          style={{
            transform:
              normalizedValue === null
                ? undefined
                : `translateX(-${100 - (normalizedValue / normalizedMax) * 100}%)`,
          }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export { Progress }

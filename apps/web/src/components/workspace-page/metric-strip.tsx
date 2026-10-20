import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
} as const;

type MetricStripProps = ComponentPropsWithoutRef<"dl"> & {
  columns?: keyof typeof columnClasses;
};

/**
 * Several numbers as one strip: a single grey field split by column rules,
 * never a row of equal cards, so the numbers read as one fact set.
 */
export function MetricStrip({
  columns = 4,
  className,
  children,
  role,
  ...props
}: MetricStripProps) {
  return (
    <dl
      data-slot="metric-strip"
      role={
        role ??
        (props["aria-label"] || props["aria-labelledby"] ? "region" : undefined)
      }
      className={cn(
        "grid min-w-0 shrink-0 gap-px overflow-hidden rounded-frame bg-line-row shadow-[0_0_0_1px_var(--line-row)]",
        columnClasses[columns],
        className
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

type MetricItemProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  label: ReactNode;
  value: ReactNode;
  supporting?: ReactNode;
  /** Kept for callers; Quartz shows numbers without icon tiles. */
  icon?: ReactNode;
  action?: ReactNode;
};

/** One number in a MetricStrip: its label, the value, and one quiet line. */
export function MetricItem({
  label,
  value,
  supporting,
  action,
  className,
  icon: _icon,
  ...props
}: MetricItemProps) {
  return (
    <div
      data-slot="metric-item"
      className={cn("min-w-0 bg-page px-4 py-3", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="type-label-sm text-text-2">{label}</dt>
          <dd className="mt-1 type-heading-sm text-text-1 data">{value}</dd>
        </div>
        {action}
      </div>
      {supporting ? (
        <div className="mt-1 type-label-sm text-text-3">{supporting}</div>
      ) : null}
    </div>
  );
}

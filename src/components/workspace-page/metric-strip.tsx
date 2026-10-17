import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const columnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
} as const;

type MetricStripProps = ComponentPropsWithoutRef<"dl"> & {
  columns?: keyof typeof columnClasses;
};

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
        "grid min-w-0 gap-2 text-card-foreground",
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
  icon?: ReactNode;
  action?: ReactNode;
};

export function MetricItem({
  label,
  value,
  supporting,
  icon,
  action,
  className,
  ...props
}: MetricItemProps) {
  return (
    <Card
      data-slot="metric-item"
      className={cn("min-w-0 p-4", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-meta font-medium text-[var(--text-meta)]">
            {icon}
            {label}
          </dt>
          <dd className="mt-2 text-metric text-[var(--text-primary)]">
            {value}
          </dd>
        </div>
        {action}
      </div>
      {supporting ? (
        <div className="mt-2 text-meta text-[var(--text-meta)]">
          {supporting}
        </div>
      ) : null}
    </Card>
  );
}

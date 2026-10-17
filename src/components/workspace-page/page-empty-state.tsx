import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Empty, EmptyHeader } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type PageEmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  /** Kept for callers; Quartz empty states carry no art. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * Nothing to show yet: a title, one line on why, and the action that fills
 * it, at the top-left where the first row would be.
 */
export function PageEmptyState({
  icon: _icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: PageEmptyStateProps) {
  return (
    <Empty
      data-slot="page-empty-state"
      className={cn("min-w-0 gap-3 px-4", compact ? "py-4" : "py-6", className)}
      {...props}
    >
      <EmptyHeader className="max-w-(--measure-short)">
        <h3 className="type-label text-text-1">{title}</h3>
        {description ? (
          <div className="type-body-sm text-text-2">{description}</div>
        ) : null}
      </EmptyHeader>
      {action ? (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </Empty>
  );
}

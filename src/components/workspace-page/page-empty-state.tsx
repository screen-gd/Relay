import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Empty, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type PageEmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export function PageEmptyState({
  icon,
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
      className={cn(
        "flex-none min-w-0 flex-col items-center justify-center gap-0 rounded-none border-0 px-5 text-center [text-wrap:wrap] md:px-5",
        compact ? "py-8" : "py-12",
        compact ? "md:py-8" : "md:py-12",
        className
      )}
      {...props}
    >
      <EmptyHeader className="max-w-none gap-0">
        {icon ? (
          <EmptyMedia
            variant="default"
            className="mb-3 grid size-11 place-items-center rounded-[6px] bg-card text-muted-foreground"
          >
            {icon}
          </EmptyMedia>
        ) : null}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <div className="mt-1.5 max-w-md text-sm leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </EmptyHeader>
      {action ? <div className="mt-4">{action}</div> : null}
    </Empty>
  );
}

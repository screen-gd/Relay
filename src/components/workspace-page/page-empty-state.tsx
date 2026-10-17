import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AlertCircle, FolderOpen } from "@/components/icons";

import { Empty, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type PageEmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  tone?: "default" | "error";
};

export function PageEmptyState({
  icon: suppliedIcon,
  title,
  description,
  action,
  compact = false,
  tone = "default",
  className,
  ...props
}: PageEmptyStateProps) {
  const icon =
    suppliedIcon ?? (tone === "error" ? <AlertCircle /> : <FolderOpen />);
  return (
    <Empty
      data-slot="page-empty-state"
      className={cn(
        "flex-none min-w-0 flex-col items-center justify-center gap-0 rounded-none border-0 px-4 text-center [text-wrap:wrap] md:px-4",
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
            className={cn(
              "mb-3 grid size-11 place-items-center rounded-md bg-[var(--surface-fill)] [&_svg]:size-5",
              tone === "error"
                ? "text-[var(--status-danger)]"
                : "text-[var(--text-meta)]"
            )}
          >
            {icon}
          </EmptyMedia>
        ) : null}
        <h2
          className={cn(
            "text-section",
            tone === "error"
              ? "text-[var(--status-danger)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-1 max-w-md text-meta text-[var(--text-meta)]">
            {description}
          </div>
        ) : null}
      </EmptyHeader>
      {action ? <div className="mt-4">{action}</div> : null}
    </Empty>
  );
}

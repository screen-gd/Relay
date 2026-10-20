import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The last panel in each pane grows, so both panes end on the same line. */
const PANE_FILL = "[&>[data-slot=content-section]:last-child]:flex-1";

type MasterDetailProps = ComponentPropsWithoutRef<"div"> & {
  master: ReactNode;
  detail: ReactNode;
  inspector?: ReactNode;
  variant?: "navigation" | "detail-rail";
};

export function MasterDetail({
  master,
  detail,
  inspector,
  variant = "navigation",
  className,
  ...props
}: MasterDetailProps) {
  const hasPreview = Boolean(inspector) && variant === "navigation";

  return (
    <div
      data-slot="master-detail"
      data-variant={variant}
      className={cn(
        "grid h-full min-h-0 min-w-0 gap-4",
        variant === "navigation" &&
          !hasPreview &&
          "lg:grid-cols-[320px_minmax(0,1fr)]",
        variant === "detail-rail" && "lg:grid-cols-[minmax(0,1fr)_320px]",
        hasPreview &&
          "grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-1 2xl:grid-cols-[200px_minmax(0,1fr)_280px]",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col",
          PANE_FILL,
          hasPreview ? "lg:h-full" : "h-full"
        )}
      >
        {master}
      </div>
      <div className={cn("flex h-full min-h-0 min-w-0 flex-col", PANE_FILL)}>
        {detail}
      </div>
      {inspector ? (
        <aside
          className={cn(
            "h-full min-h-0 min-w-0",
            hasPreview ? "hidden 2xl:block" : "lg:col-span-2 xl:col-span-1"
          )}
        >
          {inspector}
        </aside>
      ) : null}
    </div>
  );
}

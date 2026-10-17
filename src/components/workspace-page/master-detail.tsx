import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

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
  return (
    <div
      data-slot="master-detail"
      data-variant={variant}
      className={cn(
        "grid h-full min-h-0 min-w-0 gap-5",
        variant === "navigation" && "lg:grid-cols-[320px_minmax(0,1fr)]",
        variant === "detail-rail" && "lg:grid-cols-[minmax(0,1fr)_320px]",
        inspector &&
          variant === "navigation" &&
          "xl:grid-cols-[320px_minmax(0,1fr)_320px]",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full min-h-0 min-w-0",
          variant === "navigation" && "lg:border-r lg:border-line-row lg:pr-5"
        )}
      >
        {master}
      </div>
      <div
        className={cn(
          "h-full min-h-0 min-w-0",
          variant === "detail-rail" && "lg:border-l lg:border-line-row lg:pl-5"
        )}
      >
        {detail}
      </div>
      {inspector ? (
        <aside className="h-full min-h-0 min-w-0 lg:col-span-2 xl:col-span-1 xl:border-l xl:border-line-row xl:pl-5">
          {inspector}
        </aside>
      ) : null}
    </div>
  );
}

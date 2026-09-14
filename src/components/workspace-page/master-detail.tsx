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
        "grid min-h-0 min-w-0 gap-5",
        variant === "navigation" && "lg:grid-cols-[320px_minmax(0,1fr)]",
        variant === "detail-rail" && "lg:grid-cols-[minmax(0,1fr)_320px]",
        inspector && variant === "navigation" && "xl:grid-cols-[320px_minmax(0,1fr)_320px]",
        className,
      )}
      {...props}
    >
      <div className="min-h-0 min-w-0">{master}</div>
      <div className="min-h-0 min-w-0">{detail}</div>
      {inspector ? <aside className="min-h-0 min-w-0 lg:col-span-2 xl:col-span-1">{inspector}</aside> : null}
    </div>
  );
}

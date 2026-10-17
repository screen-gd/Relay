import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PageContentProps = ComponentPropsWithoutRef<"div"> & {
  mode?: "document" | "fill";
};

export function PageContent({
  mode = "document",
  className,
  children,
  ...props
}: PageContentProps) {
  return (
    <div
      data-slot="page-content"
      data-mode={mode}
      className={cn(
        "min-w-0",
        mode === "document"
          ? "space-y-(--space-section)"
          : "flex min-h-0 flex-1 flex-col gap-(--space-section)",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

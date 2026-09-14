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
          ? "space-y-4"
          : "flex min-h-0 flex-1 flex-col gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

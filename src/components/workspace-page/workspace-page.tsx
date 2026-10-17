import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type WorkspacePageProps = ComponentPropsWithoutRef<"div"> & {
  mode?: "document" | "fill";
  family:
    | "data-index"
    | "master-detail"
    | "canvas"
    | "library"
    | "administration"
    | "conversation";
};

export function WorkspacePage({
  mode = "document",
  family,
  className,
  children,
  ...props
}: WorkspacePageProps) {
  return (
    <div
      data-slot="workspace-page"
      data-mode={mode}
      data-family={family}
      className={cn(
        // Content hugs the panel's left gutter; a wide screen grows the right
        // margin rather than floating the page into the middle.
        "w-full min-w-0 px-(--space-gutter) pb-10 pt-4",
        mode === "document"
          ? "max-w-(--page-max-width)"
          : "max-w-(--page-max-width-wide) flex min-h-0 flex-col gap-3 lg:h-full lg:pb-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

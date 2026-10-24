import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Every workspace page uses the available viewport width. Form sections
 * keep readable field groups inside that shared frame. Record pages
 * put their tabs and Properties rail against the viewport edges.
 */
const familyWidth = {
  "data-index": "max-w-none",
  "master-detail": "max-w-none",
  canvas: "max-w-none",
  conversation: "max-w-none",
  library: "max-w-none",
  record: "max-w-none",
  administration: "ms-0 max-w-none",
} as const;

type WorkspacePageProps = ComponentPropsWithoutRef<"div"> & {
  /** `document` scrolls with the viewport; `fill` pins regions that scroll inside. */
  mode?: "document" | "fill";
  family: keyof typeof familyWidth;
};

/** The content column of one workspace page, inside the shell's viewport. */
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
        "mx-auto flex w-full min-w-0 flex-col",
        familyWidth[family],
        family === "record" ? "gap-0" : "gap-4 px-4 pt-4 pb-8 sm:px-6 sm:pt-5",
        mode === "document" && "shrink-0",
        mode === "fill" && "min-h-0 flex-1 lg:h-full lg:overflow-hidden",
        mode === "fill" && family !== "record" && "lg:pb-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

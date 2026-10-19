import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * How wide a page's content runs. Every page uses the whole viewport, as
 * Linear does; form pages start at the left edge and stop at a readable
 * width so long fields do not stretch across a wide screen.
 */
const familyWidth = {
  "data-index": "max-w-none",
  "master-detail": "max-w-none",
  canvas: "max-w-none",
  conversation: "max-w-none",
  library: "max-w-none",
  administration: "ms-0 max-w-5xl",
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
        "mx-auto w-full min-w-0 px-4 pt-4 pb-8 sm:px-6 sm:pt-5",
        familyWidth[family],
        mode === "document"
          ? "flex flex-col gap-5"
          : "flex min-h-0 flex-1 flex-col gap-4 lg:h-full lg:overflow-hidden lg:pb-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

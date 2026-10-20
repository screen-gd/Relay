import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

const ratioClasses = {
  balanced: "lg:grid-cols-2",
  inspector: "lg:grid-cols-[minmax(0,1fr)_320px]",
  // For inspectors that only exist on wide screens (smaller screens use a
  // Sheet). The secondary pane is removed below xl so it leaves no gap.
  "inspector-xl": "xl:grid-cols-[minmax(0,1fr)_320px]",
  // Supporting content stacks below the main column on smaller screens.
  supporting: "xl:grid-cols-[minmax(0,1fr)_320px]",
} as const;

/** The last panel in each pane grows, so both panes end on the same line. */
const PANE_FILL = "[&>[data-slot=content-section]:last-child]:flex-1";

type SplitPaneProps = ComponentPropsWithoutRef<"div"> & {
  primary: ReactNode;
  secondary: ReactNode;
  ratio?: keyof typeof ratioClasses;
  /** Document panes size to their content; fill panes use a bounded viewport. */
  mode?: "document" | "fill";
};

export function SplitPane({
  primary,
  secondary,
  ratio = "supporting",
  mode = "document",
  className,
  ...props
}: SplitPaneProps) {
  return (
    <div
      data-slot="split-pane"
      data-mode={mode}
      className={cn(
        "grid min-w-0 gap-4",
        mode === "fill" ? "h-full min-h-0" : "shrink-0",
        secondary != null && ratioClasses[ratio],
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col",
          PANE_FILL,
          mode === "fill" && "h-full min-h-0"
        )}
      >
        {primary}
      </div>
      {secondary != null ? (
        <div
          className={cn(
            "flex min-w-0 flex-col",
            PANE_FILL,
            mode === "fill" && "h-full min-h-0",
            ratio === "inspector-xl" && "hidden xl:flex"
          )}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

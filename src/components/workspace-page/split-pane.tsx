import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

const ratioClasses = {
  balanced: "lg:grid-cols-2",
  inspector: "lg:grid-cols-[minmax(0,1fr)_320px]",
  // For inspectors that only exist on wide screens (smaller screens use a
  // Sheet). The secondary pane is removed below xl so it leaves no gap.
  "inspector-xl": "xl:grid-cols-[minmax(0,1fr)_320px]",
  supporting: "lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]",
} as const;

type SplitPaneProps = ComponentPropsWithoutRef<"div"> & {
  primary: ReactNode;
  secondary: ReactNode;
  ratio?: keyof typeof ratioClasses;
};

export function SplitPane({
  primary,
  secondary,
  ratio = "supporting",
  className,
  ...props
}: SplitPaneProps) {
  return (
    <div
      data-slot="split-pane"
      className={cn(
        "grid h-full min-h-0 min-w-0 gap-5",
        secondary != null && ratioClasses[ratio],
        className
      )}
      {...props}
    >
      <div className="h-full min-h-0 min-w-0">{primary}</div>
      {secondary != null ? (
        <div
          className={cn(
            "h-full min-h-0 min-w-0",
            ratio === "inspector-xl" && "hidden xl:block"
          )}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

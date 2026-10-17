import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { InspectorPane } from "./inspector-pane";

const ratioClasses = {
  balanced: "lg:grid-cols-2",
  inspector: "lg:grid-cols-[minmax(0,1fr)_320px]",
  "inspector-xl": "lg:grid-cols-[minmax(0,1fr)_320px]",
  supporting: "lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]",
};
type SplitPaneProps = ComponentPropsWithoutRef<"div"> & {
  primary: ReactNode;
  secondary: ReactNode;
  ratio?: keyof typeof ratioClasses;
  mobileInspector?: "sheet" | "external";
};
export function SplitPane({
  primary,
  secondary,
  ratio = "supporting",
  mobileInspector = "sheet",
  className,
  ...props
}: SplitPaneProps) {
  return (
    <div
      data-slot="split-pane"
      className={cn(
        "grid h-full min-h-0 min-w-0 gap-6",
        secondary != null && ratioClasses[ratio],
        className
      )}
      {...props}
    >
      <div className="h-full min-h-0 min-w-0">{primary}</div>
      {secondary != null ? (
        ratio === "inspector" || ratio === "inspector-xl" ? (
          <InspectorPane mobile={mobileInspector}>{secondary}</InspectorPane>
        ) : (
          <div className="h-full min-h-0 min-w-0">{secondary}</div>
        )
      ) : null}
    </div>
  );
}

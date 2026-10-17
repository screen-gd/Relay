import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { InspectorPane } from "./inspector-pane";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [inlineInspector, setInlineInspector] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !inspector || variant !== "navigation") return;
    // Keep both side panes and a 320px center column usable, including gaps.
    const update = (width: number) =>
      setInlineInspector(width >= 320 * 3 + 24 * 2);
    update(root.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) =>
      update(entry.contentRect.width)
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [inspector, variant]);
  return (
    <div
      ref={rootRef}
      data-slot="master-detail"
      data-variant={variant}
      className={cn(
        "grid h-full min-h-0 min-w-0 gap-6",
        variant === "navigation"
          ? "lg:grid-cols-[320px_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_320px]",
        inspector &&
          inlineInspector &&
          variant === "navigation" &&
          "lg:grid-cols-[320px_minmax(0,1fr)_320px]",
        className
      )}
      {...props}
    >
      <div className="min-h-0 min-w-0">{master}</div>
      {variant === "detail-rail" ? (
        <InspectorPane>{detail}</InspectorPane>
      ) : (
        <div className="min-h-0 min-w-0">{detail}</div>
      )}
      {inspector ? (
        <InspectorPane forceSheet={!inlineInspector}>{inspector}</InspectorPane>
      ) : null}
    </div>
  );
}

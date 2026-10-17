import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cardSurfaceClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DataTableFrameProps = ComponentPropsWithoutRef<"section"> & {
  header?: ReactNode;
  footer?: ReactNode;
  bounded?: boolean;
  bodyClassName?: string;
  bodyLabel?: string;
};

/**
 * The surface a table lives on. Table bodies scroll inside the frame when it is
 * bounded; unbounded frames never become a vertical scroller.
 */
export function DataTableFrame({
  header,
  footer,
  bounded = false,
  bodyClassName,
  bodyLabel,
  className,
  children,
  ...props
}: DataTableFrameProps) {
  return (
    <section
      data-slot="data-table-frame"
      className={cn(
        cardSurfaceClassName,
        "min-w-0",
        bounded && "min-h-0",
        className
      )}
      {...props}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        data-slot="data-table-frame-body"
        role={bodyLabel ? "region" : undefined}
        aria-label={bodyLabel}
        tabIndex={bounded && bodyLabel ? 0 : undefined}
        className={cn(
          "min-w-0 overflow-x-auto p-1",
          // Unbounded frames must never become a vertical scroller: sub-pixel
          // overflow would latch wheel input and stop the page from scrolling.
          bounded
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
            : "overflow-y-hidden",
          bodyClassName
        )}
      >
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </section>
  );
}

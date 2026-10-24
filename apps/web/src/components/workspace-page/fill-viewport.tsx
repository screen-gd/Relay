import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FillViewportProps = ComponentPropsWithoutRef<"div"> & {
  header?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  bodyLabel?: string;
};

/**
 * Bounded header/body/footer grid for fill-mode pages. Each region is pinned
 * to its row so the body always receives the `1fr` track, even when the
 * header or footer is omitted. Without that, a lone body lands in the first
 * `auto` row and the frame shrinks to its content.
 */
export function FillViewport({
  header,
  footer,
  bodyClassName,
  bodyLabel,
  className,
  children,
  ...props
}: FillViewportProps) {
  return (
    <div
      data-slot="fill-viewport"
      className={cn(
        "grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden",
        className
      )}
      {...props}
    >
      {header ? (
        <div className="row-start-1 min-w-0 shrink-0">{header}</div>
      ) : null}
      <div
        data-slot="fill-viewport-body"
        aria-label={bodyLabel}
        tabIndex={bodyLabel ? 0 : undefined}
        className={cn(
          "row-start-2 min-h-0 min-w-0 overflow-auto",
          bodyClassName
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="row-start-3 min-w-0 shrink-0">{footer}</div>
      ) : null}
    </div>
  );
}

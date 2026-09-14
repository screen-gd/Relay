import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FillViewportProps = ComponentPropsWithoutRef<"div"> & {
  header?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  bodyLabel?: string;
};

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
        "grid min-h-[32rem] min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden",
        className,
      )}
      {...props}
    >
      {header ? <div className="min-w-0 shrink-0">{header}</div> : null}
      <div
        data-slot="fill-viewport-body"
        aria-label={bodyLabel}
        tabIndex={bodyLabel ? 0 : undefined}
        className={cn("min-h-0 min-w-0 overflow-auto", bodyClassName)}
      >
        {children}
      </div>
      {footer ? <div className="min-w-0 shrink-0">{footer}</div> : null}
    </div>
  );
}

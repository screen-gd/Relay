import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageToolbarProps = ComponentPropsWithoutRef<"div"> & {
  primary?: ReactNode;
  secondary?: ReactNode;
  sticky?: boolean;
};

/**
 * The filter row above a list: search and filters on the left, display
 * options on the right. `sticky` pins it under the top bar while the list
 * scrolls, on the solid page color.
 */
export function PageToolbar({
  primary,
  secondary,
  sticky = false,
  className,
  children,
  ...props
}: PageToolbarProps) {
  return (
    <div
      data-slot="page-toolbar"
      className={cn(
        "flex min-h-(--control) min-w-0 shrink-0 flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-between",
        sticky &&
          "sticky top-0 z-20 -mx-4 bg-page px-4 py-2 shadow-[inset_0_-1px_0_var(--line-row)] sm:-mx-6 sm:px-6",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {primary}
        {children}
      </div>
      {secondary ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cardSurfaceClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ContentSectionProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  /** Action row below the body, e.g. Save/Cancel. */
  footer?: ReactNode;
  /**
   * Gives the title this id and renders the panel as a labelled `<section>`
   * region. Opt in only where the region is a meaningful landmark.
   */
  titleId?: string;
  /**
   * `flush` drops body padding for tables, or for lists wrapped in
   * `sectionListClassName` with `sectionRowClassName` rows.
   */
  bodyMode?: "padded" | "flush";
  bodyClassName?: string;
};

/**
 * List wrapper and row styles for a `flush` ContentSection body. Rows are
 * separated by spacing and a hover fill, never divider lines.
 */
export const sectionListClassName = "grid gap-px px-1.5 pb-1.5";

export const sectionRowClassName =
  "rounded-lg px-3 py-2 transition-colors hover:bg-[var(--app-hover)]";

/**
 * The standard panel for workspace content: a filled surface with a title
 * row (title, metadata, description, actions), a body, and an optional
 * footer. Stack these with `gap-4`; never nest them. Group nested content
 * with `--surface-inset` wells instead of borders.
 */
export function ContentSection({
  title,
  description,
  metadata,
  actions,
  footer,
  titleId,
  bodyMode = "padded",
  bodyClassName,
  className,
  children,
  ...props
}: ContentSectionProps) {
  const hasHeader = title || description || metadata || actions;
  const hasBody =
    children !== undefined && children !== null && children !== false;
  const Root = titleId ? "section" : "div";

  return (
    <Root
      data-slot="content-section"
      aria-labelledby={titleId}
      className={cn(cardSurfaceClassName, "min-w-0 overflow-hidden", className)}
      {...props}
    >
      {hasHeader ? (
        <div
          data-slot="content-section-header"
          className={cn(
            "flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between",
            !hasBody && !footer && "pb-4"
          )}
        >
          <div className="min-w-0">
            <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-2">
              {title ? (
                <h2
                  id={titleId}
                  className="text-sm font-semibold text-foreground"
                >
                  {title}
                </h2>
              ) : null}
              {metadata}
            </div>
            {description ? (
              <div className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasBody ? (
        <div
          data-slot="content-section-body"
          className={cn(
            bodyMode === "padded"
              ? cn("px-4 pb-4", hasHeader ? "pt-3" : "pt-4")
              : hasHeader && "pt-1",
            bodyClassName
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div
          data-slot="content-section-footer"
          className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4"
        >
          {footer}
        </div>
      ) : null}
    </Root>
  );
}

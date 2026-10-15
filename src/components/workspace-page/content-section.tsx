import type { ComponentPropsWithoutRef, ReactNode } from "react";

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
export const sectionListClassName = "grid gap-px";

export const sectionRowClassName =
  "rounded-lg px-3 py-2 transition-colors hover:bg-[var(--app-hover)]";

/**
 * The standard block for workspace content: a title row (title, metadata,
 * description, actions), a body, and an optional footer, laid flat on the
 * page. Stacked sections are separated by a hairline (see globals.css);
 * never nest them. Tables and lists inside use their own row dividers.
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
      className={cn("flex min-w-0 flex-col", className)}
      {...props}
    >
      {hasHeader ? (
        <div
          data-slot="content-section-header"
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
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
            hasHeader && (bodyMode === "padded" ? "pt-3" : "pt-2"),
            bodyClassName
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div
          data-slot="content-section-footer"
          className="flex flex-wrap items-center justify-between gap-3 pt-3"
        >
          {footer}
        </div>
      ) : null}
    </Root>
  );
}

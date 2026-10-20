import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContentSectionProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  /** Action row below the body, e.g. Save and Cancel. */
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

/** List wrapper and row styles for a `flush` ContentSection body. */
export const sectionListClassName = "grid";

export const sectionRowClassName =
  "rule-row px-4 py-2.5 transition-colors duration-(--dur-fast) ease-(--ease-step) hover:bg-hover";

/**
 * The Quartz panel: one topic in a grey field, its title and actions on the
 * grey, its content on the page color inside. Panels stack with a gap and
 * never nest; tables and lists inside use row rules, not boxes. Panels side
 * by side share their row's height; the body grows to fill it.
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
      data-surface="card"
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col rounded-frame bg-well p-1",
        className
      )}
      {...props}
    >
      {hasHeader ? (
        <div
          data-slot="content-section-header"
          className="flex min-h-(--row) flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {title ? (
                <h2 id={titleId} className="type-label text-text-1">
                  {title}
                </h2>
              ) : null}
              {metadata}
            </div>
            {description ? (
              <div className="mt-0.5 type-body-sm text-text-2">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasBody ? (
        <div
          data-slot="content-section-body"
          className={cn(
            // flex-1: a panel stretched by its row fills with page color, not grey.
            "min-w-0 flex-1 rounded-soft bg-page shadow-[0_0_0_1px_var(--line-frame)]",
            bodyMode === "padded" ? "p-4" : "overflow-hidden",
            bodyClassName
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div
          data-slot="content-section-footer"
          className="flex min-h-(--control-lg) flex-wrap items-center justify-between gap-2 px-3 py-1.5"
        >
          {footer}
        </div>
      ) : null}
    </Root>
  );
}

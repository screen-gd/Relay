import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Where page actions render. The breadcrumb and sidebar already name the
 * page, so headers show no title; actions sit on one line at the right, and
 * when the shell renders a tab strip it offers `actionsHost` so the actions
 * share that row.
 */
export const PageHeaderContext = createContext<{
  actionsHost: HTMLElement | null;
}>({ actionsHost: null });

type PageHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  const { actionsHost } = useContext(PageHeaderContext);
  const heading = (
    <div className="sr-only">
      <h1>{title}</h1>
      {description ? <div>{description}</div> : null}
    </div>
  );
  if (!actions) {
    return (
      <header data-slot="page-header" className="sr-only" {...props}>
        {heading}
      </header>
    );
  }
  if (actionsHost) {
    return (
      <header data-slot="page-header" {...props}>
        {heading}
        {createPortal(
          <div
            data-slot="page-header-actions"
            className="flex shrink-0 items-center gap-2"
          >
            {actions}
          </div>,
          actionsHost
        )}
      </header>
    );
  }
  return (
    <header
      data-slot="page-header"
      className={cn("flex min-w-0 items-center justify-end pb-3", className)}
      {...props}
    >
      {heading}
      <div
        data-slot="page-header-actions"
        className="flex shrink-0 flex-wrap items-center justify-end gap-2"
      >
        {actions}
      </div>
    </header>
  );
}

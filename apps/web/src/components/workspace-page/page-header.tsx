import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Where page actions render. The top bar already names the page, so headers
 * show no visible title; inside the workspace shell the actions render into
 * the top bar's right side (`actionsHost`), and outside it they sit on one
 * line at the right of the page.
 */
export const PageHeaderContext = createContext<{
  actionsHost: HTMLElement | null;
  /** True inside the workspace shell, whose top bar hosts the actions. */
  inShell?: boolean;
}>({ actionsHost: null });

/**
 * Renders `children` where the page's actions live: the shell's top bar, or
 * in place outside the shell. For pages whose heading is rendered elsewhere.
 */
export function TopBarActions({ children }: { children: ReactNode }) {
  const { actionsHost, inShell } = useContext(PageHeaderContext);
  const actions = (
    <div
      data-slot="page-header-actions"
      className="flex shrink-0 items-center gap-2"
    >
      {children}
    </div>
  );
  if (actionsHost) return createPortal(actions, actionsHost);
  return inShell ? null : actions;
}

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
  const { actionsHost, inShell } = useContext(PageHeaderContext);
  const heading = (
    <div className="sr-only">
      <h1>{title}</h1>
      {description ? <div>{description}</div> : null}
    </div>
  );
  if (!actions || (inShell && !actionsHost)) {
    return (
      <header data-slot="page-header" className="sr-only" {...props}>
        {heading}
      </header>
    );
  }
  if (actionsHost) {
    // Keep the heading out of layout when the actions live in the top bar.
    // An empty in-flow header would still add the page's flex gap.
    return (
      <header data-slot="page-header" className="sr-only" {...props}>
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

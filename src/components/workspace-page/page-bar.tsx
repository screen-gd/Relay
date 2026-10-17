import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export const PageBarContext = createContext<{
  tabsHost: HTMLElement | null;
  filtersHost: HTMLElement | null;
  actionsHost: HTMLElement | null;
}>({ tabsHost: null, filtersHost: null, actionsHost: null });

/** One shared bar receives route tabs, feature filters, and page actions. */
export function PageBar({
  tabs,
  children,
}: {
  tabs?: ReactNode;
  children: ReactNode;
}) {
  const barRef = useRef<HTMLElement>(null);
  const [tabsHost, setTabsHost] = useState<HTMLElement | null>(null);
  const [filtersHost, setFiltersHost] = useState<HTMLElement | null>(null);
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
  const context = useMemo(
    () => ({ tabsHost, filtersHost, actionsHost }),
    [tabsHost, filtersHost, actionsHost]
  );
  useEffect(() => {
    const bar = barRef.current;
    const scroller = bar?.closest("main");
    if (!bar || !scroller) return;
    const update = () =>
      scroller.style.setProperty(
        "--page-bar-height",
        `${bar.offsetHeight + 12}px`
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      scroller.style.removeProperty("--page-bar-height");
    };
  }, []);
  return (
    <PageBarContext.Provider value={context}>
      <header
        ref={barRef}
        data-slot="page-bar"
        aria-label="Page controls"
        className="sticky top-0 z-20 shrink-0 border-b border-[var(--border-panel)] bg-[var(--surface-page)]"
      >
        <div className="flex w-full max-w-(--page-max-width) flex-wrap items-center gap-x-3 gap-y-2 px-(--space-gutter) py-3">
          <div
            ref={setTabsHost}
            data-slot="page-bar-tabs"
            className="flex min-w-0 max-w-full items-center gap-3 empty:hidden"
          >
            <div data-slot="hub-tabs">{tabs}</div>
          </div>
          <div
            ref={setFiltersHost}
            data-slot="page-bar-filters"
            className="flex min-w-0 flex-wrap items-center gap-2 empty:hidden"
          />
          <div
            ref={setActionsHost}
            data-slot="page-bar-actions"
            className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2"
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </PageBarContext.Provider>
  );
}

export function PageTabs({ children }: { children: ReactNode }) {
  const { tabsHost } = useContext(PageBarContext);
  const tabs = (
    <div data-slot="page-view-tabs" className="min-w-0 max-w-full">
      {children}
    </div>
  );
  return tabsHost ? createPortal(tabs, tabsHost) : tabs;
}

export function PageFilters({
  primary,
  secondary,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { primary?: ReactNode; secondary?: ReactNode }) {
  const { filtersHost } = useContext(PageBarContext);
  const filters = (
    <div
      data-slot="page-filters"
      className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}
      {...props}
    >
      {primary}
      {children}
      {secondary}
    </div>
  );
  return filtersHost ? createPortal(filters, filtersHost) : filters;
}

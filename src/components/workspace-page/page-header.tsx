import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * True when the shell already names the page in a tab strip above it. The
 * header then drops to one line so the content starts higher.
 */
export const PageHeaderCompactContext = createContext(false);

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
  const compact = useContext(PageHeaderCompactContext);
  // Under a tab strip the tab already names the page, so only the actions
  // show; the heading stays for assistive technology.
  if (compact && !actions) {
    return (
      <header data-slot="page-header" data-compact className="sr-only">
        <h1>{title}</h1>
        {description ? <div>{description}</div> : null}
      </header>
    );
  }
  return (
    <header
      data-slot="page-header"
      data-compact={compact || undefined}
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:justify-between",
        compact ? "pb-3 sm:items-center" : "pb-4 sm:items-end",
        className
      )}
      {...props}
    >
      <div className={cn("min-w-0", compact && "sr-only")}>
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        {description ? (
          <div className="mt-1.5 max-w-3xl text-[13px] leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div
          data-slot="page-header-actions"
          className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

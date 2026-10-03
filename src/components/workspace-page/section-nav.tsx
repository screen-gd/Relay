import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SectionNavItem<T extends string> = { id: T; label: string };

type SectionNavProps<T extends string> = {
  items: ReadonlyArray<SectionNavItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/**
 * Navigation between views of one record (for example the views of a
 * Project). It renders shadcn buttons inside a `nav` with `aria-current`
 * because each view is route state, not an in-page panel.
 */
export function SectionNav<T extends string>({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SectionNavProps<T>) {
  return (
    <nav
      data-slot="section-nav"
      aria-label={ariaLabel}
      className={cn(
        "workspace-scrollbar-hidden flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto",
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            size="sm"
            aria-current={active ? "page" : undefined}
            className={cn(
              "h-8 shrink-0 whitespace-nowrap text-[var(--app-muted)] hover:bg-transparent hover:text-[var(--app-ink)] dark:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] active:translate-y-0 active:scale-100",
              active && "bg-[var(--app-active)] text-[var(--app-ink)]"
            )}
            onClick={() => onValueChange(item.id)}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}

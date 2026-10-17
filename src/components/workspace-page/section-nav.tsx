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
 * The views of one record (for example a Project's Overview and Outputs),
 * as a row of tabs over a hairline with an ink underline on the open one.
 * It is a `nav` with `aria-current` because each view is route state.
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
        "scrollbar-none flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--line-row)]",
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-(--control) shrink-0 items-center rounded-soft px-2.5 type-label whitespace-nowrap outline-none",
              "transition-colors duration-(--dur-fast) ease-(--ease-step) hover:bg-hover focus-visible:focus-ring-inset",
              "after:absolute after:inset-x-2 after:-bottom-px after:h-px after:transition-colors after:duration-(--dur-fast)",
              active
                ? "text-text-1 after:bg-ink"
                : "text-text-2 hover:text-text-1"
            )}
            onClick={() => onValueChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

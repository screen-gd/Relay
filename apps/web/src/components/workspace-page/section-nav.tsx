import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
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
 * The views of one page or record (for example Reports' Overview and
 * Payments), in the same segmented control as every other switcher. It is
 * a `nav` with `aria-current` because each view is route state.
 */
export function SectionNav<T extends string>({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SectionNavProps<T>) {
  return (
    <SegmentedControl
      asChild
      className={cn("scrollbar-none shrink-0 overflow-x-auto", className)}
    >
      <nav data-slot="section-nav" aria-label={ariaLabel}>
        {items.map((item) => (
          <SegmentedControlItem
            key={item.id}
            aria-current={item.id === value ? "page" : undefined}
            onClick={() => onValueChange(item.id)}
          >
            {item.label}
          </SegmentedControlItem>
        ))}
      </nav>
    </SegmentedControl>
  );
}

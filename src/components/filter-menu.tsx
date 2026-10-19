import { ListFilter } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
};

export type ListFilterDefinition = {
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
};

/**
 * Every filter for a list behind one button, as Linear's Filter: each filter
 * is a submenu that names its current choice, and Clear resets them all. The
 * button shows how many filters are on.
 */
export function FilterMenu({
  filters,
  activeCount,
  onClear,
  subject,
}: {
  filters: readonly ListFilterDefinition[];
  activeCount: number;
  onClear: () => void;
  /** What is being filtered, for the button's accessible name. */
  subject: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={
            activeCount
              ? `Filter ${subject}, ${activeCount} active`
              : `Filter ${subject}`
          }
        >
          <ListFilter />
          <span className="hidden sm:inline">Filter</span>
          {activeCount ? (
            <span className="rounded-inner bg-tile px-1 type-label-sm text-text-1 data">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {filters.map((filter) => {
          const current = filter.options.find(
            (option) => option.value === filter.value
          );
          return (
            <DropdownMenuSub key={filter.label}>
              <DropdownMenuSubTrigger>
                <span>{filter.label}</span>
                <span className="ms-auto max-w-28 truncate ps-3 type-label-sm text-text-3">
                  {current?.label}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-52">
                <DropdownMenuRadioGroup
                  value={filter.value}
                  onValueChange={filter.onChange}
                >
                  {filter.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!activeCount} onSelect={onClear}>
          Clear filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

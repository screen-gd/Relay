/**
 * The Quartz segmented control look, shared by links, tabs, and filters: a
 * quiet well, natural-width options, and a lightly framed raised selection.
 * Single selections move one surface using Quartz's motion tokens.
 */
export const segmentedTrackClassName =
  "relative isolate inline-flex h-(--control) w-fit max-w-full items-stretch gap-1 rounded-soft bg-well p-1 shadow-[inset_0_0_0_1px_var(--line-row)]";

export const segmentedSelectionClassName =
  "rounded-inner bg-raised shadow-[0_1px_2px_var(--surface-hover),inset_0_0_0_1px_var(--line-row)]";

export const segmentedItemClassName = [
  "relative inline-flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-inner px-3 type-label whitespace-nowrap text-text-2 select-none outline-none",
  "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
  "hover:not-disabled:bg-hover hover:not-disabled:text-text-1 focus-visible:focus-ring-inset motion-reduce:transition-none",
  "disabled:cursor-not-allowed disabled:text-text-disabled",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
].join(" ");

// Radix tabs/toggles and ordinary route links share the same selected surface.
export const segmentedActiveItemClassName = [
  "group-data-[segmented=true]/segmented:[&:is([data-state=active],[data-state=on],[aria-current=page],[aria-pressed=true])]:bg-raised",
  "group-data-[segmented=true]/segmented:[&:is([data-state=active],[data-state=on],[aria-current=page],[aria-pressed=true])]:text-text-1",
  "group-data-[segmented=true]/segmented:[&:is([data-state=active],[data-state=on],[aria-current=page],[aria-pressed=true])]:shadow-[0_1px_2px_var(--surface-hover),inset_0_0_0_1px_var(--line-row)]",
  "group-data-[segmented=true]/segmented:group-data-[segmented-ready=true]/segmented:[&:is([data-state=active],[data-state=on],[aria-current=page],[aria-pressed=true])]:bg-transparent",
  "group-data-[segmented=true]/segmented:group-data-[segmented-ready=true]/segmented:[&:is([data-state=active],[data-state=on],[aria-current=page],[aria-pressed=true])]:shadow-none",
].join(" ");

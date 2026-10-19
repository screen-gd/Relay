/**
 * The Quartz segmented control look, shared by TabsList and ToggleGroup: a
 * grey well holding the options, the chosen one lifted onto the page color
 * with a control edge. Options switch in 120ms; nothing slides or loops.
 */
export const segmentedTrackClassName =
  "inline-flex h-(--control) w-fit max-w-full items-stretch gap-0.5 rounded-soft bg-well p-0.5";

export const segmentedItemClassName = [
  "relative inline-flex min-w-0 items-center justify-center gap-1.5 rounded-inner px-2.5 type-label whitespace-nowrap text-text-2 select-none outline-none",
  "transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
  "hover:not-disabled:text-text-1 focus-visible:focus-ring-inset",
  "disabled:cursor-not-allowed disabled:text-text-disabled",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
].join(" ");

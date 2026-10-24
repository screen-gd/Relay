/**
 * The Quartz field box: page-colored, framed by a control edge that darkens on
 * hover and turns ink on focus, fail-red when invalid. Input, Textarea, the
 * Select trigger and the date picker trigger share it so every field matches.
 * Pair with `data-control` so the global focus outline steps aside.
 */
export const fieldControlClassName = [
  "w-full min-w-0 rounded-soft bg-page control-edge text-text-1 type-label outline-none",
  "transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
  "placeholder:text-text-3",
  "focus-visible:[--frame-color:var(--border-focus)]! focus-visible:[--control-lift:var(--focus-halo)]!",
  "aria-invalid:[--frame-color:var(--fail-line)]",
  "hover:not-disabled:not-aria-invalid:not-focus-visible:[--frame-color:var(--line-control-hover)]",
  "disabled:cursor-not-allowed disabled:text-text-disabled disabled:[--frame-color:var(--line-row)] disabled:[--control-lift:var(--elev-none)]",
  "read-only:bg-well read-only:[--frame-color:transparent] read-only:[--control-lift:var(--elev-none)]",
  "pointer-coarse:text-base",
].join(" ");

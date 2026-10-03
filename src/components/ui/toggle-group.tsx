"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Segmented control for filters and view switches that do not swap panels.
 * Visually matches the default `TabsList` track. Use `Tabs` when each option
 * owns a panel, and this when options filter the same content.
 */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "inline-flex h-9 w-fit items-center gap-0.5 rounded-lg bg-[var(--surface-inset)] p-1",
        className
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-full items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap text-[var(--app-muted)] outline-none transition-colors hover:text-[var(--app-ink)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--app-active)] data-[state=on]:text-[var(--app-ink)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };

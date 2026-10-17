"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";
import { segmentedItemClassName, segmentedTrackClassName } from "./tabs";

/**
 * Toggle buttons for filters that do not swap panels.
 * Visually matches the default `TabsList` track. Use `Tabs` when each option
 * owns a panel, and this only when options filter the same content.
 */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(segmentedTrackClassName, className)}
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
        segmentedItemClassName + " data-[state=on]:bg-[var(--surface-active)]",
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };

"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { segmentedItemClassName, segmentedTrackClassName } from "./segmented";

/**
 * Segmented control for filters and view switches that do not swap panels.
 * Matches the default `TabsList`. Use `Tabs` when each option owns a panel,
 * and this when options filter the same content.
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
        segmentedItemClassName,
        "data-[state=on]:bg-page data-[state=on]:text-text-1 data-[state=on]:control-edge",
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };

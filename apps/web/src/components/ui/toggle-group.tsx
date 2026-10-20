"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

/**
 * Segmented control for filters and view switches that do not swap panels.
 * Matches the default `TabsList`. Use `Tabs` when each option owns a panel,
 * and this when options filter the same content.
 */
function ToggleGroup({
  className,
  animated = true,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  animated?: boolean;
}) {
  return (
    <SegmentedControl
      asChild
      animated={animated && props.type === "single" && !props.asChild}
    >
      <ToggleGroupPrimitive.Root
        data-slot="toggle-group"
        className={className}
        {...props}
      />
    </SegmentedControl>
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <SegmentedControlItem
      asChild
      data-slot="toggle-group-item"
      className={className}
    >
      <ToggleGroupPrimitive.Item {...props} />
    </SegmentedControlItem>
  );
}

export { ToggleGroup, ToggleGroupItem };

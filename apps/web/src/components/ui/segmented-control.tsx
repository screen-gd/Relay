"use client";

import type { ComponentProps } from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import {
  segmentedActiveItemClassName,
  segmentedItemClassName,
  segmentedTrackClassName,
} from "./segmented";
import { SegmentedIndicator } from "./segmented-indicator";

/** Shared Quartz track for route links, panel tabs, and single-choice filters. */
export function SegmentedControl({
  asChild = false,
  animated = true,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean; animated?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  const trackProps = {
    "data-slot": "segmented-control",
    "data-segmented": "true",
    className: cn("group/segmented", segmentedTrackClassName, className),
    ...props,
  };

  if (asChild && animated) {
    return (
      <Slot.Root {...trackProps}>
        <Slot.Slottable>{children}</Slot.Slottable>
        <SegmentedIndicator />
      </Slot.Root>
    );
  }

  return (
    <Comp {...trackProps}>
      {animated ? (
        <>
          {children}
          <SegmentedIndicator />
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

/** Keeps the semantics and handlers of its button, link, or Radix child. */
export function SegmentedControlItem({
  asChild = false,
  type = "button",
  className,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="segmented-control-item"
      data-segmented-item=""
      className={cn(
        segmentedItemClassName,
        "z-10",
        segmentedActiveItemClassName,
        className
      )}
      {...(!asChild ? { type } : {})}
      {...props}
    />
  );
}

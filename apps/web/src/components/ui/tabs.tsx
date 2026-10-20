"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { segmentedItemClassName, segmentedTrackClassName } from "./segmented";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex min-w-0 gap-3 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  );
}

/** Every tab list is the shared segmented control (see `segmented.ts`). */
const tabsListClassName = cn(
  "group/tabs-list min-w-0 overflow-x-auto scrollbar-none group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  segmentedTrackClassName
);

function TabsList({
  className,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <SegmentedControl asChild animated={!asChild}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        asChild={asChild}
        className={cn(tabsListClassName, className)}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </SegmentedControl>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <SegmentedControlItem
      asChild
      data-slot="tabs-trigger"
      className={cn(
        segmentedItemClassName,
        "group/tabs-trigger z-10",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        className
      )}
    >
      <TabsPrimitive.Trigger {...props} />
    </SegmentedControlItem>
  );
}

function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "rounded-inner bg-hover px-1.5 text-text-3 type-label-sm data group-data-[state=active]/tabs-trigger:text-text-2",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "min-w-0 flex-1 outline-none data-[state=active]:animate-[relay-fade-in_var(--dur-base)_var(--ease-step)_both]",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsCount, TabsContent };

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { segmentedItemClassName, segmentedTrackClassName } from "./segmented";

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

/**
 * `default` is the segmented control, for views of one thing. `line` is a
 * row of plain tabs over a hairline, for the sections of a page or record.
 * `ghost` drops the track; the chosen tab takes the selected wash.
 */
const tabsListVariants = cva(
  "group/tabs-list min-w-0 overflow-x-auto scrollbar-none group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: segmentedTrackClassName,
        line: "flex w-full items-center gap-1 shadow-[inset_0_-1px_0_var(--line-row)]",
        ghost: "inline-flex w-fit items-center gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        segmentedItemClassName,
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:data-[state=active]:bg-page group-data-[variant=default]/tabs-list:data-[state=active]:text-text-1 group-data-[variant=default]/tabs-list:data-[state=active]:control-edge",
        "group-data-[variant=line]/tabs-list:h-(--control) group-data-[variant=line]/tabs-list:rounded-soft group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:hover:bg-hover group-data-[variant=line]/tabs-list:data-[state=active]:text-text-1",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:inset-x-2 group-data-[variant=line]/tabs-list:after:-bottom-px group-data-[variant=line]/tabs-list:after:h-px group-data-[variant=line]/tabs-list:data-[state=active]:after:bg-ink",
        "group-data-[variant=ghost]/tabs-list:h-(--control-sm) group-data-[variant=ghost]/tabs-list:rounded-soft group-data-[variant=ghost]/tabs-list:hover:bg-hover group-data-[variant=ghost]/tabs-list:data-[state=active]:bg-selected group-data-[variant=ghost]/tabs-list:data-[state=active]:text-text-1",
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

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

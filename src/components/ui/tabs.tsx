"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

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
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex !h-9 w-fit items-center justify-center gap-0.5 !rounded-lg !border-0 !bg-[var(--surface-inset)] !p-1 text-muted-foreground group-data-[orientation=vertical]/tabs:!h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        // Segmented control: inset track, filled active item.
        default: "",
        // Trackless tabs: only the active item is filled. No baseline.
        ghost: "!h-auto justify-start gap-1 !bg-transparent !p-0",
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
        "inline-flex !h-7 flex-1 items-center justify-center gap-1.5 !rounded-md !border-0 px-2.5 py-1 text-sm font-medium whitespace-nowrap text-[var(--app-muted)] !shadow-none transition-colors group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-[var(--app-ink)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:!bg-[var(--app-active)] data-[state=active]:!text-[var(--app-ink)] group-data-[variant=ghost]/tabs-list:!h-8 group-data-[variant=ghost]/tabs-list:flex-none group-data-[variant=ghost]/tabs-list:px-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

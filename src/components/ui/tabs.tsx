"use client";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
} from "react";

const TabsContext = createContext({ value: "", layoutId: "" });
export const segmentedTrackClassName =
  "workspace-scrollbar-hidden inline-flex h-9 max-w-full w-fit shrink-0 items-center overflow-x-auto rounded-md border border-[var(--border-control)] bg-[var(--surface-fill)] p-(--segment-padding)";
export const segmentedItemClassName =
  "relative inline-flex h-full shrink-0 items-center justify-center gap-2 rounded-sm px-3 text-body font-medium text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--surface-fill)]";

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  const [uncontrolledValue, setValue] = useState(defaultValue ?? "");
  const layoutId = useId();
  const selected = value ?? uncontrolledValue;
  return (
    <TabsContext.Provider value={{ value: selected, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={selected}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        className={cn("flex min-w-0 flex-col gap-3", className)}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  );
}
function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(segmentedTrackClassName, className)}
      {...props}
    />
  );
}
function TabsTrigger({
  className,
  value,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const context = useContext(TabsContext);
  const reduceMotion = useHydratedReducedMotion();
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(segmentedItemClassName, className)}
      {...props}
    >
      {context.value === value ? (
        <motion.span
          aria-hidden="true"
          layoutId={context.layoutId}
          className="pointer-events-none absolute inset-0 rounded-sm bg-[var(--surface-active)]"
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.2, 0, 0, 1],
          }}
        />
      ) : null}
      <span className="relative flex items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  );
}
function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  );
}
export { Tabs, TabsContent, TabsList, TabsTrigger };

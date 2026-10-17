import { createContext, useContext, useId, type ComponentProps } from "react";
import { motion } from "motion/react";
import { Slot } from "radix-ui";
import { segmentedTrackClassName, segmentedItemClassName } from "./tabs";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const NavigationContext = createContext("");

/** Route links share the tab track while retaining native link behavior. */
export function SegmentedNavigation({
  className,
  children,
  ...props
}: ComponentProps<"nav">) {
  const id = useId();
  return (
    <NavigationContext.Provider value={id}>
      <nav
        data-slot="segmented-navigation"
        className={cn(segmentedTrackClassName, className)}
        {...props}
      >
        {children}
      </nav>
    </NavigationContext.Provider>
  );
}

export function SegmentedLink({
  active,
  asChild = false,
  children,
  className,
  ...props
}: ComponentProps<"a"> & { active: boolean; asChild?: boolean }) {
  const id = useContext(NavigationContext);
  const reduceMotion = useHydratedReducedMotion();
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      aria-current={active ? "page" : undefined}
      className={cn(segmentedItemClassName, className)}
      {...props}
    >
      {active ? (
        <motion.span
          aria-hidden="true"
          layoutId={id}
          className="pointer-events-none absolute inset-0 rounded-sm bg-[var(--surface-active)]"
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.2, 0, 0, 1],
          }}
        />
      ) : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}

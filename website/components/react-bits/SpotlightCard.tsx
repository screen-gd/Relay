"use client";

import { useRef, type HTMLAttributes, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * React Bits SpotlightCard (https://reactbits.dev/components/spotlight-card),
 * adapted to the site: theme colors instead of fixed dark ones, the light
 * color comes from the `--spotlight` token, and the cursor position is
 * written to CSS variables instead of React state so moving the mouse does
 * not re-render the card. Pass layout classes through `className`.
 */
export default function SpotlightCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        "group/spotlight relative rounded-2xl border border-border bg-card",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 ease-out group-hover/spotlight:opacity-100 group-focus-within/spotlight:opacity-100"
        style={{
          background:
            "radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 0%), var(--spotlight), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

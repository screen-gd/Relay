import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared panel surface. Reused by elements that cannot render a `Card` div. */
export const cardSurfaceClassName =
  "flex flex-col rounded-[var(--radius-panel)] border border-[var(--panel-edge)] bg-card text-card-foreground";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(cardSurfaceClassName, className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 px-4 py-1.5",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-4", className)} {...props} />
  );
}

export { Card, CardContent, CardHeader };

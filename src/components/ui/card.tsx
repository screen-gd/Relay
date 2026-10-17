import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared surface for cards, sections, and data panels. */
export const cardSurfaceClassName =
  "flex flex-col rounded-md border border-[var(--border-panel)] bg-card text-card-foreground";

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
        "flex min-h-12 items-center justify-between gap-3 p-4",
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

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A grey field for one topic. Fields separate groups without lines; never
 * put a framed box inside one. Reused by elements that cannot render a div.
 */
export const cardSurfaceClassName =
  "flex flex-col rounded-frame bg-well text-text-1";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      data-surface="card"
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
        "flex min-h-(--row) items-center justify-between gap-3 px-4 py-1.5",
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

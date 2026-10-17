import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * A static label shown as a tinted word, never a pill. `warn` and
 * `destructive` are the only warm marks; use them for trouble alone.
 */
const badgeVariants = cva(
  [
    "relative inline-flex min-h-(--tag) w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-inner px-1.5 py-0.5 type-label-sm whitespace-nowrap",
    "transition-colors duration-(--dur-fast) ease-(--ease-step)",
    "[&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "bg-tile text-text-1 [a&]:hover:bg-hover",
        secondary: "bg-tile text-text-2 [a&]:hover:bg-hover",
        outline:
          "text-text-2 shadow-[inset_0_0_0_1px_var(--line-control)] [a&]:hover:text-text-1",
        ghost: "text-text-2 [a&]:hover:bg-hover [a&]:hover:text-text-1",
        warn: "bg-warn-wash text-warn-text",
        destructive: "bg-fail-wash text-fail-text",
        link: "h-auto px-0 text-text-1 underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

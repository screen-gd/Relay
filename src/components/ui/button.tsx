import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Quartz button on Radix Slot. One `default` (ink, the primary) per view;
 * `outline` is the framed secondary key, `secondary` the grey field; `ghost`
 * is for toolbars and rows; `destructive` keeps a fail edge, never a red fill.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-soft whitespace-nowrap select-none type-label",
    "transition-[background-color,color,scale,box-shadow,opacity] duration-(--dur-fast) ease-(--ease-step)",
    "active:not-disabled:scale-(--scale-press) active:duration-(--dur-press) motion-reduce:active:scale-100",
    "disabled:cursor-not-allowed aria-busy:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "key key-primary text-primary-foreground disabled:opacity-(--dim-opacity) disabled:shadow-none",
        outline:
          "key key-secondary text-text-1 hover:not-disabled:[--frame-color:var(--line-control-hover)] disabled:text-text-disabled",
        secondary:
          "bg-secondary text-text-1 hover:not-disabled:bg-button-secondary-hover active:not-disabled:bg-pressed disabled:text-text-disabled",
        ghost:
          "touch-target text-text-2 hover:not-disabled:bg-ghost-hover hover:not-disabled:text-text-1 active:not-disabled:bg-pressed aria-expanded:bg-selected aria-expanded:text-text-1 disabled:text-text-disabled",
        destructive:
          "key key-secondary text-fail-text [--frame-color:var(--fail-line)] hover:not-disabled:[--frame-color:var(--fail-text)] disabled:text-text-disabled disabled:[--frame-color:var(--text-disabled)]",
        link: "h-auto! min-h-6 gap-1 px-0! text-text-1 underline-offset-4 decoration-1 hover:underline",
      },
      size: {
        default: "h-(--control) px-3",
        xs: "h-(--control-xs) gap-1 px-2 type-label-sm [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-(--control-sm) gap-1.5 px-2.5",
        lg: "h-(--control-lg) px-5 type-button",
        icon: "size-(--control) px-0",
        "icon-xs":
          "size-(--control-xs) px-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-(--control-sm) px-0",
        "icon-lg": "size-(--control-lg) px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

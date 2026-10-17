import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 text-body font-medium text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-50 disabled:data-[pending=true]:opacity-100 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:data-[pending=true]:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)] hover:bg-[color-mix(in_srgb,var(--accent)_90%,white)]",
        secondary:
          "border border-[var(--border-control)] bg-[var(--surface-fill)] hover:bg-[var(--surface-active)]",
        ghost: "bg-transparent hover:bg-[var(--surface-fill)]",
        destructive:
          "bg-[var(--danger-fill)] text-white hover:bg-[color-mix(in_srgb,var(--danger-fill)_90%,white)]",
      },
      size: {
        default: "h-9",
        sm: "h-8",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  pendingLabel = "Working…",
  disabled,
  children,
  onClickCapture,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    pending?: boolean;
    pendingLabel?: React.ReactNode;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const content =
    asChild &&
    pending &&
    React.isValidElement<{ children?: React.ReactNode }>(children)
      ? React.cloneElement(children, undefined, pendingLabel)
      : pending
        ? pendingLabel
        : children;
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-pending={pending || undefined}
      aria-busy={pending || undefined}
      aria-disabled={disabled || pending || props["aria-disabled"]}
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant, size, className }))}
      onClickCapture={(event) => {
        if (disabled || pending) {
          event.preventDefault();
          event.stopPropagation();
        } else {
          onClickCapture?.(event);
        }
      }}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };

"use client";

import * as React from "react";
import { CheckIcon } from "@/components/icons";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-inner touch-target",
        "bg-page text-text-inverse control-edge [--frame-color:var(--border-control)] transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
        "hover:not-disabled:data-[state=unchecked]:[--frame-color:var(--ink)]",
        "data-[state=checked]:bg-ink data-[state=checked]:[--frame-color:var(--ink)] data-[state=indeterminate]:bg-ink",
        "aria-invalid:[--frame-color:var(--fail-line)]",
        "disabled:cursor-not-allowed disabled:[--frame-color:var(--text-disabled)] disabled:data-[state=checked]:bg-text-disabled",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

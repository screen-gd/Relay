"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** A setting that applies immediately. Ink when on, framed track when off. */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 touch-target",
        "bg-page control-edge [--frame-color:var(--border-control)] transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
        "hover:not-disabled:data-[state=unchecked]:[--frame-color:var(--ink)]",
        "data-[state=checked]:bg-ink data-[state=checked]:[--frame-color:var(--ink)]",
        "aria-invalid:[--frame-color:var(--fail-line)]",
        "disabled:cursor-not-allowed disabled:[--frame-color:var(--text-disabled)] disabled:[--control-lift:var(--elev-none)] disabled:data-[state=checked]:bg-text-disabled",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-text-2 transition-[translate,background-color] duration-(--dur-fast) ease-(--ease-step) data-[state=checked]:translate-x-4 data-[state=checked]:bg-paper rtl:data-[state=checked]:-translate-x-4"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

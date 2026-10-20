import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldControlClassName } from "./field-control";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      data-control=""
      className={cn(
        fieldControlClassName,
        "h-(--control) px-2.5",
        "file:me-2 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:type-label file:text-text-1",
        className
      )}
      {...props}
    />
  );
}

export { Input };

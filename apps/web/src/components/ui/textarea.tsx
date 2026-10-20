import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { fieldControlClassName } from "./field-control";

const textareaVariants = cva(
  [fieldControlClassName, "field-sizing-content resize-y type-body"],
  {
    variants: {
      density: {
        compact: "min-h-16 px-2.5 py-1.5 type-body-sm",
        default: "min-h-20 px-2.5 py-2",
        comfortable: "min-h-28 px-3 py-2.5",
      },
    },
    defaultVariants: {
      density: "default",
    },
  }
);

type TextareaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> & {
    error?: boolean;
  };

function Textarea({
  className,
  density = "default",
  error = false,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-control=""
      data-density={density}
      aria-invalid={error ? true : ariaInvalid}
      className={cn(textareaVariants({ density }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "field-sizing-content w-full min-w-0 resize-y rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      density: {
        compact: "min-h-16 px-2.5 py-1.5 text-xs",
        default: "min-h-20 px-3 py-2 text-base md:text-sm",
        comfortable: "min-h-28 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      density: "default",
    },
  }
)

type TextareaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> & {
    error?: boolean
  }

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
      data-density={density}
      aria-invalid={error ? true : ariaInvalid}
      className={cn(textareaVariants({ density }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }

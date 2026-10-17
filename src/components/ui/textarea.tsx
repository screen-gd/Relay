import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

function Textarea({
  className,
  error = false,
  "aria-invalid": ariaInvalid,
  ...props
}: ComponentProps<"textarea"> & { error?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      aria-invalid={error || ariaInvalid}
      className={cn(
        inputClassName,
        "field-sizing-content h-auto min-h-9 resize-y",
        className
      )}
      {...props}
    />
  );
}
export { Textarea };

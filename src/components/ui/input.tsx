import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const inputClassName =
  "h-9 w-full min-w-0 rounded-md border border-[var(--border-control)] bg-[var(--surface-fill)] px-3 py-2 text-body text-[var(--text-primary)] placeholder:text-[var(--text-meta)] read-only:border-transparent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--status-danger)]";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputClassName,
        "file:mr-2 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-[var(--text-primary)]",
        className
      )}
      {...props}
    />
  );
}
export { Input };

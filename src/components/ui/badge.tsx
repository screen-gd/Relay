import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

const dotColors = {
  success: "bg-[var(--status-success)]",
  warning: "bg-[var(--status-warning)]",
  danger: "bg-[var(--status-danger)]",
  info: "bg-[var(--status-info)]",
  neutral: "bg-[var(--text-meta)]",
};
export type StatusTone = keyof typeof dotColors;

function Badge({
  className,
  asChild = false,
  status,
  variant = "default",
  children,
  ...props
}: ComponentProps<"span"> & {
  asChild?: boolean;
  status?: StatusTone;
  variant?: "default" | "secondary" | "destructive" | "ghost";
}) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="tag"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-2 rounded-sm bg-[var(--surface-fill)] px-2 text-meta font-medium text-[var(--text-primary)] [&>svg]:size-3",
        className
      )}
      {...props}
    >
      {status || variant === "destructive" ? (
        <span
          aria-hidden="true"
          data-slot="status-dot"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dotColors[status ?? "danger"]
          )}
        />
      ) : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}
export { Badge, Badge as Tag };

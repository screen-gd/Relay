import { ditherMaskStyle } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder: a quiet static dither (dithercn mask) in the muted
 * text color. Deliberately not animated, so a waiting page never repaints.
 */
function Skeleton({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-soft bg-text-3", className)}
      style={{ ...ditherMaskStyle(0.375, { cell: 2 }), ...style }}
      {...props}
    />
  );
}

export { Skeleton };

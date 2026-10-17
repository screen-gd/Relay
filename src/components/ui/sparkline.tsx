import { cn } from "@/lib/utils";

/**
 * A trend line with no axes, drawn in the text color so it reads in both
 * themes. Values are plotted left to right, oldest first.
 */
export function Sparkline({
  data,
  className,
  "aria-label": ariaLabel,
}: {
  data: readonly number[];
  className?: string;
  "aria-label"?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const line = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 22 - ((value - min) / span) * 20;
      return `${index ? "L" : "M"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("h-6 w-full overflow-visible text-text-2", className)}
    >
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

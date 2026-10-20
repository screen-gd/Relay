import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number };

/**
 * Columns for a short series, such as one value per month. Bars are ink at
 * reduced strength with the last one full, so the current period reads first.
 * Hovering or focusing a column shows its value. The chart is one image with
 * an accessible summary; pass the numbers as text elsewhere when they matter.
 */
export function BarChart({
  data,
  format = (value) => value.toLocaleString("en"),
  "aria-label": ariaLabel,
  className,
}: {
  data: readonly BarDatum[];
  format?: (value: number) => string;
  "aria-label": string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("flex h-40 items-stretch gap-2", className)}
    >
      {data.map((item, index) => {
        const last = index === data.length - 1;
        return (
          <div
            key={`${item.label}-${index}`}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="relative flex w-full flex-1 items-end justify-center">
              <span className="pointer-events-none absolute -top-0.5 text-text-1 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 type-label-sm data">
                {format(item.value)}
              </span>
              <span
                className={cn(
                  "block w-full max-w-10 rounded-t-inner bg-ink transition-[height,opacity] duration-(--dur-slow) ease-(--ease-step)",
                  last ? "opacity-100" : "opacity-35 group-hover:opacity-60"
                )}
                style={{ height: `${Math.max(2, (item.value / max) * 88)}%` }}
              />
            </div>
            <span className="max-w-full truncate text-text-3 type-label-sm">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shares of a whole as labelled rows with a proportion bar each, in place of
 * a pie: every share is readable as a word and a number.
 */
export function ShareList({
  data,
  "aria-label": ariaLabel,
}: {
  data: readonly BarDatum[];
  "aria-label": string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <ul aria-label={ariaLabel} className="grid gap-2.5">
      {data.map((item) => {
        const share = Math.round((item.value / total) * 100);
        return (
          <li key={item.label} className="grid gap-1">
            <span className="flex items-center justify-between gap-3 type-label">
              <span className="truncate text-text-1">{item.label}</span>
              <span className="shrink-0 text-text-2 data">
                {item.value} <span className="text-text-3">({share}%)</span>
              </span>
            </span>
            <span className="h-1 overflow-hidden rounded-full bg-tile">
              <span
                className="block h-full rounded-full bg-ink"
                style={{ width: `${share}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

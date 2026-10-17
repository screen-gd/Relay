import { cn } from "@/lib/utils";

type SegmentedMeterProps = {
  /** 0 to 100. Values outside the range are clamped. */
  value: number;
  /** Number of cells. Wider meters read better with more cells. */
  segments?: number;
  /** Accessible name. Without one the meter is decorative and hidden. */
  label?: string;
  className?: string;
};

/** A row of small cells filled up to `value`, used for progress at a glance. */
export function SegmentedMeter({
  value,
  segments = 16,
  label,
  className,
}: SegmentedMeterProps) {
  const clamped = Math.min(
    100,
    Math.max(0, Number.isFinite(value) ? value : 0)
  );
  const count = Math.max(1, Math.round(segments));
  const filled = Math.round((clamped / 100) * count);
  return (
    <div
      data-slot="segmented-meter"
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? clamped : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("flex h-3 items-stretch gap-1", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="min-w-1 flex-1 rounded-sm"
          style={{
            backgroundColor:
              index < filled ? "var(--accent-mark)" : "var(--surface-active)",
          }}
        />
      ))}
    </div>
  );
}

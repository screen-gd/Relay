import { cn } from "@/lib/utils";

type SegmentedMeterProps = {
  /** 0 to 100. Values outside the range are clamped. */
  value: number;
  /** Number of cells. Wider meters read better with more cells. */
  segments?: number;
  /**
   * `scale` shades filled cells from danger through warning to success by
   * position, so low values read as early and high values as nearly done.
   * `accent` fills every cell with the brand accent.
   */
  tone?: "scale" | "accent";
  /** Accessible name. Without one the meter is decorative and hidden. */
  label?: string;
  className?: string;
};

function cellColor(index: number, segments: number, tone: "scale" | "accent") {
  if (tone === "accent") return "var(--app-accent)";
  const position = (index + 1) / segments;
  if (position <= 0.35) return "var(--status-danger)";
  if (position <= 0.65) return "var(--status-warning)";
  return "var(--status-success)";
}

/** A row of small cells filled up to `value`, used for progress at a glance. */
export function SegmentedMeter({
  value,
  segments = 16,
  tone = "scale",
  label,
  className,
}: SegmentedMeterProps) {
  const clamped = Math.min(
    100,
    Math.max(0, Number.isFinite(value) ? value : 0)
  );
  const filled = Math.round((clamped / 100) * segments);
  return (
    <div
      data-slot="segmented-meter"
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? clamped : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("flex h-3 items-stretch gap-[2px]", className)}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className="min-w-[2px] flex-1 rounded-[1px]"
          style={{
            backgroundColor:
              index < filled
                ? cellColor(index, segments, tone)
                : "var(--app-strong-border)",
          }}
        />
      ))}
    </div>
  );
}

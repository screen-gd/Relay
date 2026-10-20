import { ditherMaskStyle } from "@/lib/dither";
import { cn } from "@/lib/utils";

type SegmentedMeterProps = {
  /** 0 to 100. Values outside the range are clamped. */
  value: number;
  /** Number of cells. Wider meters read better with more cells. */
  segments?: number;
  /**
   * `scale` fills cells with ink; progress is not trouble, so no cell is
   * warm. `accent` fills every cell with the primary color. `warn` marks a
   * limit that has been reached.
   */
  tone?: "scale" | "accent" | "warn";
  /** Accessible name. Without one the meter is decorative and hidden. */
  label?: string;
  /** Spoken value, e.g. "2 of 3 revisions used". Defaults to the percent. */
  valueText?: string;
  className?: string;
};

const toneColor = {
  scale: "var(--ink)",
  accent: "var(--primary)",
  warn: "var(--warn-mark)",
} as const;

/** Dither cell size inside a meter cell; meter cells are only a few px wide. */
const DITHER_CELL = "1px";

/**
 * A row of small dithered cells filled up to `value`, used for progress at a
 * glance. Filled cells step from half coverage to solid at the leading cell,
 * so the row reads as a ramp; empty cells keep a sparse dither so the track
 * stays visible. Static CSS masks (dithercn), no animation.
 */
export function SegmentedMeter({
  value,
  segments = 16,
  tone = "scale",
  label,
  valueText,
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
      aria-valuetext={label ? valueText : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("flex h-3 items-stretch gap-[2px]", className)}
    >
      {Array.from({ length: segments }, (_, index) => {
        const isFilled = index < filled;
        // The leading cell is solid; earlier cells thin out towards the start.
        const level = isFilled
          ? index === filled - 1
            ? 1
            : 0.5 + (0.5 * (index + 1)) / Math.max(filled, 1)
          : 0.25;
        return (
          <span
            key={index}
            className="min-w-[2px] flex-1 rounded-[1px]"
            style={{
              backgroundColor: isFilled ? toneColor[tone] : "var(--text-3)",
              ...(level < 1
                ? ditherMaskStyle(level, { cell: DITHER_CELL })
                : null),
            }}
          />
        );
      })}
    </div>
  );
}

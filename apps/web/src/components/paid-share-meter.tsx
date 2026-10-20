import { cssColor, fillStyle } from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";
import { paidSharePercent } from "@/lib/payout-reporting";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { className: "h-2", cell: "2px" },
  md: { className: "h-3", cell: "var(--dither-cell)" },
} as const;

type PaidShareMeterProps = {
  paid: number;
  unpaid: number;
  /** Accessible name; the meter announces its value as "N% paid". */
  label: string;
  size?: keyof typeof sizes;
  /** Paid fill. Defaults to Relay's brand lime, as in the Reports charts. */
  color?: DitherColor;
  className?: string;
};

/**
 * Paid vs unpaid as a dithered meter (dithercn static fills, no canvas).
 * The paid share is a dense dither that thickens towards its solid leading
 * edge; the unpaid rest is a sparse grey dotted track so it stays visible.
 * Used by Reports for period totals and per-client rows.
 */
export function PaidShareMeter({
  paid,
  unpaid,
  label,
  size = "md",
  color = "--dither-color-lime",
  className,
}: PaidShareMeterProps) {
  const percent = paidSharePercent(paid, unpaid);
  const { className: height, cell } = sizes[size];
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${percent}% paid`}
      className={cn(
        "relative w-full overflow-hidden rounded-inner",
        height,
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 transition-[left] duration-500 ease-out motion-reduce:transition-none"
        style={{
          left: `${percent}%`,
          ...fillStyle("dotted", { color: "grey", cell }),
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      >
        <div
          className="absolute inset-0"
          style={fillStyle("gradient", {
            color,
            cell,
            edge: "right",
            length: 64,
            from: 1,
            to: 0.75,
          })}
        />
        {percent > 0 ? (
          <div
            className="absolute inset-y-0 right-0 w-0.5"
            style={{ backgroundColor: cssColor(color) }}
          />
        ) : null}
      </div>
    </div>
  );
}

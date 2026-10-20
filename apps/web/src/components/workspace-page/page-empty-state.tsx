import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { Empty, EmptyHeader } from "@/components/ui/empty";
import { FillPattern } from "@/lib/dither";
import { cn } from "@/lib/utils";

type PageEmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  /** Kept for callers; Quartz empty states carry no icon art. */
  icon?: ReactNode;
  /** Show the small dithered frame mark above the title. Off by default. */
  art?: boolean;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * Nothing to show yet: a title, one line on why, and the action that fills
 * it, at the top-left where the first row would be.
 */
export function PageEmptyState({
  icon: _icon,
  art = false,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: PageEmptyStateProps) {
  return (
    <Empty
      data-slot="page-empty-state"
      className={cn("min-w-0 gap-3 px-4", compact ? "py-4" : "py-6", className)}
      {...props}
    >
      {art ? <EmptyFrameArt /> : null}
      <EmptyHeader className="max-w-(--measure-short)">
        <h3 className="type-label text-text-1">{title}</h3>
        {description ? (
          <div className="type-body-sm text-text-2">{description}</div>
        ) : null}
      </EmptyHeader>
      {action ? (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </Empty>
  );
}

/**
 * Two stacked video frames in static dither (dithercn SVG fills): a sparse
 * one behind, a front one that fades up from a dense base, and a solid play
 * mark on top. Decorative.
 */
function EmptyFrameArt() {
  const id = useId();
  const back = `${id}-back`;
  const front = `${id}-front`;
  const cutout = `${id}-cutout`;
  return (
    <svg
      aria-hidden="true"
      width="48"
      height="36"
      viewBox="0 0 48 36"
      className="shrink-0"
    >
      <defs>
        <FillPattern id={back} fill="dotted" color="--text-3" cell={2} />
        <FillPattern
          id={front}
          fill="gradient"
          color="--text-2"
          cell={2}
          floor={0.125}
          ramp={{ edge: "bottom", at: 36, length: 28 }}
        />
        {/* Hides the back frame behind the front one, with a 2px gap. */}
        <mask id={cutout}>
          <rect width="48" height="36" fill="white" />
          <rect x="-2" y="6" width="44" height="32" rx="4" fill="black" />
        </mask>
      </defs>
      <rect
        x="8"
        y="0"
        width="40"
        height="28"
        rx="3"
        fill={`url(#${back})`}
        mask={`url(#${cutout})`}
      />
      <rect x="0" y="8" width="40" height="28" rx="3" fill={`url(#${front})`} />
      <path d="M17 16.5v11l9-5.5z" fill="var(--text-1)" />
    </svg>
  );
}

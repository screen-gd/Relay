"use client";

import { SegmentedMeter } from "@/components/ui/segmented-meter";

export type PortalRevisionAllowance = { used: number; limit: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads the allowance a portal query reports, ignoring any other field. */
export function readRevisionAllowance(
  value: unknown
): PortalRevisionAllowance | null {
  if (!isRecord(value)) return null;
  const { used, limit } = value;
  if (
    typeof used !== "number" ||
    typeof limit !== "number" ||
    !Number.isFinite(used) ||
    !Number.isFinite(limit)
  ) {
    return null;
  }
  return { used: Math.max(0, used), limit: Math.max(0, limit) };
}

/**
 * How much of the Project's revision allowance the client used, e.g.
 * "2 of 3 revisions used", with one dithered meter cell per revision that
 * turns warm once the allowance is used up. A Project without a limit
 * renders nothing.
 */
export function RevisionAllowance({
  allowance,
}: {
  allowance: PortalRevisionAllowance | null;
}) {
  if (!allowance) return null;
  const { used, limit } = allowance;
  const summary = `${used} of ${limit} revisions used`;
  return (
    <div className="mt-2 grid max-w-60 gap-1.5">
      <p className="text-muted-foreground type-body">{summary}</p>
      {limit > 0 ? (
        <SegmentedMeter
          value={(used / limit) * 100}
          // One cell per revision while that stays readable.
          segments={Math.min(limit, 12)}
          tone={used >= limit ? "warn" : "scale"}
          label="Revisions used"
          valueText={summary}
          className="h-2"
        />
      ) : null}
    </div>
  );
}

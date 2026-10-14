"use client";

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
 * "2 of 3 revisions used". A Project without a limit renders nothing.
 */
export function RevisionAllowance({
  allowance,
}: {
  allowance: PortalRevisionAllowance | null;
}) {
  if (!allowance) return null;
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {allowance.used} of {allowance.limit} revisions used
    </p>
  );
}

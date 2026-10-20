/**
 * Project and payment status, styled the Quartz way: the status is a word,
 * and only trouble is warm. A Project's stage is not trouble, so stages read
 * in the text ramp: active work strongest, waiting and finished work quieter.
 * Lateness is trouble and is marked where dates are shown, not here.
 */
const activeStatuses = ["In Progress", "Revision", "Review", "Client Review"];

export function projectStatusColor(status: string) {
  if (activeStatuses.includes(status)) return "var(--text-1)";
  if (status === "Cancelled") return "var(--text-3)";
  return "var(--text-2)";
}

/** Badge classes for a Project status: a tinted word, never a pill or ring. */
export function projectStatusTone(status: string) {
  if (activeStatuses.includes(status)) return "bg-tile text-text-1";
  if (status === "Cancelled") return "bg-transparent text-text-3";
  return "bg-tile text-text-2";
}

export function paymentStatusTone(paid: boolean) {
  return paid ? "bg-tile text-text-2" : "bg-tile text-text-1";
}

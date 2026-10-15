export function projectStatusColor(status: string) {
  if (status === "Delivered") return "var(--status-success)";
  if (["Review", "Revision", "Client Review"].includes(status))
    return "var(--status-warning)";
  if (status === "Cancelled") return "var(--status-danger)";
  if (status === "In Progress") return "var(--status-info)";
  return "var(--text-muted)";
}

export function projectStatusTone(status: string) {
  if (status === "Delivered")
    return "border-[color-mix(in_srgb,var(--status-success)_40%,transparent)] bg-[var(--status-success-bg)] text-[var(--status-success)]";
  if (["Review", "Revision", "Client Review"].includes(status))
    return "border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
  if (status === "Cancelled")
    return "border-[color-mix(in_srgb,var(--status-danger)_40%,transparent)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]";
  if (status === "In Progress")
    return "border-[color-mix(in_srgb,var(--status-info)_40%,transparent)] bg-[var(--status-info-bg)] text-[var(--status-info)]";
  return "border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
}

export function paymentStatusTone(paid: boolean) {
  return paid
    ? "border-[color-mix(in_srgb,var(--status-success)_40%,transparent)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
    : "border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
}

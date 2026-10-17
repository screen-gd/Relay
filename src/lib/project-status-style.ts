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
    return "border-[color-mix(in_srgb,var(--status-success)_40%,transparent)] bg-well text-text-1";
  if (["Review", "Revision", "Client Review"].includes(status))
    return "border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-warn-wash text-warn-text";
  if (status === "Cancelled")
    return "border-[color-mix(in_srgb,var(--status-danger)_40%,transparent)] bg-fail-wash text-fail-text";
  if (status === "In Progress")
    return "border-[color-mix(in_srgb,var(--status-info)_40%,transparent)] bg-well text-text-1";
  return "border-line-row bg-well text-text-2";
}

export function paymentStatusTone(paid: boolean) {
  return paid
    ? "border-[color-mix(in_srgb,var(--status-success)_40%,transparent)] bg-well text-text-1"
    : "border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-warn-wash text-warn-text";
}

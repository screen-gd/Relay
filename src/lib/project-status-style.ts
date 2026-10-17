import type { StatusTone } from "@/components/ui/badge";

export function projectStatusTone(status: string): StatusTone {
  if (status === "Delivered") return "success";
  if (["Review", "Revision", "Client Review"].includes(status))
    return "warning";
  if (status === "Cancelled") return "danger";
  if (status === "In Progress") return "info";
  return "neutral";
}

/** Status colors are limited to dots and icons. */
export function projectStatusColor(status: string) {
  const tone = projectStatusTone(status);
  return tone === "neutral" ? "var(--text-meta)" : `var(--status-${tone})`;
}

export function paymentStatusTone(paid: boolean): StatusTone {
  return paid ? "success" : "warning";
}

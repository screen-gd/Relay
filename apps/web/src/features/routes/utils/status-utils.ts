export function isDoneStatus(status: string) {
  return [
    "delivered",
    "done",
    "paid",
    "published",
    "closed",
    "archived",
    "shipped",
    "completed",
    "released",
  ].some((word) => status.toLowerCase().includes(word));
}

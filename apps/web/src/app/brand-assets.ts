export const emptyStateAssets = {
  projects: "/brand/empty-states/projects.png",
  clients: "/brand/empty-states/clients.png",
  schedule: "/brand/empty-states/schedule.png",
  library: "/brand/empty-states/library.png",
  feedback: "/brand/empty-states/feedback.png",
  reports: "/brand/empty-states/reports.png",
  team: "/brand/empty-states/team.png",
  resources: "/brand/empty-states/resources.png",
} as const;

export type EmptyStateAsset = keyof typeof emptyStateAssets;

export function emptyStateAssetFor(title: string): EmptyStateAsset {
  const value = title.toLowerCase();
  if (value.includes("report")) return "reports";
  if (value.includes("client")) return "clients";
  if (
    value.includes("scheduled") ||
    value.includes("calendar") ||
    value.includes("deadline")
  )
    return "schedule";
  if (
    value.includes("feedback") ||
    value.includes("comment") ||
    value.includes("message")
  )
    return "feedback";
  if (
    value.includes("team") ||
    value.includes("member") ||
    value.includes("notification") ||
    value.includes("activity")
  )
    return "team";
  if (
    value.includes("media") ||
    value.includes("package") ||
    value.includes("template")
  )
    return "library";
  if (value.includes("resource") || value.includes("integration"))
    return "resources";
  return "projects";
}

import { createFileRoute } from "@tanstack/react-router";
import { DashboardApplication } from "@/features/dashboard/dashboard-application";
import { pageMeta } from "@/lib/route-head";

export const Route = createFileRoute("/sample-studio/")({
  head: () => ({
    meta: pageMeta(
      "Sample Studio | Relay",
      "Explore a populated, read-only Relay production workspace."
    ),
  }),
  component: DashboardApplication,
});

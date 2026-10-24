import { createFileRoute } from "@tanstack/react-router";
import { DashboardApplication } from "@/features/dashboard/dashboard-application";
import { canonical } from "@/lib/route-head";

export const Route = createFileRoute("/_workspace/")({
  head: () => ({ links: [canonical("/")] }),
  component: DashboardApplication,
});

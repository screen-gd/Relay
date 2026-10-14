import { createFileRoute } from "@tanstack/react-router";
import { ReportsApplication } from "@/features/reports/reports-application";

export const Route = createFileRoute("/_workspace/reports")({
  component: ReportsApplication,
});

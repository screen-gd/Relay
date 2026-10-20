import { createFileRoute } from "@tanstack/react-router";
import { TimelineApplication } from "@/features/schedule/timeline-application";

export const Route = createFileRoute("/_workspace/timeline")({
  component: TimelineApplication,
});

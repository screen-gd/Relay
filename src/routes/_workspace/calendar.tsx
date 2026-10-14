import { createFileRoute } from "@tanstack/react-router";
import { CalendarApplication } from "@/features/schedule/calendar-application";

export const Route = createFileRoute("/_workspace/calendar")({
  component: CalendarApplication,
});

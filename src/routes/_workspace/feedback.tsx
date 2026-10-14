import { createFileRoute } from "@tanstack/react-router";
import { FeedbackApplication } from "@/features/feedback/feedback-application";

export const Route = createFileRoute("/_workspace/feedback")({
  component: FeedbackApplication,
});

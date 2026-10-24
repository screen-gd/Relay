import { createFileRoute } from "@tanstack/react-router";
import { MediaApplication } from "@/features/media/media-application";

export const Route = createFileRoute("/_workspace/media")({
  component: MediaApplication,
});

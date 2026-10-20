import { createFileRoute } from "@tanstack/react-router";
import { ProfileApplication } from "@/features/profile/profile-application";

export const Route = createFileRoute("/_workspace/profile/")({
  component: ProfileApplication,
});

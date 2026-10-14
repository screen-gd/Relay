import { createFileRoute } from "@tanstack/react-router";
import { ProfileEditApplication } from "@/features/profile/profile-edit-application";

export const Route = createFileRoute("/_workspace/profile/edit")({
  component: ProfileEditApplication,
});

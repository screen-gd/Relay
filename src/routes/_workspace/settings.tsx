import { createFileRoute } from "@tanstack/react-router";
import { SettingsApplication } from "@/features/settings/settings-application";

export const Route = createFileRoute("/_workspace/settings")({
  component: SettingsApplication,
});

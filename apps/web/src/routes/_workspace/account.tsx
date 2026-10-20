import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsPage } from "@/features/account/account-page";

export const Route = createFileRoute("/_workspace/account")({
  component: AccountSettingsPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { SettingsApplication } from "@/features/settings/settings-application";
import {
  isSettingsSection,
  type SettingsSectionId,
} from "@/components/workspace-navigation";

export const Route = createFileRoute("/_workspace/settings")({
  // The sidebar links to each settings section by its search param.
  validateSearch: (
    search: Record<string, unknown>
  ): { section?: SettingsSectionId } =>
    isSettingsSection(search.section) ? { section: search.section } : {},
  component: SettingsApplication,
});

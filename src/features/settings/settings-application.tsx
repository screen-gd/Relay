"use client";

import { SettingsDesignPage } from "@/features/settings/settings-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function SettingsApplication() {
  const { settings, setSettings, setToast } = useData();
  const { teamData } = useProjectAccess();
  return (
    <SettingsDesignPage
      settings={settings}
      setSettings={setSettings}
      notify={(message, tone = "success") => setToast({ message, tone })}
      teamWorkspace={teamData?.workspace}
      canManageWorkspace={teamData?.currentMember.role === "Owner"}
    />
  );
}

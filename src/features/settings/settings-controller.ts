"use client";

import { useMutation } from "convex/react";
import { useData } from "@/lib/data-context";
import { updateWorkspaceSettings } from "@/features/team/team-api";

export function useSettingsController() {
  const { exportBackup, importBackup, settingsSaveState, retrySettingsSave } =
    useData();
  const saveWorkspaceSettings = useMutation(updateWorkspaceSettings);
  return {
    exportBackup,
    importBackup,
    settingsSaveState,
    retrySettingsSave,
    updateWorkspaceSettings: saveWorkspaceSettings,
  };
}

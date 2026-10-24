"use client";

import { useMutation } from "convex/react";
import { useData } from "@/lib/data-context";
import { api } from "../../../convex/_generated/api";

export function useSettingsController() {
  const { exportBackup, importBackup, settingsSaveState, retrySettingsSave } =
    useData();
  const saveWorkspaceSettings = useMutation(api.team.updateWorkspaceSettings);
  return {
    exportBackup,
    importBackup,
    settingsSaveState,
    retrySettingsSave,
    updateWorkspaceSettings: saveWorkspaceSettings,
  };
}

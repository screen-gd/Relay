"use client";

import { ProfileEditPage } from "@/features/profile/profile-page";
import { useData } from "@/lib/data-context";

export function ProfileEditApplication() {
  const { settings, setSettings } = useData();
  return <ProfileEditPage settings={settings} setSettings={setSettings} />;
}

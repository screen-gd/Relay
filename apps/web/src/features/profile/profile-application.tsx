"use client";

import { ProfileDesignPage } from "@/features/profile/profile-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function ProfileApplication() {
  const { settings } = useData();
  const { personalProjects } = useProjectAccess();
  return <ProfileDesignPage projects={personalProjects} settings={settings} />;
}

"use client";

import { TeamDesignPage } from "@/features/team/team-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function TeamApplication() {
  const { settings } = useData();
  const { projects } = useProjectAccess();
  return <TeamDesignPage projects={projects} settings={settings} />;
}

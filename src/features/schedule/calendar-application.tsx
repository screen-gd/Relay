"use client";

import { PrecisionCalendar } from "@/components/precision-schedule";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";

export function CalendarApplication() {
  const { settings } = useData();
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  const discovery = useWorkspaceDiscovery();
  return (
    <PrecisionCalendar
      projects={personalProjects}
      outputs={discovery?.outputs ?? []}
      settings={settings}
      onViewProject={openProjectDetails}
    />
  );
}

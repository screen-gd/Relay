"use client";

import { PrecisionCalendar } from "@/components/precision-schedule";
import { useData } from "@/lib/data-context";
import { useProjectHistory } from "@/lib/project-history";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";

export function CalendarApplication() {
  const { settings } = useData();
  const { personalProjects, workspaceSubscription } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  const discovery = useWorkspaceDiscovery();
  // Past due dates of completed Projects are a paid feature, as in the Timeline.
  useProjectHistory(
    Boolean(workspaceSubscription) && workspaceSubscription?.plan !== "free"
  );
  return (
    <PrecisionCalendar
      projects={personalProjects}
      outputs={discovery?.outputs ?? []}
      settings={settings}
      onViewProject={openProjectDetails}
    />
  );
}

"use client";

import { PrecisionTimeline } from "@/components/precision-schedule";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function TimelineApplication() {
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  return (
    <PrecisionTimeline
      projects={personalProjects}
      onViewProject={openProjectDetails}
    />
  );
}

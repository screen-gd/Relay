"use client";

import { PrecisionMedia } from "@/components/precision-media";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function MediaApplication() {
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  return (
    <PrecisionMedia
      projects={personalProjects}
      onViewProject={openProjectDetails}
    />
  );
}

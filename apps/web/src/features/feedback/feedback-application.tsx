"use client";

import { PrecisionFeedback } from "@/components/precision-workspaces";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function FeedbackApplication() {
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  return (
    <PrecisionFeedback
      projects={personalProjects}
      onViewProject={openProjectDetails}
    />
  );
}

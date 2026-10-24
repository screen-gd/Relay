"use client";

import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { PrecisionTimeline } from "@/components/precision-schedule";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useProjectHistory } from "@/lib/project-history";

export function TimelineApplication() {
  const { personalProjects, workspaceSubscription } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  // Completed Projects in the Timeline are a paid feature; Free shows live work.
  const historyLocked = workspaceSubscription?.plan === "free";
  useProjectHistory(Boolean(workspaceSubscription) && !historyLocked);
  return (
    <PrecisionTimeline
      projects={personalProjects}
      onViewProject={openProjectDetails}
      notice={
        historyLocked ? (
          <CapabilityUpgradePrompt capability="scheduleHistory" />
        ) : undefined
      }
    />
  );
}

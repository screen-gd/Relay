"use client";

import { TemplatesDesignPage } from "@/features/templates/templates-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function TemplatesApplication() {
  const { isAuthEnabled } = useData();
  const {
    teamData,
    canManageTeamProjects,
    workspaceSubscription,
    customWorkflowTemplatesLocked,
  } = useProjectAccess();
  const { openBlankProject, openTemplateProject } = useProjectActions();
  return (
    <TemplatesDesignPage
      onUseBlank={() => openBlankProject("personal")}
      onUseTemplate={(template) => openTemplateProject(template, "personal")}
      canManageTemplates={
        (!teamData || canManageTeamProjects) &&
        (!isAuthEnabled ||
          Boolean(workspaceSubscription?.capabilities.customWorkflowTemplates))
      }
      customTemplatesLocked={customWorkflowTemplatesLocked}
    />
  );
}

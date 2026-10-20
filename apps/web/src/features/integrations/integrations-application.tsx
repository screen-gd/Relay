"use client";

import { IntegrationsDesignPage } from "@/features/integrations/integrations-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function IntegrationsApplication() {
  const { settings, setSettings, setToast } = useData();
  const { personalProjects } = useProjectAccess();
  const { openEditProject } = useProjectActions();
  return (
    <IntegrationsDesignPage
      projects={personalProjects}
      settings={settings}
      setSettings={setSettings}
      notify={(message, tone = "success") => setToast({ message, tone })}
      onEditProject={openEditProject}
    />
  );
}

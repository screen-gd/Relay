"use client";

import { PrecisionClients } from "@/components/precision-workspaces";
import { useData } from "@/lib/data-context";
import { useProjectHistory } from "@/lib/project-history";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useClientActions } from "./use-client-actions";

export function ClientsApplication() {
  const { settings } = useData();
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  const { addClient, updateClient } = useClientActions();
  // A Client's history and totals include completed Projects.
  const { loading } = useProjectHistory();
  return (
    <PrecisionClients
      projects={personalProjects}
      settings={settings}
      loading={loading}
      onAddClient={addClient}
      onUpdateClient={updateClient}
      onViewProject={openProjectDetails}
    />
  );
}

"use client";

import { PrecisionFiles } from "@/components/precision-files";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";

export function FilesApplication() {
  const { isSignedIn } = useData();
  const { projects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  const discovery = useWorkspaceDiscovery();
  return (
    <PrecisionFiles
      files={discovery?.files ?? []}
      projectTitles={Object.fromEntries(
        projects.map((project) => [project.id, project.title])
      )}
      loading={Boolean(isSignedIn && discovery === undefined)}
      onOpenProject={(id) => {
        const project = projects.find((item) => item.id === id);
        if (project) openProjectDetails(project);
      }}
    />
  );
}

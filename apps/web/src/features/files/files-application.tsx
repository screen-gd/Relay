"use client";

import { PrecisionFiles } from "@/components/precision-files";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectNavigation } from "@/features/projects/project-view";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";

export function FilesApplication() {
  const { isSignedIn } = useData();
  const { projects, sample } = useProjectAccess();
  const openProject = useProjectNavigation();
  const discovery = useWorkspaceDiscovery();
  return (
    <PrecisionFiles
      files={discovery?.files ?? []}
      projectTitles={Object.fromEntries(
        projects.map((project) => [project.id, project.title])
      )}
      loading={Boolean(isSignedIn && discovery === undefined)}
      // Files can belong to completed Projects outside the live list, so open
      // by ID; the Project page loads a Project it does not already have.
      onOpenProject={(projectId) => void openProject({ projectId, sample })}
    />
  );
}

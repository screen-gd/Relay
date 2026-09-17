"use client";

import { ResourcesDesignPage } from "@/features/resources/resources-page";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function ResourcesApplication() {
  const { resourceLinks, setResourceLinks, setToast } = useData();
  const { personalProjects } = useProjectAccess();
  return (
    <ResourcesDesignPage
      resources={resourceLinks}
      projects={personalProjects}
      setResources={setResourceLinks}
      notify={(message, tone = "success") => setToast({ message, tone })}
    />
  );
}

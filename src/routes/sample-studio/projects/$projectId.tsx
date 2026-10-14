import { createFileRoute } from "@tanstack/react-router";
import { ProjectsApplication } from "@/features/projects/projects-application";
import { projectViewSearch } from "@/lib/route-head";

export const Route = createFileRoute("/sample-studio/projects/$projectId")({
  validateSearch: projectViewSearch,
  component: SampleProjectRoute,
});

function SampleProjectRoute() {
  const { projectId } = Route.useParams();
  const { view } = Route.useSearch();
  return (
    <ProjectsApplication projectId={projectId} projectView={view} sample />
  );
}

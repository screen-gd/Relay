import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";
import { noIndex } from "@/lib/route-head";

// Pathless layout that wraps every signed-in workspace page in the shell.
export const Route = createFileRoute("/_workspace")({
  head: () => ({ meta: [noIndex] }),
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return (
    <WorkspaceRuntime>
      <Outlet />
    </WorkspaceRuntime>
  );
}

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DataProvider } from "@/lib/data-context";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";
import { noIndex } from "@/lib/route-head";

// Read-only demo workspace backed by sample data instead of the user's data.
export const Route = createFileRoute("/sample-studio")({
  head: () => ({ meta: [noIndex] }),
  component: SampleStudioLayout,
});

function SampleStudioLayout() {
  return (
    <DataProvider mode="sample">
      <WorkspaceRuntime sample>
        <Outlet />
      </WorkspaceRuntime>
    </DataProvider>
  );
}

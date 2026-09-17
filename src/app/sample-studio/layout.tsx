import type { ReactNode } from "react";
import { DataProvider } from "@/lib/data-context";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";

export default function SampleStudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DataProvider mode="sample">
      <WorkspaceRuntime sample>{children}</WorkspaceRuntime>
    </DataProvider>
  );
}

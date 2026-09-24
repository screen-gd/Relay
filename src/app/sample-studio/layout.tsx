import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DataProvider } from "@/lib/data-context";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

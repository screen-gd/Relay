import type { ReactNode } from "react";
import type { Metadata } from "next";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceRuntime>{children}</WorkspaceRuntime>;
}

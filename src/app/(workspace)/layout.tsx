import type { ReactNode } from "react";
import { WorkspaceRuntime } from "@/features/workspace/workspace-runtime";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceRuntime>{children}</WorkspaceRuntime>;
}

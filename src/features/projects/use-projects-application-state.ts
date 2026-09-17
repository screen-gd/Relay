"use client";

import { useEffect, useState } from "react";

import {
  projectWorkspaceView,
  type ProjectWorkspaceView,
} from "./project-view";

export type ProjectRouteState = {
  activeProjectView: ProjectWorkspaceView;
  setActiveProjectView: (view: ProjectWorkspaceView) => void;
  detailProjectId: string;
};

export function useProjectsApplicationState({
  projectId,
  projectView,
}: {
  projectId?: string;
  projectView?: string;
}): ProjectRouteState {
  const [activeProjectView, setActiveProjectView] =
    useState<ProjectWorkspaceView>(() =>
      projectWorkspaceView(
        projectView ??
          (typeof window === "undefined"
            ? null
            : window.localStorage.getItem("relay:last-project-workspace-view"))
      )
    );
  const [detailProjectId, setDetailProjectId] = useState(projectId ?? "");

  useEffect(() => {
    setDetailProjectId(projectId ?? "");
  }, [projectId]);

  useEffect(() => {
    setActiveProjectView(
      projectWorkspaceView(
        projectView ??
          (typeof window === "undefined"
            ? null
            : window.localStorage.getItem("relay:last-project-workspace-view"))
      )
    );
  }, [projectId, projectView]);

  return { activeProjectView, setActiveProjectView, detailProjectId };
}

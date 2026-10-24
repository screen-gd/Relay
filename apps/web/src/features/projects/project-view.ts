import { linkOptions, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export type ProjectWorkspaceView =
  "overview" | "outputs" | "review" | "files" | "assets" | "activity";

export function projectWorkspaceView(
  value: string | null
): ProjectWorkspaceView {
  return value === "overview" ||
    value === "outputs" ||
    value === "review" ||
    value === "files" ||
    value === "assets" ||
    value === "activity"
    ? value
    : "overview";
}

export function projectHref({
  projectId,
  view,
  sample = false,
}: {
  projectId: string;
  view?: ProjectWorkspaceView;
  sample?: boolean;
}) {
  const path = `${sample ? "/sample-studio" : ""}/projects/${encodeURIComponent(projectId)}`;
  return view ? `${path}?view=${view}` : path;
}

/**
 * Typed `Link` options for a workspace project page, e.g.
 * `<Link {...projectLink({ projectId, view: "outputs" })} hash="output-1">`.
 */
export function projectLink({
  projectId,
  view,
}: {
  projectId: string;
  view?: ProjectWorkspaceView;
}) {
  return linkOptions({
    to: "/projects/$projectId",
    params: { projectId },
    search: { view },
  });
}

/**
 * Returns a function that opens a project page through the router. Use it
 * instead of pushing `projectHref` strings so params and `?view=` stay typed.
 * Pass `replace` to swap the current history entry, e.g. when changing tabs.
 */
export function useProjectNavigation() {
  const navigate = useNavigate();
  return useCallback(
    ({
      projectId,
      view,
      sample = false,
      replace = false,
    }: {
      projectId: string;
      view?: ProjectWorkspaceView;
      sample?: boolean;
      replace?: boolean;
    }) =>
      sample
        ? navigate({
            to: "/sample-studio/projects/$projectId",
            params: { projectId },
            search: { view },
            replace,
          })
        : navigate({ ...projectLink({ projectId, view }), replace }),
    [navigate]
  );
}

export type WorkspaceMemberOption = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export type ProjectActivityEvent = {
  id: string;
  projectId: string;
  actorName: string;
  kind: string;
  message: string;
  detail?: string;
  createdAt: string;
};

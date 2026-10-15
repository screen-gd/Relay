import {
  projectHref,
  type ProjectWorkspaceView,
} from "@/features/projects/project-view";

/**
 * One AI action, named the way a person would say it, with the place it runs.
 * Every surface that shows where AI lives reads this list, so a feature is
 * never missing from one menu and present in another.
 */
export type AiTool = {
  id: string;
  /** The action, in the words a person uses for it. */
  label: string;
  /** Where the action is offered, in the words the app uses for it. */
  home: string;
  /** The project view that hosts it, when it lives on a project. */
  projectView?: ProjectWorkspaceView;
  /** The page that hosts it, when it does not live on a project. */
  href?: string;
  /** Words a person might type to find it. */
  keywords: string;
};

export const aiTools: readonly AiTool[] = [
  {
    id: "feedback-revision-list",
    label: "Turn feedback into revisions",
    home: "Project · Outputs",
    projectView: "outputs",
    keywords: "revision list client notes comments",
  },
  {
    id: "client-status-draft",
    label: "Draft a client status update",
    home: "Project · Review",
    projectView: "review",
    keywords: "status update client draft progress",
  },
  {
    id: "brief-import",
    label: "Import a brief",
    home: "Projects → New project",
    href: "/projects",
    keywords: "brief import client request paste",
  },
  {
    id: "transcript-review",
    label: "Match comments in a transcript",
    home: "Project · Outputs",
    projectView: "outputs",
    keywords: "transcript call notes feedback",
  },
  {
    id: "version-changelog",
    label: "Draft a version changelog",
    home: "Project · Outputs",
    projectView: "outputs",
    keywords: "changelog summary what changed",
  },
  {
    id: "change-order-draft",
    label: "Draft a change order",
    home: "Project · Overview",
    projectView: "overview",
    keywords: "change order scope extra revisions quote",
  },
  {
    id: "earnings-qa",
    label: "Ask about your earnings",
    home: "Payments",
    href: "/reports",
    keywords: "earnings payments income questions",
  },
  {
    id: "risk-digest",
    label: "Flag deadline risk",
    home: "Dashboard",
    href: "/",
    keywords: "risk deadline overdue late",
  },
];

/** The action the sidebar and the palette lead with. */
export const featuredAiToolIds = [
  "feedback-revision-list",
  "client-status-draft",
  "brief-import",
] as const;

/** The AI actions a page offers, for the nav badge and its tooltip. */
export function aiToolsForPage(page: string): AiTool[] {
  return aiTools.filter((tool) => {
    if (page === "projects") return Boolean(tool.projectView);
    if (page === "reports") return tool.href === "/reports";
    if (page === "dashboard") return tool.href === "/";
    return false;
  });
}

/** The project the current route is showing, when it is showing one. */
export function projectIdFromPath(pathname: string) {
  const match = /^(\/sample-studio)?\/projects\/([^/?#]+)/.exec(pathname);
  return match?.[2] ? decodeURIComponent(match[2]) : undefined;
}

/**
 * Where an AI action runs. A project action lands on the open project's own
 * view, and on the Projects hub when no project is open, so the action always
 * leads somewhere the action is offered.
 */
export function aiToolHref(tool: AiTool, pathname: string) {
  if (!tool.projectView) return tool.href ?? "/";
  const sample = pathname.startsWith("/sample-studio");
  const projectId = projectIdFromPath(pathname);
  return projectId
    ? projectHref({ projectId, view: tool.projectView, sample })
    : "/projects";
}

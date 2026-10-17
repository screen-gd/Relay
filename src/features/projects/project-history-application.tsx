"use client";

import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { History } from "@/components/icons";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContentSection,
  PageContent,
  PageEmptyState,
  PageHeader,
  WorkspacePage,
  sectionListClassName,
  sectionRowClassName,
} from "@/components/workspace-page";
import { money } from "@/features/routes/utils/number-utils";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import { useProjectAccess } from "./project-access";
import { projectLink } from "./project-view";

const PAGE_SIZE = 25;

type Scope = "personal" | "team";

/** The fields a history row shows, shared by cloud and local Projects. */
type HistoryRow = {
  id: string;
  title: string;
  clientId?: string;
  status: string;
  archived?: boolean;
  paid?: boolean;
  earnings: number;
  completedAt?: string;
  updatedAt?: string;
};

/** Mirrors the server lifecycle rule for Local Mode, where nothing is paged. */
function isLocalHistory(project: HistoryRow) {
  return (
    project.archived ||
    project.status === "Cancelled" ||
    (project.status === "Delivered" &&
      (project.paid || !(project.earnings > 0)))
  );
}

function rowLabel(project: HistoryRow) {
  if (project.archived) return "Archived";
  if (project.status === "Cancelled") return "Cancelled";
  return project.paid ? "Paid" : "Delivered";
}

function formatDay(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/**
 * Completed Projects: paid deliveries, archived and cancelled work. Signed-in
 * workspaces page through history 25 at a time and load more only on request,
 * so browsing old work never keeps a large subscription open.
 */
export function ProjectHistoryApplication() {
  const navigate = useNavigate();
  const { settings, items, isSignedIn } = useData();
  const { isAuthenticated } = useConvexAuth();
  const { currentTeamId } = useProjectAccess();
  const [scope, setScope] = useState<Scope>("personal");
  const cloud = isSignedIn && isAuthenticated;
  const history = usePaginatedQuery(
    api.projects.historyPage,
    cloud ? { scope } : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const clientNames = useMemo(
    () => new Map(settings.clients.map((client) => [client.id, client.name])),
    [settings.clients]
  );
  const rows: HistoryRow[] = cloud
    ? history.results
    : items.filter((project) => !project.teamId && isLocalHistory(project));
  const loading = cloud && history.status === "LoadingFirstPage";

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="History"
        description="Delivered and paid, archived, and cancelled Projects."
        actions={
          <Button
            variant="outline"
            onClick={() => void navigate({ to: "/projects" })}
          >
            Projects
          </Button>
        }
      />
      <PageContent>
        {cloud && currentTeamId ? (
          <Tabs
            value={scope}
            onValueChange={(value) => setScope(value as Scope)}
          >
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        {loading ? null : rows.length === 0 ? (
          <PageEmptyState
            icon={<History />}
            title="No completed Projects yet"
            description="Projects move here once they are delivered and paid, archived, or cancelled."
          />
        ) : (
          <ContentSection
            bodyMode="flush"
            footer={
              cloud && history.status !== "Exhausted" ? (
                <Button
                  variant="outline"
                  disabled={history.status !== "CanLoadMore"}
                  onClick={() => history.loadMore(PAGE_SIZE)}
                >
                  Load more
                </Button>
              ) : undefined
            }
          >
            <ul
              className={sectionListClassName}
              aria-label="Completed Projects"
            >
              {rows.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className={cn(
                      sectionRowClassName,
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left sm:grid-cols-[minmax(0,1fr)_10rem_7rem_6rem]"
                    )}
                    onClick={() =>
                      void navigate(projectLink({ projectId: project.id }))
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-foreground type-label">
                        {project.title}
                      </span>
                      <span className="block truncate text-muted-foreground type-label-sm">
                        {(project.clientId &&
                          clientNames.get(project.clientId)) ||
                          "No client"}
                      </span>
                    </span>
                    <span className="hidden text-muted-foreground sm:block type-label-sm">
                      {formatDay(project.completedAt ?? project.updatedAt)}
                    </span>
                    <span className="hidden text-right tabular-nums text-foreground sm:block type-body">
                      {project.earnings > 0
                        ? money(project.earnings, settings.currencyCode)
                        : ""}
                    </span>
                    <span className="text-right text-muted-foreground type-label-sm">
                      {rowLabel(project)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ContentSection>
        )}
      </PageContent>
    </WorkspacePage>
  );
}

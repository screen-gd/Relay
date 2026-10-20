"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
const PAGE_SIZE = 100;

type PaginatedResult = ReturnType<typeof usePaginatedQuery>;

/** Loads every page of a paginated query while it is enabled. */
function useLoadAllPages({ status, loadMore }: PaginatedResult) {
  useEffect(() => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  }, [status, loadMore]);
}

/**
 * The signed-in workspace's Projects. The live list (in progress or awaiting
 * payment) stays subscribed; completed history loads only while a screen asks
 * for it, and `pinnedProjectId` loads one Project that is not in the live list,
 * such as a completed Project opened from history.
 *
 * Summaries consume complete pages, never a silently truncated list.
 */
export function useWorkspaceProjectData(
  authenticated: boolean,
  {
    includeHistory = false,
    pinnedProjectId,
  }: { includeHistory?: boolean; pinnedProjectId?: string } = {}
) {
  const personal = usePaginatedQuery(
    api.projects.listPage,
    authenticated ? { scope: "personal" } : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const team = usePaginatedQuery(
    api.projects.listPage,
    authenticated ? { scope: "team" } : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const batches = usePaginatedQuery(
    api.projects.salaryBatchesPage,
    authenticated ? {} : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const loadHistory = authenticated && includeHistory;
  const personalHistory = usePaginatedQuery(
    api.projects.historyPage,
    loadHistory ? { scope: "personal" } : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const teamHistory = usePaginatedQuery(
    api.projects.historyPage,
    loadHistory ? { scope: "team" } : "skip",
    { initialNumItems: PAGE_SIZE }
  );
  const pinned = useQuery(
    api.projects.get,
    authenticated && pinnedProjectId ? { projectId: pinnedProjectId } : "skip"
  );
  useLoadAllPages(personal);
  useLoadAllPages(team);
  useLoadAllPages(batches);
  useLoadAllPages(personalHistory);
  useLoadAllPages(teamHistory);

  const liveReady =
    personal.status === "Exhausted" && team.status === "Exhausted";
  const historyReady =
    personalHistory.status === "Exhausted" &&
    teamHistory.status === "Exhausted";
  const projects = useMemo(() => {
    if (!authenticated) return [];
    if (!liveReady) return undefined;
    const byId = new Map(
      [...personal.results, ...team.results].map((project) => [
        project.id,
        project,
      ])
    );
    // History arrives after the live list, so the workspace never waits on it.
    if (historyReady)
      for (const project of [
        ...personalHistory.results,
        ...teamHistory.results,
      ])
        if (!byId.has(project.id)) byId.set(project.id, project);
    if (pinned && !byId.has(pinned.id)) byId.set(pinned.id, pinned);
    return [...byId.values()];
  }, [
    authenticated,
    liveReady,
    historyReady,
    personal.results,
    team.results,
    personalHistory.results,
    teamHistory.results,
    pinned,
  ]);
  return {
    projects,
    batches: !authenticated
      ? []
      : batches.status === "Exhausted"
        ? batches.results
        : undefined,
    /** The pinned Project lookup finished and found nothing the caller can see. */
    pinnedMissing: Boolean(pinnedProjectId) && pinned === null,
    /** History was requested and has not finished loading. */
    historyLoading: loadHistory && !historyReady,
  };
}

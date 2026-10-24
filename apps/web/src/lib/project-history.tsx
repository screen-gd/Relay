"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ConvexError } from "convex/values";
import { OPEN_PROJECT_LIMIT_CODE } from "@relay/shared/subscription-plans";

/** True for the error a Free workspace gets when it is at its Project limit. */
export function isOpenProjectLimitError(error: unknown) {
  return (
    error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    error.data.code === OPEN_PROJECT_LIMIT_CODE
  );
}

/**
 * Completed Projects load only while a screen that needs past work is open
 * (Reports, the Dashboard, Clients, Media, the Projects archive filter, the
 * Settings data exports, a paid Timeline), so editing live work never re-runs
 * queries over finished Projects. History rarely changes, so Convex serves
 * repeat loads from its query cache.
 */
type ProjectHistoryControls = {
  /** Registers a screen's need for history; returns a release function. */
  requestHistory: () => () => void;
  /** Loads one Project outside the live list; returns a release function. */
  pinProject: (projectId: string) => () => void;
  /** Whether the lookup for a pinned Project has finished, found or not. */
  isPinResolved: (projectId: string) => boolean;
  /** Requested history is still arriving, so totals over it are partial. */
  historyLoading: boolean;
  /** Some screen's request is registered, so history is being loaded or held. */
  historyIncluded: boolean;
};

const noop = () => () => undefined;

// Local and sample workspaces already hold every Project in the browser, so the
// default controls do nothing.
const ProjectHistoryContext = createContext<ProjectHistoryControls>({
  requestHistory: noop,
  pinProject: noop,
  isPinResolved: () => true,
  historyLoading: false,
  historyIncluded: true,
});

/** State for the cloud workspace provider; it feeds `useWorkspaceProjectData`. */
export function useProjectHistoryState() {
  const [historyRequests, setHistoryRequests] = useState(0);
  const [pins, setPins] = useState<string[]>([]);
  const requestHistory = useCallback(() => {
    setHistoryRequests((count) => count + 1);
    return () => setHistoryRequests((count) => count - 1);
  }, []);
  const pinProject = useCallback((projectId: string) => {
    setPins((current) => [...current, projectId]);
    return () =>
      setPins((current) => {
        const index = current.lastIndexOf(projectId);
        return index < 0
          ? current
          : [...current.slice(0, index), ...current.slice(index + 1)];
      });
  }, []);
  return {
    includeHistory: historyRequests > 0,
    pinnedProjectId: pins.at(-1),
    requestHistory,
    pinProject,
  };
}

export function ProjectHistoryProvider({
  controls,
  children,
}: {
  controls: ProjectHistoryControls;
  children: ReactNode;
}) {
  return (
    <ProjectHistoryContext.Provider value={controls}>
      {children}
    </ProjectHistoryContext.Provider>
  );
}

/**
 * Keeps completed history loaded while the calling screen is mounted.
 * Returns whether that history is still loading, so totals can wait for it.
 */
export function useProjectHistory(enabled = true) {
  const { requestHistory, historyLoading, historyIncluded } = useContext(
    ProjectHistoryContext
  );
  useEffect(
    () => (enabled ? requestHistory() : undefined),
    [enabled, requestHistory]
  );
  // Until this screen's request takes effect, history has not started loading,
  // so an export clicked in that first render would still be partial.
  return { loading: enabled && (historyLoading || !historyIncluded) };
}

/**
 * Loads a Project that is not in the live list, such as a completed Project
 * opened from history. Returns false while that lookup is still loading.
 */
export function usePinnedProject(projectId: string | undefined) {
  const { pinProject, isPinResolved } = useContext(ProjectHistoryContext);
  useEffect(
    () => (projectId ? pinProject(projectId) : undefined),
    [projectId, pinProject]
  );
  return !projectId || isPinResolved(projectId);
}

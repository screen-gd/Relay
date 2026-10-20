"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useData } from "@/lib/data-context";
import type { ProjectActivityEvent } from "./project-view";

export const PROJECT_ACTIVITY_STORAGE_KEY = "cutlab-studio:project-activity:v1";

export type ProjectActivityDraft = Omit<
  ProjectActivityEvent,
  "id" | "actorName" | "createdAt"
> &
  Partial<Pick<ProjectActivityEvent, "actorName" | "createdAt">>;

export type ProjectSessionActivity = {
  id: string;
  kind: "created" | "updated" | "status" | "delivered" | "team";
  message: string;
  projectId?: string;
  actor?: string;
  createdAt: string;
};

export type ProjectSessionActivityDraft = Omit<
  ProjectSessionActivity,
  "id" | "createdAt"
> &
  Partial<Pick<ProjectSessionActivity, "createdAt">>;

export type ProjectSessionActivityListener = (
  activity: ProjectSessionActivity
) => void;

export type ProjectActivity = {
  localActivity: ProjectActivityEvent[];
  recordProjectActivity: (
    event: ProjectActivityDraft,
    sessionActivity?: ProjectSessionActivityDraft
  ) => void;
  removeProjectActivity: (projectId: string) => void;
  subscribeToProjectActivity: (
    listener: ProjectSessionActivityListener
  ) => () => void;
};

function readActivity(): ProjectActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(PROJECT_ACTIVITY_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (event): event is ProjectActivityEvent =>
          Boolean(event) &&
          typeof event === "object" &&
          "id" in event &&
          typeof event.id === "string" &&
          "projectId" in event &&
          typeof event.projectId === "string" &&
          "actorName" in event &&
          typeof event.actorName === "string" &&
          "kind" in event &&
          typeof event.kind === "string" &&
          "message" in event &&
          typeof event.message === "string" &&
          "createdAt" in event &&
          typeof event.createdAt === "string"
      )
      .slice(0, 500);
  } catch {
    return [];
  }
}

function createActivityId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function ProjectActivityProvider({
  children,
  sample = false,
}: {
  children: ReactNode;
  sample?: boolean;
}) {
  const value = useProjectActivityValue(sample);
  return (
    <ProjectActivityContext.Provider value={value}>
      {children}
    </ProjectActivityContext.Provider>
  );
}

export function useProjectActivity(): ProjectActivity {
  const value = useContext(ProjectActivityContext);
  if (!value) {
    throw new Error(
      "useProjectActivity must be used within a ProjectActivityProvider"
    );
  }
  return value;
}

export function useProjectActivityValue(sample: boolean): ProjectActivity {
  const { settings } = useData();
  const [localActivity, setLocalActivity] = useState(readActivity);
  const listeners = useRef(new Set<ProjectSessionActivityListener>());

  useEffect(() => {
    if (typeof window === "undefined" || sample) return;
    window.localStorage.setItem(
      PROJECT_ACTIVITY_STORAGE_KEY,
      JSON.stringify(localActivity.slice(0, 500))
    );
  }, [localActivity, sample]);

  const recordProjectActivity = useCallback(
    (
      event: ProjectActivityDraft,
      sessionActivity?: ProjectSessionActivityDraft
    ) => {
      const id = createActivityId();
      const createdAt =
        event.createdAt ??
        sessionActivity?.createdAt ??
        new Date().toISOString();
      const persistedActivity: ProjectActivityEvent = {
        ...event,
        id,
        actorName: event.actorName ?? (settings.profileName || "Local user"),
        createdAt,
      };
      setLocalActivity((current) =>
        [persistedActivity, ...current].slice(0, 500)
      );
      if (sessionActivity) {
        const nextSessionActivity: ProjectSessionActivity = {
          ...sessionActivity,
          id,
          createdAt: sessionActivity.createdAt ?? createdAt,
        };
        listeners.current.forEach((listener) => listener(nextSessionActivity));
      }
    },
    [settings.profileName]
  );

  const removeProjectActivity = useCallback((projectId: string) => {
    setLocalActivity((current) =>
      current.filter((event) => event.projectId !== projectId)
    );
  }, []);

  const subscribeToProjectActivity = useCallback(
    (listener: ProjectSessionActivityListener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
    []
  );

  return useMemo(
    () => ({
      localActivity,
      recordProjectActivity,
      removeProjectActivity,
      subscribeToProjectActivity,
    }),
    [
      localActivity,
      recordProjectActivity,
      removeProjectActivity,
      subscribeToProjectActivity,
    ]
  );
}

const ProjectActivityContext = createContext<ProjectActivity | null>(null);

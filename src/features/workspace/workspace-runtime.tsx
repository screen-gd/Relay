"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  WorkspaceShell,
  workspacePageForPath,
} from "@/components/workspace-shell";
import { SampleModeBar } from "@/components/sample-mode-bar";
import { useData, useProjectGroups } from "@/lib/data-context";
import { useClientActions } from "@/features/clients/use-client-actions";
import {
  ProjectActionsProvider,
  useProjectActions,
} from "@/features/projects/project-actions-provider";
import { useProjectAccess } from "@/features/projects/project-access";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";
import { buildWorkspaceSearchIndex } from "@/features/workspace-discovery/workspace-discovery";
import {
  AppLoadingStatus,
  AppToast,
} from "@/features/routes/shared/app-feedback";
import { applyRootThemeVariables } from "@/features/routes/shared/route-theme";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { WorkspaceOnboarding } from "./workspace-onboarding";

export function WorkspaceRuntime({
  children,
  sample = false,
}: {
  children: ReactNode;
  sample?: boolean;
}) {
  return (
    <ProjectActionsProvider sample={sample}>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </ProjectActionsProvider>
  );
}

function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const { settings, setSettings, isAuthLoaded, toast, setToast } = useData();
  const {
    sample,
    projects,
    personalProjects,
    activeTeamMembers,
    teamData,
    canCreateProjects,
  } = useProjectAccess();
  const { openNewProject } = useProjectActions();
  const { groups } = useProjectGroups();
  const { clientRecords } = useClientActions();
  const discovery = useWorkspaceDiscovery();
  const searchRecords = useMemo(
    () =>
      buildWorkspaceSearchIndex({
        clients: clientRecords,
        groups,
        projects,
        outputs: discovery?.outputs ?? [],
        files: discovery?.files ?? [],
      }),
    [clientRecords, groups, projects, discovery]
  );

  useEffect(() => applyRootThemeVariables(settings), [settings]);

  const teamWorkspace = teamData?.workspace;
  useEffect(() => {
    if (!teamWorkspace) return;
    const studioName = teamWorkspace.name;
    const currencyCode = teamWorkspace.currencyCode || settings.currencyCode;
    const timeZone = teamWorkspace.timeZone || settings.timeZone;
    if (
      studioName === settings.studioName &&
      currencyCode === settings.currencyCode &&
      timeZone === settings.timeZone
    )
      return;
    setSettings((current) => ({
      ...current,
      studioName,
      currencyCode,
      timeZone,
    }));
  }, [
    teamWorkspace,
    settings.studioName,
    settings.currencyCode,
    settings.timeZone,
    setSettings,
  ]);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
    document.getElementById("main-content")?.scrollTo(0, 0);
  }, [pathname]);

  if (!isAuthLoaded) return <AppLoadingStatus />;

  const standalone = pathname === "/profile";
  return (
    <>
      {standalone ? (
        <div className="motion-enter min-h-dvh bg-[var(--app-canvas)] text-[var(--app-ink)] transition-colors">
          {children}
        </div>
      ) : (
        <WorkspaceShell
          page={workspacePageForPath(pathname)}
          settings={settings}
          onNewProject={() => openNewProject("personal")}
          canCreateProject={canCreateProjects}
          starterNavigation={!sample && personalProjects.length === 0}
          showTeamNavigation={
            activeTeamMembers.length > 1 ||
            Boolean(
              teamData?.members.some((member) => member.status === "invited")
            ) ||
            settings.teamMembers.length > 0
          }
          searchRecords={searchRecords}
          notificationSlot={<NotificationBell settings={settings} />}
        >
          <div className="flex min-h-full flex-col lg:h-full">
            {sample ? <SampleModeBar /> : null}
            <div
              ref={contentRef}
              className="min-h-0 flex-1 bg-[var(--app-canvas)] text-[var(--app-ink)] transition-colors lg:overflow-y-auto"
            >
              {children}
            </div>
          </div>
        </WorkspaceShell>
      )}
      {!standalone ? (
        <AppToast toast={toast} onClose={() => setToast(null)} />
      ) : null}
      <WorkspaceOnboarding sample={sample} />
    </>
  );
}

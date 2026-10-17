import {
  SampleModeBar,
  WorkspaceSampleBar,
} from "@/components/sample-mode-bar";
import {
  WorkspaceShell,
  workspacePageForPath,
} from "@/components/workspace-shell";
import { useClientActions } from "@/features/clients/use-client-actions";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useProjectAccess } from "@/features/projects/project-access";
import {
  ProjectActionsProvider,
  useProjectActions,
} from "@/features/projects/project-actions-provider";
import {
  AppToast,
  AuthLoadingGate,
} from "@/features/routes/shared/app-feedback";
import { applyRootThemeVariables } from "@/features/routes/shared/route-theme";
import { useWorkspaceDiscovery } from "@/features/workspace-discovery/use-workspace-discovery";
import { buildWorkspaceSearchIndex } from "@/features/workspace-discovery/workspace-discovery";
import { useData, useProjectGroups } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
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
  const pathname = useLocation({ select: (location) => location.pathname });
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    settings,
    setSettings,
    isAuthLoaded,
    continueLocally,
    sampleWorkspace,
    toast,
    setToast,
  } = useData();
  const { status: clerkStatus } = useOptionalAuth();
  const {
    sample,
    projects,
    teamData,
    activeTeamMembers,
    canCreateProjects,
    canManageFinance,
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

  useEffect(() => {
    applyRootThemeVariables(settings);
    if (settings.theme !== "System") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyRootThemeVariables(settings);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [settings]);

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

  const standalone = pathname === "/profile";
  return (
    <>
      {/* The covered workspace stays out of the Tab order until auth resolves. */}
      <div className="contents" inert={!isAuthLoaded}>
        {standalone ? (
          <div className="min-h-dvh bg-[var(--surface-page)] text-[var(--text-primary)] transition-colors">
            {children}
          </div>
        ) : (
          <WorkspaceShell
            page={workspacePageForPath(pathname)}
            settings={settings}
            onNewProject={() => openNewProject("personal")}
            canCreateProject={canCreateProjects}
            pageTitle={
              sample && pathname === "/sample-studio"
                ? "Sample studio"
                : undefined
            }
            searchRecords={searchRecords}
            navigationData={{
              projects,
              activeTeamMembers,
              canManageFinance,
              sample,
              clients: clientRecords,
              outputs: discovery?.outputs ?? [],
            }}
            notificationSlot={<NotificationBell />}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {sample ? (
                <SampleModeBar />
              ) : sampleWorkspace.loaded ? (
                <WorkspaceSampleBar
                  onClear={() => {
                    sampleWorkspace.clear();
                    setToast({
                      message: "Sample data removed.",
                      tone: "success",
                    });
                  }}
                />
              ) : null}
              <div
                ref={contentRef}
                className="min-h-0 flex-1 bg-[var(--surface-page)] text-[var(--text-primary)] transition-colors"
              >
                {children}
              </div>
            </div>
          </WorkspaceShell>
        )}
      </div>
      {!standalone ? (
        <AppToast toast={toast} onClose={() => setToast(null)} />
      ) : null}
      {!isAuthLoaded ? (
        <AuthLoadingGate
          clerkStatus={clerkStatus}
          onContinueLocally={continueLocally}
        />
      ) : null}
      <WorkspaceOnboarding sample={sample} />
    </>
  );
}

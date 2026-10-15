"use client";

import { FirstRunChecklist } from "@/components/first-run-checklist";
import { PrecisionDashboard } from "@/components/precision-dashboard";
import { ContentSection } from "@/components/workspace-page";
import { AiLockedNotice } from "@/features/ai/ai-availability";
import { useClientActions } from "@/features/clients/use-client-actions";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useProjectActivity } from "@/features/projects/project-activity";
import { projectWorkTypeOptions } from "@/features/routes/utils/work-type-utils";
import { DeadlineRiskRadar } from "./deadline-risk-radar";
import { useDashboardApplicationState } from "./use-dashboard-application-state";
import { useData } from "@/lib/data-context";
import { useProjectHistory } from "@/lib/project-history";

/**
 * Deadline risk scans a team Workspace's projects, so a local or signed-out
 * visit meets the feature where it lives, locked, instead of never seeing it.
 */
function LockedDeadlineRisk() {
  return (
    <ContentSection
      title="Deadline risk"
      description="Projects running late or waiting on a client."
    >
      <AiLockedNotice
        feature="Flag deadline risk"
        hint="Runs in a team Workspace."
      />
    </ContentSection>
  );
}

export function DashboardApplication() {
  const {
    settings,
    salaryBatches,
    salaryPlans,
    isSignedIn,
    setToast,
    updateSalaryBatchPayment,
  } = useData();
  const access = useProjectAccess();
  const actions = useProjectActions();
  const { clientOptions } = useClientActions();
  // All-time earnings and delivery counts include completed history.
  useProjectHistory();
  const { subscribeToProjectActivity } = useProjectActivity();
  const projectTagOptions = projectWorkTypeOptions(settings, access.projects);
  const dashboardState = useDashboardApplicationState({
    projects: access.personalProjects,
    settings,
    salaryBatches,
    salaryPlans,
    clientOptions,
    projectTagOptions: ["ALL", ...projectTagOptions],
    subscribeToProjectActivity,
  });

  const member = access.teamData?.currentMember;
  const riskRadar =
    access.currentTeamId &&
    !access.sample &&
    (member?.role === "Owner" || member?.role === "Editor") &&
    member.permissions.viewProjects ? (
      <DeadlineRiskRadar workspaceId={access.currentTeamId} />
    ) : !access.sample && !isSignedIn ? (
      <LockedDeadlineRisk />
    ) : null;

  return (
    <>
      <h1 className="sr-only">
        {access.sample ? "Sample studio" : "Dashboard"}
      </h1>
      {access.personalProjects.length === 0 && !access.sample ? (
        <FirstRunChecklist
          mode={isSignedIn ? "account" : "local"}
          onCreateProject={() => actions.openNewProject("personal")}
        />
      ) : (
        <PrecisionDashboard
          settings={settings}
          stats={dashboardState.stats}
          projects={access.personalProjects}
          visibleProjects={dashboardState.visibleProjects}
          salaryBatches={salaryBatches}
          sessionActivity={dashboardState.sessionActivity}
          teamActivity={access.teamData?.activity ?? []}
          teamName={access.teamData?.workspace?.name}
          teamLoading={access.teamDataLoading}
          riskRadar={riskRadar}
          query={dashboardState.query}
          setQuery={dashboardState.setQuery}
          statusFilter={dashboardState.statusFilter}
          setStatusFilter={dashboardState.setStatusFilter}
          kindFilter={dashboardState.kindFilter}
          setKindFilter={dashboardState.setKindFilter}
          clientFilter={dashboardState.clientFilter}
          setClientFilter={dashboardState.setClientFilter}
          clientOptions={dashboardState.clientOptions}
          projectTagOptions={dashboardState.projectTagOptions}
          dueFilter={dashboardState.dueFilter}
          setDueFilter={dashboardState.setDueFilter}
          billingFilter={dashboardState.billingFilter}
          setBillingFilter={dashboardState.setBillingFilter}
          sortKey={dashboardState.sortKey}
          setSortKey={dashboardState.setSortKey}
          onNewProject={() => actions.openNewProject("personal")}
          onViewProject={actions.openProjectDetails}
          onEditProject={actions.openEditProject}
          onDeleteProject={actions.requestDeleteProject}
          onMarkSalaryPayment={(batchId) => {
            updateSalaryBatchPayment(batchId, true);
            if (!access.sample)
              setToast({
                message: "Salary payment marked as received.",
                tone: "success",
              });
          }}
          canCreateProjects={access.canCreateProjects}
          canEditProjects={access.canEditProjects}
          canDeleteProject={actions.canDeleteProject}
        />
      )}
    </>
  );
}

"use client";

import { FirstRunChecklist } from "@/components/first-run-checklist";
import { PrecisionDashboard } from "@/components/precision-dashboard";
import { useClientActions } from "@/features/clients/use-client-actions";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";
import { useProjectActivity } from "@/features/projects/project-activity";
import { projectWorkTypeOptions } from "@/features/routes/utils/work-type-utils";
import { useDashboardApplicationState } from "./use-dashboard-application-state";
import { useData } from "@/lib/data-context";

export function DashboardApplication() {
  const {
    settings,
    salaryBatches,
    isSignedIn,
    setToast,
    updateSalaryBatchPayment,
  } = useData();
  const access = useProjectAccess();
  const actions = useProjectActions();
  const { clientOptions } = useClientActions();
  const { subscribeToProjectActivity } = useProjectActivity();
  const projectTagOptions = projectWorkTypeOptions(settings, access.projects);
  const dashboardState = useDashboardApplicationState({
    projects: access.personalProjects,
    settings,
    salaryBatches,
    clientOptions,
    projectTagOptions: ["ALL", ...projectTagOptions],
    subscribeToProjectActivity,
  });

  if (access.personalProjects.length === 0 && !access.sample) {
    return (
      <FirstRunChecklist
        mode={isSignedIn ? "account" : "local"}
        onCreateProject={() => actions.openNewProject("personal")}
      />
    );
  }

  return (
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
  );
}

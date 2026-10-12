"use client";

import { PrecisionReports } from "@/components/precision-workspaces";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function ReportsApplication() {
  const { settings, salaryBatches, updateSalaryBatchPayment, isAuthEnabled } =
    useData();
  const {
    projects,
    personalProjects,
    teamData,
    activeTeamMembers,
    workspaceSubscription,
    canManageFinance,
  } = useProjectAccess();
  const salaryPlans =
    !teamData || teamData.currentMember.role === "Owner" ? (
      <SalaryPlansPanel
        settings={settings}
        projects={personalProjects}
        isOwner
      />
    ) : null;

  return (
    <PrecisionReports
      advancedReports={
        !isAuthEnabled ||
        Boolean(workspaceSubscription?.capabilities.advancedReports)
      }
      projects={projects}
      salaryBatches={salaryBatches}
      settings={settings}
      editors={activeTeamMembers.map((member) => ({
        userId: member.userId,
        name: member.name,
      }))}
      currentUserId={teamData?.currentMember.userId}
      canManageFinance={canManageFinance}
      onUpdateBatchPayment={updateSalaryBatchPayment}
      salaryPlans={salaryPlans}
    />
  );
}

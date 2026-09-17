"use client";

import { PrecisionReports } from "@/components/precision-workspaces";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { ContentSection } from "@/components/workspace-page";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
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
    salaryPlansCapabilityEnabled,
  } = useProjectAccess();
  return (
    <div className="grid gap-4">
      {!isAuthEnabled || workspaceSubscription?.capabilities.advancedReports ? (
        <PrecisionReports
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
        />
      ) : (
        <ContentSection
          title="Advanced reports"
          description="Analyze project delivery and workload with the Creator plan."
        >
          <CapabilityUpgradePrompt capability="advancedReports" />
        </ContentSection>
      )}
      {!teamData || teamData.currentMember.role === "Owner" ? (
        <SalaryPlansPanel
          settings={settings}
          projects={personalProjects}
          isOwner
          capabilityEnabled={salaryPlansCapabilityEnabled}
        />
      ) : null}
    </div>
  );
}

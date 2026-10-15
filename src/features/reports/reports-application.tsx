"use client";

import { PrecisionReports } from "@/components/precision-workspaces";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { ContentSection } from "@/components/workspace-page";
import { AiLockedNotice } from "@/features/ai/ai-availability";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";
import { EarningsQa } from "./earnings-qa";

/**
 * Earnings Q&A reads a team Workspace's records, so a local or signed-out
 * visit meets the feature where it lives, locked, instead of never seeing it.
 */
function LockedEarningsQa() {
  return (
    <ContentSection title="Ask about earnings">
      <AiLockedNotice
        feature="Ask about your earnings"
        hint="Runs in a team Workspace."
      />
    </ContentSection>
  );
}

export function ReportsApplication() {
  const {
    settings,
    salaryBatches,
    updateSalaryBatchPayment,
    isAuthEnabled,
    isSignedIn,
  } = useData();
  const {
    projects,
    personalProjects,
    teamData,
    activeTeamMembers,
    workspaceSubscription,
    canManageFinance,
    currentTeamId,
    sample,
  } = useProjectAccess();
  const role = teamData?.currentMember.role;
  const earningsQa =
    currentTeamId &&
    !sample &&
    canManageFinance &&
    (role === "Owner" || role === "Editor") ? (
      <EarningsQa workspaceId={currentTeamId} />
    ) : !sample && !isSignedIn ? (
      <LockedEarningsQa />
    ) : null;
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
      earningsQa={earningsQa}
    />
  );
}

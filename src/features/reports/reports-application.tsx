"use client";

import Link from "next/link";
import { PrecisionReports } from "@/components/precision-workspaces";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { Button } from "@/components/ui/button";
import {
  ContentSection,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
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

  if (!isAuthEnabled || workspaceSubscription?.capabilities.advancedReports) {
    return (
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
        salaryPlans={salaryPlans}
      />
    );
  }

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="Reports"
        description="Salary plans and batch payouts."
      />
      <PageContent>
        {salaryPlans}
        <ContentSection
          title="Advanced reports"
          description="Earnings trends, work mix, client totals, and invoice drafts come with Creator. Relay is Free only for now."
          bodyMode="flush"
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href="/subscription">View plans</Link>
            </Button>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

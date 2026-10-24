"use client";

import { OrganizationProfilePage } from "@/features/profile/profile-page";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import { isSalaryWorkType } from "@/features/routes/utils/work-type-utils";
import { safeMoneyValue } from "@/features/routes/utils/number-utils";
import { useData } from "@/lib/data-context";
import { useProjectAccess } from "@/features/projects/project-access";

export function OrganizationApplication() {
  const { settings } = useData();
  const { teamProjects } = useProjectAccess();
  const delivered = teamProjects.filter((project) =>
    isDoneStatus(project.status)
  );
  const stats = {
    active: teamProjects.length - delivered.length,
    delivered: delivered.length,
    earned: delivered.reduce(
      (total, project) => total + safeMoneyValue(project.earnings),
      0
    ),
    salaryEdits: delivered.filter((project) =>
      isSalaryWorkType(project.workType, settings)
    ).length,
  };
  return (
    <OrganizationProfilePage
      projects={teamProjects}
      settings={settings}
      stats={stats}
    />
  );
}

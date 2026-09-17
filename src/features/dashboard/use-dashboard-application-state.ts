"use client";

import { useEffect, useMemo, useState } from "react";

import { dueBucket } from "@/features/routes/utils/project-utils";
import {
  isSalaryWorkType,
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
} from "@/features/routes/utils/work-type-utils";
import {
  createdTime,
  dateTime,
  daysBetween,
} from "@/features/routes/utils/date-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";
import { safeMoneyValue } from "@/features/routes/utils/number-utils";
import { buildPayoutReport } from "@/lib/payout-reporting";
import type { ProjectStatus } from "@/lib/domain-values";
import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import type {
  ProjectSessionActivity,
  ProjectSessionActivityListener,
} from "@/features/projects/project-activity";

export type DashboardDueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
export type DashboardSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "dueDate_asc"
  | "earnings_desc"
  | "earnings_asc";
export type DashboardActivity = ProjectSessionActivity;

export type DashboardStats = {
  total: number;
  active: number;
  unpaid: number;
  earned: number;
  collected: number;
  outstanding: number;
  salaryEdits: number;
  salaryBatchProgress: number;
  delivered: number;
  avgTurnaroundDays: number;
};

export function useDashboardApplicationState({
  projects,
  settings,
  salaryBatches,
  clientOptions,
  projectTagOptions,
  subscribeToProjectActivity,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  salaryBatches: SalaryBatch[];
  clientOptions: string[];
  projectTagOptions: string[];
  subscribeToProjectActivity: (
    listener: ProjectSessionActivityListener
  ) => () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">(
    "All"
  );
  const [kindFilter, setKindFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState<DashboardDueFilter>("ALL");
  const [billingFilter, setBillingFilter] = useState<"ALL" | "Paid" | "Unpaid">(
    "ALL"
  );
  const [sortKey, setSortKey] = useState<DashboardSortKey>("dueDate_asc");
  const [sessionActivity, setSessionActivity] = useState<DashboardActivity[]>(
    []
  );

  useEffect(() => {
    return subscribeToProjectActivity((activity) => {
      setSessionActivity((current) => [activity, ...current].slice(0, 20));
    });
  }, [subscribeToProjectActivity]);

  const isProjectBillable = (project: WorkItem) =>
    !isSalaryWorkType(project.workType, settings) &&
    isDoneStatus(project.status) &&
    safeMoneyValue(project.earnings) > 0;
  const isProjectPaid = (project: WorkItem) =>
    isProjectBillable(project) && Boolean(project.paid);
  const isProjectUnpaid = (project: WorkItem) =>
    isProjectBillable(project) && !project.paid;

  const visibleProjects = useMemo(() => {
    const searched = projects.filter((item) => {
      const haystack =
        `${item.title} ${item.client || ""} ${item.notes} ${item.workType}`.toLowerCase();
      const matchesSearch =
        !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesKind =
        kindFilter === "ALL" ||
        item.workType.trim().toLowerCase() === kindFilter.toLowerCase();
      const matchesClient =
        clientFilter === "ALL" ||
        item.client?.trim().toLowerCase() === clientFilter.toLowerCase();
      const matchesDue = dueFilter === "ALL" || dueBucket(item) === dueFilter;
      const matchesBilling =
        billingFilter === "ALL" ||
        (billingFilter === "Paid" && isProjectPaid(item)) ||
        (billingFilter === "Unpaid" && isProjectUnpaid(item));
      return (
        matchesSearch &&
        matchesStatus &&
        matchesKind &&
        matchesClient &&
        matchesDue &&
        matchesBilling
      );
    });

    return [...searched].sort((a, b) => {
      if (sortKey === "createdAt_asc") return createdTime(a) - createdTime(b);
      if (sortKey === "dueDate_asc")
        return (
          dateTime(a.dueDate || "9999-12-31") -
          dateTime(b.dueDate || "9999-12-31")
        );
      if (sortKey === "earnings_desc")
        return safeMoneyValue(b.earnings) - safeMoneyValue(a.earnings);
      if (sortKey === "earnings_asc")
        return safeMoneyValue(a.earnings) - safeMoneyValue(b.earnings);
      return createdTime(b) - createdTime(a);
    });
  }, [
    billingFilter,
    clientFilter,
    dueFilter,
    kindFilter,
    projects,
    query,
    settings,
    sortKey,
    statusFilter,
  ]);

  const stats = useMemo<DashboardStats>(() => {
    const moneyReport = buildPayoutReport({
      projects,
      salaryBatches,
      salaryWorkType: settings.salaryWorkType,
      salaryBatchAmount: normalizedSalaryBatchAmount(
        settings.salaryBatchAmount
      ),
      profileName: settings.profileName,
      period: "all",
    });
    const unpaid = projects.filter(isProjectUnpaid).length;
    const active = projects.filter((item) => !isDoneStatus(item.status)).length;
    const salaryBatchSize = normalizedSalaryBatchSize(settings.salaryBatchSize);
    const deliveredSalaryProjects = projects.filter(
      (item) =>
        isSalaryWorkType(item.workType, settings) && isDoneStatus(item.status)
    );
    const settledProjectIds = new Set(
      salaryBatches.flatMap((batch) => batch.projectIds ?? [])
    );
    const unsettledSalaryProjects = deliveredSalaryProjects.filter(
      (project) => !settledProjectIds.has(project.id)
    );
    const delivered = projects.filter((item) => isDoneStatus(item.status));
    const avgTurnaroundDays = delivered.length
      ? Math.round(
          delivered.reduce(
            (total, item) => total + daysBetween(item.startDate, item.dueDate),
            0
          ) / delivered.length
        )
      : 0;
    return {
      total: projects.length,
      active,
      unpaid,
      earned: moneyReport.earned,
      collected: moneyReport.collected,
      outstanding: moneyReport.outstanding,
      salaryEdits: deliveredSalaryProjects.length,
      salaryBatchProgress: unsettledSalaryProjects.length % salaryBatchSize,
      delivered: delivered.length,
      avgTurnaroundDays,
    };
  }, [projects, salaryBatches, settings]);

  return {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    kindFilter,
    setKindFilter,
    clientFilter,
    setClientFilter,
    dueFilter,
    setDueFilter,
    billingFilter,
    setBillingFilter,
    sortKey,
    setSortKey,
    visibleProjects,
    stats,
    sessionActivity,
    clientOptions,
    projectTagOptions,
  };
}

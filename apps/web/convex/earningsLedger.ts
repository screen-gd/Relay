import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Earnings maths (#80). Every figure is computed here so an AI layer only
 * quotes and cites results, never calculates them.
 *
 * Rules match the Reports page (`src/lib/payout-reporting.ts`):
 * - A delivered Project earns its agreed amount on its completion day, or its
 *   due date when no completion time is recorded.
 * - Salary work (a Salary Plan Project, or the legacy salary work type) earns
 *   nothing per Project. Its money comes from the Salary Batch it completes,
 *   dated by the batch completion day.
 * - Paid amounts are collected; unpaid amounts are outstanding.
 */

/** Maximum source IDs listed per figure; `sources.truncated` marks a longer list. */
export const MAX_CITED_SOURCES = 25;
export const MAX_PERIOD_BUCKETS = 120;

export const moneyValidator = v.object({
  earned: v.number(),
  collected: v.number(),
  outstanding: v.number(),
});

export const sourcesValidator = v.object({
  projectIds: v.array(v.string()),
  salaryBatchIds: v.array(v.string()),
  truncated: v.boolean(),
});

/** One cited figure: money totals plus the counts and IDs that produced them. */
export const earningsFigureValidator = v.object({
  ...moneyValidator.fields,
  projectCount: v.number(),
  salaryBatchCount: v.number(),
  sources: sourcesValidator,
});

export const periodGranularityValidator = v.union(
  v.literal("month"),
  v.literal("quarter"),
  v.literal("year")
);

export type EarningsFigure = Infer<typeof earningsFigureValidator>;
export type PeriodGranularity = Infer<typeof periodGranularityValidator>;

export type LedgerProject = Pick<
  Doc<"projects">,
  | "id"
  | "title"
  | "clientId"
  | "status"
  | "workType"
  | "salaryPlanId"
  | "earnings"
  | "paid"
  | "completedAt"
  | "dueDate"
>;

export type LedgerBatch = Pick<
  Doc<"projectSalaryBatches">,
  "id" | "amount" | "paid" | "completedAt" | "clientId" | "projectIds"
>;

/** One amount that counts toward earnings. */
export type LedgerEntry = {
  kind: "project" | "salary_batch";
  sourceId: string;
  date: string;
  clientId: string | null;
  amount: number;
  paid: boolean;
};

/** A delivered salary Project: it earns through its Salary Batch, not by itself. */
export type SalaryProjectEntry = {
  projectId: string;
  date: string;
  clientId: string;
  salaryBatchId: string | null;
};

export type Ledger = {
  entries: LedgerEntry[];
  salaryProjects: SalaryProjectEntry[];
};

export type DateRange = { start?: string; end?: string };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function dateKey(value: string | undefined) {
  return value?.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function safeAmount(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Rounds to cents so summed floats cite cleanly. */
function cents(value: number) {
  return Math.round(value * 100) / 100;
}

/** Validates an inclusive YYYY-MM-DD range; either end may be open. */
export function validateRange({ start, end }: DateRange) {
  for (const value of [start, end]) {
    if (value !== undefined && !DATE_KEY.test(value))
      throw new Error("Dates must use YYYY-MM-DD format");
  }
  if (start && end && start > end)
    throw new Error("Start date must be on or before end date");
}

export function inRange(date: string, { start, end }: DateRange) {
  return (!start || date >= start) && (!end || date <= end);
}

/** Turns delivered Projects and Salary Batches into dated, client-tagged entries. */
export function buildLedger({
  projects,
  batches,
  salaryWorkType,
}: {
  projects: LedgerProject[];
  batches: LedgerBatch[];
  salaryWorkType: string;
}): Ledger {
  const salaryKey = salaryWorkType.trim().toLowerCase();
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const batchByProjectId = new Map(
    batches.flatMap((batch) =>
      batch.projectIds.map((projectId) => [projectId, batch.id] as const)
    )
  );
  const entries: LedgerEntry[] = [];
  const salaryProjects: SalaryProjectEntry[] = [];
  for (const project of projects) {
    if (project.status !== "Delivered") continue;
    const date = dateKey(project.completedAt) || dateKey(project.dueDate);
    if (!date) continue;
    if (
      project.salaryPlanId ||
      project.workType.trim().toLowerCase() === salaryKey
    ) {
      salaryProjects.push({
        projectId: project.id,
        date,
        clientId: project.clientId,
        salaryBatchId: batchByProjectId.get(project.id) ?? null,
      });
      continue;
    }
    entries.push({
      kind: "project",
      sourceId: project.id,
      date,
      clientId: project.clientId || null,
      amount: safeAmount(project.earnings),
      paid: project.paid,
    });
  }
  for (const batch of batches) {
    const date = dateKey(batch.completedAt);
    if (!date) continue;
    const linkedClientId = batch.projectIds
      .map((projectId) => projectById.get(projectId)?.clientId)
      .find(Boolean);
    entries.push({
      kind: "salary_batch",
      sourceId: batch.id,
      date,
      clientId: batch.clientId || linkedClientId || null,
      amount: safeAmount(batch.amount),
      paid: batch.paid,
    });
  }
  return { entries, salaryProjects };
}

/** Sums entries into one cited figure. */
export function summarize(entries: LedgerEntry[]): EarningsFigure {
  let earned = 0;
  let collected = 0;
  const projectIds: string[] = [];
  const salaryBatchIds: string[] = [];
  for (const entry of entries) {
    earned += entry.amount;
    if (entry.paid) collected += entry.amount;
    (entry.kind === "project" ? projectIds : salaryBatchIds).push(
      entry.sourceId
    );
  }
  return {
    earned: cents(earned),
    collected: cents(collected),
    outstanding: cents(earned - collected),
    projectCount: projectIds.length,
    salaryBatchCount: salaryBatchIds.length,
    sources: {
      projectIds: projectIds.slice(0, MAX_CITED_SOURCES),
      salaryBatchIds: salaryBatchIds.slice(0, MAX_CITED_SOURCES),
      truncated:
        projectIds.length > MAX_CITED_SOURCES ||
        salaryBatchIds.length > MAX_CITED_SOURCES,
    },
  };
}

/** Groups entries by Client, highest earnings first. */
export function groupByClient(entries: LedgerEntry[]) {
  const groups = new Map<string | null, LedgerEntry[]>();
  for (const entry of entries) {
    groups.set(entry.clientId, [...(groups.get(entry.clientId) ?? []), entry]);
  }
  return [...groups.entries()]
    .map(([clientId, group]) => ({ clientId, ...summarize(group) }))
    .sort(
      (a, b) =>
        b.earned - a.earned ||
        (a.clientId ?? "").localeCompare(b.clientId ?? "")
    );
}

function bucketOf(date: string, granularity: PeriodGranularity) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const firstMonth =
    granularity === "year"
      ? 1
      : granularity === "quarter"
        ? Math.floor((month - 1) / 3) * 3 + 1
        : month;
  const span = granularity === "year" ? 12 : granularity === "quarter" ? 3 : 1;
  const start = new Date(Date.UTC(year, firstMonth - 1, 1));
  const end = new Date(Date.UTC(year, firstMonth - 1 + span, 0));
  const label =
    granularity === "year"
      ? String(year)
      : granularity === "quarter"
        ? `${year}-Q${(firstMonth + 2) / 3}`
        : date.slice(0, 7);
  return {
    label,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

/**
 * Splits an inclusive range into calendar buckets, including empty ones, so
 * trends show gaps. Buckets are clipped to the requested range.
 */
export function groupByPeriod(
  entries: LedgerEntry[],
  range: Required<DateRange>,
  granularity: PeriodGranularity
) {
  const buckets: Array<{
    label: string;
    periodStart: string;
    periodEnd: string;
  }> = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    if (buckets.length >= MAX_PERIOD_BUCKETS)
      throw new Error(`Use at most ${MAX_PERIOD_BUCKETS} periods`);
    const bucket = bucketOf(cursor, granularity);
    buckets.push({
      label: bucket.label,
      periodStart:
        bucket.periodStart < range.start ? range.start : bucket.periodStart,
      periodEnd: bucket.periodEnd > range.end ? range.end : bucket.periodEnd,
    });
    const next = new Date(`${bucket.periodEnd}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return buckets.map((bucket) => ({
    ...bucket,
    ...summarize(
      entries.filter((entry) =>
        inRange(entry.date, {
          start: bucket.periodStart,
          end: bucket.periodEnd,
        })
      )
    ),
  }));
}

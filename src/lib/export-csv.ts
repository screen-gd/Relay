import type { Client, SalaryBatch, WorkItem } from "./types";

export type CsvValue = string | number | boolean | undefined | null;

export type CsvDataset = "projects" | "clients" | "payments";

/**
 * One cell, quoted the way every Relay CSV is quoted: commas, quotes, and line
 * breaks get quotes, and a leading =, +, -, or @ is prefixed so a spreadsheet
 * treats it as text instead of a formula.
 */
export function csvCell(value: CsvValue) {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = text.replaceAll('"', '""');
  if (/^[=+\-@]/.test(text)) return `"'${escaped}"`;
  return /[",\r\n]/.test(text) ? `"${escaped}"` : text;
}

/** Rows of cells joined with CRLF, which is what spreadsheet apps expect. */
export function toCsv(rows: readonly (readonly CsvValue[])[]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function isoDay(value: string | undefined) {
  const match = value?.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? value?.trim() ?? "";
}

function yesNo(value: boolean | undefined) {
  return value ? "Yes" : "No";
}

function projectClient(project: WorkItem) {
  return project.client?.trim() ?? "";
}

type MoneyColumns = {
  /** Owners and editors with finance access get amounts; everyone else gets none. */
  includeMoney: boolean;
  currencyCode: string;
};

function moneyHeader({ includeMoney }: MoneyColumns) {
  return includeMoney
    ? ["Earnings", "Currency", "Paid", "Paid date"]
    : ([] as string[]);
}

function moneyCells(
  amount: number | undefined,
  paid: boolean | undefined,
  paidDate: string | undefined,
  { includeMoney, currencyCode }: MoneyColumns
) {
  return includeMoney
    ? [amount ?? 0, currencyCode, yesNo(paid), isoDay(paidDate)]
    : ([] as CsvValue[]);
}

export function projectsToCsv(
  projects: readonly WorkItem[],
  money: MoneyColumns
) {
  return toCsv([
    [
      "Title",
      "Client",
      "Work type",
      "Status",
      "Start date",
      "Due date",
      "Completed",
      "Archived",
      ...moneyHeader(money),
      "Notes",
    ],
    ...projects.map((project) => [
      project.title,
      projectClient(project),
      project.workType,
      project.status,
      isoDay(project.startDate),
      isoDay(project.dueDate),
      isoDay(project.completedAt),
      yesNo(project.archived),
      ...moneyCells(project.earnings, project.paid, project.paidDate, money),
      project.notes,
    ]),
  ]);
}

export function clientsToCsv(clients: readonly Client[]) {
  return toCsv([
    ["Name", "Company", "Contact name", "Email", "Phone", "Archived", "Notes"],
    ...clients.map((client) => [
      client.name,
      client.company,
      client.contactName,
      client.email,
      client.phone,
      yesNo(client.archived),
      client.notes,
    ]),
  ]);
}

/**
 * The payment records a workspace has: one row per Salary Batch, one per
 * project earning, with the paid flag and date each one carries.
 */
export function paymentsToCsv(
  projects: readonly WorkItem[],
  salaryBatches: readonly SalaryBatch[],
  money: MoneyColumns
) {
  return toCsv([
    [
      "Record type",
      "Reference",
      "Client",
      "Work type",
      "Date",
      ...(money.includeMoney
        ? ["Amount", "Currency", "Paid", "Paid date"]
        : ([] as string[])),
    ],
    ...salaryBatches.map((batch) => [
      "Salary batch",
      `Batch ${batch.number}`,
      batch.clientName ?? "",
      batch.workType ?? "",
      isoDay(batch.completedDate),
      ...moneyCells(batch.amount, batch.paid, batch.paidDate, money),
    ]),
    ...projects.map((project) => [
      "Project earnings",
      project.title,
      projectClient(project),
      project.workType,
      isoDay(project.completedAt ?? project.dueDate),
      ...moneyCells(project.earnings, project.paid, project.paidDate, money),
    ]),
  ]);
}

export function workspaceCsv(
  dataset: CsvDataset,
  data: {
    projects: readonly WorkItem[];
    clients: readonly Client[];
    salaryBatches: readonly SalaryBatch[];
  } & MoneyColumns
) {
  if (dataset === "clients") return clientsToCsv(data.clients);
  if (dataset === "projects") return projectsToCsv(data.projects, data);
  return paymentsToCsv(data.projects, data.salaryBatches, data);
}

/** Saves a built CSV without a server round trip, the way the backup export does. */
export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadWorkspaceCsv(
  dataset: CsvDataset,
  data: {
    projects: readonly WorkItem[];
    clients: readonly Client[];
    salaryBatches: readonly SalaryBatch[];
  } & MoneyColumns
) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`relay-${dataset}-${stamp}.csv`, workspaceCsv(dataset, data));
}

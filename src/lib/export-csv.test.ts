import { expect, test } from "vitest";
import {
  clientsToCsv,
  csvCell,
  paymentsToCsv,
  projectsToCsv,
} from "./export-csv";
import type { Client, SalaryBatch, WorkItem } from "./types";

function project(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "p1",
    profileId: "default",
    title: "Spring campaign",
    client: "Acme",
    status: "In Progress",
    workType: "channel",
    startDate: "2026-03-01",
    dueDate: "2026-03-20",
    earnings: 1200,
    notes: "",
    ...overrides,
  };
}

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    name: "Acme",
    company: "Acme, Inc.",
    contactName: "Dana",
    email: "dana@acme.test",
    phone: "",
    notes: "",
    archived: false,
    ...overrides,
  };
}

function batch(overrides: Partial<SalaryBatch> = {}): SalaryBatch {
  return {
    id: "b1",
    number: 4,
    completedDate: "2026-03-05",
    archived: false,
    archivedDate: "",
    amount: 800,
    paid: true,
    paidDate: "2026-03-06T09:00:00.000Z",
    clientName: "Acme",
    workType: "channel",
    ...overrides,
  };
}

const money = { includeMoney: true, currencyCode: "USD" };

test("a cell gets quotes for commas and quotes, and a formula opener is defused", () => {
  expect(csvCell("plain")).toBe("plain");
  expect(csvCell("Acme, Inc.")).toBe('"Acme, Inc."');
  expect(csvCell('Logo, "final"')).toBe('"Logo, ""final"""');
  expect(csvCell("=1+1")).toBe(`"'=1+1"`);
  expect(csvCell(1200)).toBe("1200");
  expect(csvCell(undefined)).toBe("");
});

test("the projects CSV opens with its header row and ends lines with CRLF", () => {
  const csv = projectsToCsv([project()], money);
  const lines = csv.split("\r\n");
  expect(lines[0]).toBe(
    "Title,Client,Work type,Status,Start date,Due date,Completed,Archived,Earnings,Currency,Paid,Paid date,Notes"
  );
  expect(lines).toHaveLength(2);
  expect(lines[1]).toBe(
    "Spring campaign,Acme,channel,In Progress,2026-03-01,2026-03-20,,No,1200,USD,No,,"
  );
});

test("a comma and a quote inside a value stay in one cell", () => {
  const csv = projectsToCsv(
    [project({ title: 'Logo, "final"', client: "Acme, Inc." })],
    money
  );
  expect(csv.split("\r\n")[1]).toContain('"Logo, ""final""","Acme, Inc."');
});

test("earnings and payment columns disappear without finance access", () => {
  const restricted = projectsToCsv([project()], {
    includeMoney: false,
    currencyCode: "USD",
  });
  expect(restricted.split("\r\n")[0]).not.toContain("Earnings");
  expect(restricted).not.toContain("1200");

  const payments = [
    paymentsToCsv([project()], [batch()], money).split("\r\n")[0],
    paymentsToCsv([project()], [batch()], {
      includeMoney: false,
      currencyCode: "USD",
    }).split("\r\n")[0],
  ];
  expect(payments[0]).toBe(
    "Record type,Reference,Client,Work type,Date,Amount,Currency,Paid,Paid date"
  );
  expect(payments[1]).toBe("Record type,Reference,Client,Work type,Date");
});

test("the payments CSV holds salary batches and project earnings", () => {
  const csv = paymentsToCsv(
    [project({ completedAt: "2026-03-08T14:30:00.000Z" })],
    [batch()],
    money
  );
  const lines = csv.split("\r\n");
  expect(lines[1]).toBe(
    "Salary batch,Batch 4,Acme,channel,2026-03-05,800,USD,Yes,2026-03-06"
  );
  expect(lines[2]).toBe(
    "Project earnings,Spring campaign,Acme,channel,2026-03-08,1200,USD,No,"
  );
});

test("the clients CSV exports saved client records", () => {
  const csv = clientsToCsv([client()]);
  expect(csv.split("\r\n")).toEqual([
    "Name,Company,Contact name,Email,Phone,Archived,Notes",
    'Acme,"Acme, Inc.",Dana,dana@acme.test,,No,',
  ]);
});

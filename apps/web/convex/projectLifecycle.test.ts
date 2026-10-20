import { expect, test } from "vitest";
import { projectLifecycle } from "./projectLifecycle";

const base = {
  archived: false,
  status: "In Progress" as const,
  paid: false,
  earnings: 500,
  salaryWork: false,
  inSalaryBatch: false,
};

test.each([
  ["work in progress", {}, "active"],
  ["archived work", { archived: true }, "history"],
  ["cancelled work", { status: "Cancelled" as const }, "history"],
  [
    "delivered and unpaid",
    { status: "Delivered" as const },
    "awaiting_payment",
  ],
  [
    "delivered and paid",
    { status: "Delivered" as const, paid: true },
    "history",
  ],
  [
    "delivered with nothing to collect",
    { status: "Delivered" as const, earnings: 0 },
    "history",
  ],
  [
    "delivered salary work outside a batch",
    { status: "Delivered" as const, salaryWork: true, earnings: 0 },
    "awaiting_payment",
  ],
  [
    "delivered salary work in a batch",
    {
      status: "Delivered" as const,
      salaryWork: true,
      inSalaryBatch: true,
      earnings: 0,
    },
    "history",
  ],
] as const)("%s is %s", (_name, changes, expected) => {
  expect(projectLifecycle({ ...base, ...changes })).toBe(expected);
});

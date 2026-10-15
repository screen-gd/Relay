import { CheckIcon } from "@phosphor-icons/react/ssr";
import {
  plans,
  CREATOR_LAUNCH_STORAGE_GB,
  TEAM_LAUNCH_STORAGE_GB,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  FREE_OPEN_PROJECT_LIMIT,
  formatUsd,
} from "../../lib/plans";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import styles from "./PlanComparison.module.css";

const planNames = ["Free", "Creator", "Team"] as const;

/** `true` renders a check, `false` a dash, and strings render as text. */
type Cell = boolean | string;

const rows = [
  {
    label: "Price",
    values: [
      `${plans[0].price} ${plans[0].period}`,
      `${plans[1].price} ${plans[1].period}`,
      `${plans[2].price} ${plans[2].period}`,
    ],
  },
  {
    label: "Projects in progress",
    values: [`${FREE_OPEN_PROJECT_LIMIT} at a time`, "Unlimited", "Unlimited"],
  },
  {
    label: "Project history and clients",
    values: ["Unlimited", "Unlimited", "Unlimited"],
  },
  { label: "Completed projects in the timeline", values: [false, true, true] },
  { label: "Client portals and password links", values: [true, true, true] },
  { label: "Embedded video review", values: [true, true, true] },
  { label: "Payment tracking", values: [true, true, true] },
  { label: "Payment plans and batches", values: [false, true, true] },
  { label: "Client hub", values: [false, true, true] },
  { label: "Custom portal branding", values: [false, true, true] },
  { label: "Workflow templates", values: [false, true, true] },
  { label: "Advanced reports", values: [false, true, true] },
  {
    label: "File uploads",
    values: [
      false,
      `${CREATOR_LAUNCH_STORAGE_GB} GB, coming soon`,
      `${TEAM_LAUNCH_STORAGE_GB} GB shared, coming soon`,
    ],
  },
  {
    label: "Included editor seats",
    values: [
      "1 owner",
      "1 owner",
      `${TEAM_INCLUDED_EDITOR_SEATS}, including owner`,
    ],
  },
  {
    label: "Extra editor seats",
    values: [
      false,
      false,
      `${formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)}/month each`,
    ],
  },
  { label: "Client review access", values: ["Free", "Free", "Free"] },
  { label: "Internal viewer seats", values: [false, false, "Free"] },
  {
    label: "Roles, assignments, and team payouts",
    values: [false, false, true],
  },
] as const satisfies readonly {
  label: string;
  values: readonly [Cell, Cell, Cell];
}[];

/** Renders one comparison cell with screen reader text for checks and dashes. */
function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <>
        <CheckIcon size={18} aria-hidden="true" className={styles.check} />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return value;
}

/** Price and feature comparison table for /pricing. Scrolls sideways on small screens. */
export default function PlanComparison() {
  return (
    <div className={styles.scroller}>
      <Table className={styles.table}>
        <caption className="sr-only">
          Price and features of each Relay plan
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <span className="sr-only">Detail</span>
            </TableHead>
            {planNames.map((name) => (
              <TableHead scope="col" key={name} className={styles.planHead}>
                {name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableHead scope="row" className={styles.rowHead}>
                {row.label}
              </TableHead>
              {row.values.map((value, index) => (
                <TableCell key={planNames[index]}>
                  <CellValue value={value} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

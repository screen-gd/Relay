import { Check } from "lucide-react";
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
    label: "Projects and clients",
    values: ["Unlimited", "Unlimited", "Unlimited"],
  },
  { label: "Client portals and password links", values: [true, true, true] },
  { label: "Embedded video review", values: [true, true, true] },
  { label: "Payment tracking", values: [true, true, true] },
  { label: "Client hub", values: [false, true, true] },
  { label: "Custom portal branding", values: [false, true, true] },
  { label: "Workflow templates", values: [false, true, true] },
  { label: "Advanced reports", values: [false, true, true] },
  {
    label: "File uploads",
    values: [false, "5 GB, coming soon", "15 GB, coming soon"],
  },
  { label: "Editor seats", values: ["1", "1", "3"] },
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
        <Check size={18} aria-hidden="true" className={styles.check} />
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

/** Feature-by-plan comparison table for /pricing. Scrolls sideways on small screens. */
export default function PlanComparison() {
  return (
    <div className={styles.scroller}>
      <Table className={styles.table}>
        <caption className="sr-only">
          Features included in each Relay plan
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <span className="sr-only">Feature</span>
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

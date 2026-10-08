import { ArrowDown } from "lucide-react";
import styles from "./FeatureIndex.module.css";

const chapters = [
  { href: "#workflow", label: "Workflow" },
  { href: "#client-review", label: "Client review" },
  { href: "#delivery", label: "Delivery" },
  { href: "#payments", label: "Payments" },
  { href: "#proof", label: "Activity" },
] as const;

/** Rail-to-rail row of jump links to each /features chapter, under the page header. */
export default function FeatureIndex() {
  return (
    <nav className={styles.frame} aria-label="Features on this page">
      <ol className={styles.list}>
        {chapters.map(({ href, label }, index) => (
          <li key={href}>
            <a href={href}>
              <span className={styles.number}>0{index + 1}</span>
              <span>{label}</span>
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

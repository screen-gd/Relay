import type { ReactNode } from "react";
import styles from "./TrustPage.module.css";

/** One fact row: a provider, mode, or control and what it covers. */
export type TrustFact = { term: string; children: ReactNode };

export type TrustSection = {
  id: string;
  heading: string;
  paragraphs?: readonly ReactNode[];
  facts?: readonly TrustFact[];
};

/**
 * Body of a trust page: one heading per section, optional fact rows, then
 * prose. Used by /about and /privacy-and-data; the header, footer, and page
 * frame come from the root layout.
 */
export default function TrustPage({
  sections,
}: {
  sections: readonly TrustSection[];
}) {
  return (
    <div className="section">
      <div className="container">
        <div className={styles.sections}>
          {sections.map((section) => (
            <section
              key={section.id}
              className={styles.section}
              aria-labelledby={section.id}
            >
              <h2 className={styles.heading} id={section.id}>
                {section.heading}
              </h2>
              {section.facts ? (
                <dl className={styles.facts}>
                  {section.facts.map((fact) => (
                    <div className={styles.fact} key={fact.term}>
                      <dt className={styles.term}>{fact.term}</dt>
                      <dd className={styles.value}>{fact.children}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {section.paragraphs?.map((paragraph, index) => (
                <p className={styles.prose} key={index}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

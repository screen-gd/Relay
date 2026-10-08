"use client";

import { ChartColumn, Receipt, Repeat } from "lucide-react";
import { useState } from "react";
import Reveal from "../site/Reveal";
import AppWindow from "./AppWindow";
import ui from "./app-ui.module.css";
import chapter from "./chapter.module.css";
import styles from "./PaymentsSection.module.css";

const facts = [
  {
    icon: Receipt,
    title: "Track each project",
    text: "Record the fee and mark payments received.",
  },
  {
    icon: Repeat,
    title: "Manage recurring work",
    text: "Set payment plans for a client's project batches and track the next payout.",
  },
  {
    icon: ChartColumn,
    title: "Review your earnings",
    text: "See earned, collected, and outstanding amounts in your workspace currency.",
  },
] as const;

type Tone = "info" | "warning" | "success";

// Same projects as the app's Sample Studio. Payment tracking starts after delivery.
const initialProjects: {
  id: string;
  name: string;
  client: string;
  due: string;
  status: string;
  tone: Tone;
  value: number;
  paid: boolean | null;
}[] = [
  {
    id: "launch",
    name: "Summer launch film",
    client: "Aperture Coffee",
    due: "Jul 24",
    status: "In Progress",
    tone: "info",
    value: 1800,
    paid: null,
  },
  {
    id: "founder",
    name: "Founder story cutdown",
    client: "Orbit Labs",
    due: "Jul 23",
    status: "Client Review",
    tone: "warning",
    value: 950,
    paid: null,
  },
  {
    id: "reel",
    name: "Q2 team reel",
    client: "Orbit Labs",
    due: "Jul 16",
    status: "Delivered",
    tone: "success",
    value: 1450,
    paid: false,
  },
  {
    id: "field",
    name: "Field Notes episode 12",
    client: "Field Notes",
    due: "Jul 11",
    status: "Delivered",
    tone: "success",
    value: 1200,
    paid: true,
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Payments chapter on /features: a Relay Reports page with totals, the
 * project payments table, and a retainer plan. Switching a delivered project
 * to paid updates the totals.
 */
export default function PaymentsSection() {
  const [projects, setProjects] = useState(initialProjects);
  const delivered = projects.filter((item) => item.paid !== null);
  const earned = delivered.reduce((sum, item) => sum + item.value, 0);
  const collected = delivered.reduce(
    (sum, item) => sum + (item.paid ? item.value : 0),
    0
  );
  const pipeline = projects.reduce(
    (sum, item) => sum + (item.paid === null ? item.value : 0),
    0
  );
  const unpaid = delivered.filter((item) => !item.paid).length;

  const totals = [
    { label: "Earned", value: earned, note: `${delivered.length} delivered` },
    {
      label: "Collected",
      value: collected,
      note: `${delivered.length - unpaid} paid`,
    },
    {
      label: "Outstanding",
      value: earned - collected,
      note: `${unpaid} unpaid`,
    },
    {
      label: "In progress",
      value: pipeline,
      note: `${projects.length - delivered.length} projects`,
    },
  ];

  const togglePaid = (id: string) =>
    setProjects((current) =>
      current.map((item) =>
        item.id === id && item.paid !== null
          ? { ...item, paid: !item.paid }
          : item
      )
    );

  return (
    <section
      className={`story-section ${chapter.chapter}`}
      id="payments"
      aria-labelledby="payments-title"
    >
      <Reveal className={chapter.head}>
        <h2 className={chapter.title} id="payments-title">
          Know what you’re owed.
        </h2>
        <p>
          Track fees, payments, and payment batches next to your delivery work.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <AppWindow
          crumbs={["Reports"]}
          page="reports"
          label="Sample earnings report"
        >
          <dl className={styles.totals} aria-live="polite">
            {totals.map(({ label, value, note }) => (
              <div key={label} className={ui.panel}>
                <dt>{label}</dt>
                <dd>{money.format(value)}</dd>
                <dd className={styles.note}>{note}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.grid}>
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Project payments</h3>
                <span className={ui.badge}>July</span>
              </div>
              <div className={styles.tableHead} aria-hidden="true">
                <span>Project</span>
                <span>Due</span>
                <span>Status</span>
                <span>Value</span>
                <span>Paid</span>
              </div>
              <ul className={styles.table}>
                {projects.map((item) => (
                  <li key={item.id}>
                    <span className={ui.rowMain}>
                      <b>{item.name}</b>
                      <span>{item.client}</span>
                    </span>
                    <span className={`${ui.mono} ${styles.due}`}>
                      {item.due}
                    </span>
                    <span className={ui.status} data-tone={item.tone}>
                      {item.status}
                    </span>
                    <span className={`${ui.mono} ${styles.value}`}>
                      {money.format(item.value)}
                    </span>
                    <span className={styles.paid}>
                      {item.paid === null ? (
                        <span className={styles.later}>After delivery</span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          className={ui.switch}
                          aria-checked={item.paid}
                          aria-label={`Paid: ${item.name}`}
                          onClick={() => togglePaid(item.id)}
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Payment plan</h3>
                <span className={ui.badge}>Retainer</span>
              </div>
              <div className={ui.panelBody}>
                <p className={styles.planClient}>Orbit Labs</p>
                <div className={styles.planCount}>
                  <span>
                    <b className={ui.mono}>12</b> of{" "}
                    <span className={ui.mono}>20</span> projects
                  </span>
                  <span className={ui.mono}>60%</span>
                </div>
                <div className={ui.progress}>
                  <i style={{ width: "60%" }} />
                </div>
                <dl className={ui.details}>
                  <div>
                    <dt>Batch amount</dt>
                    <dd className={ui.mono}>$10,000</dd>
                  </div>
                  <div>
                    <dt>Per project</dt>
                    <dd className={ui.mono}>$500</dd>
                  </div>
                  <div>
                    <dt>Next payout</dt>
                    <dd>After 8 projects</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </AppWindow>
      </Reveal>

      <ul className="review-facts">
        {facts.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Icon size={20} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

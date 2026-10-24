"use client";

import Image from "next/image";
import { useState } from "react";
import Reveal from "../site/Reveal";
import AppWindow from "./AppWindow";
import ui from "./app-ui.module.css";
import chapter from "./chapter.module.css";
import styles from "./PaymentsSection.module.css";

const projects = [
  {
    name: "Summer launch film",
    client: "Aperture Coffee",
    value: 1800,
    delivered: false,
    paid: false,
  },
  {
    name: "Founder story cutdown",
    client: "Orbit Labs",
    value: 950,
    delivered: false,
    paid: false,
  },
  {
    name: "Field Notes episode 12",
    client: "Field Notes",
    value: 1200,
    delivered: true,
    paid: true,
  },
];
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const views = ["Overview", "Payments", "Clients", "Team"] as const;

/** Uses the real report layout and chart captures from the populated demo app. */
export default function PaymentsSection() {
  const [view, setView] = useState<(typeof views)[number]>("Overview");
  const [period, setPeriod] = useState("All time");
  const [range, setRange] = useState("6M");
  const [selectedClient, setSelectedClient] = useState("All clients");
  const delivered = projects.filter((project) => project.delivered);
  const earned = delivered.reduce((sum, project) => sum + project.value, 0);
  const paid = delivered.reduce(
    (sum, project) => sum + (project.paid ? project.value : 0),
    0
  );
  const clients = Array.from(
    new Set(projects.map((project) => project.client))
  );
  return (
    <section
      className={["story-section", chapter.chapter].join(" ")}
      id="payments"
      aria-labelledby="payments-title"
    >
      <Reveal className={chapter.head}>
        <h2 className={chapter.title} id="payments-title">
          Know what you’re owed.
        </h2>
        <p>
          Track project fees and payments free. Creator and Team add payment
          plans and batches for recurring work.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <AppWindow
          crumbs={["Payments"]}
          page="reports"
          label="Sample earnings report"
          topbarActions={
            <select
              className={ui.input}
              aria-label="Payout period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {["All time", "This month", "This quarter", "This year"].map(
                (value) => (
                  <option key={value}>{value}</option>
                )
              )}
            </select>
          }
        >
          <div
            className={ui.tabs}
            role="group"
            aria-label="Payment report views"
          >
            {views.map((tab) => (
              <button
                key={tab}
                type="button"
                className={ui.tab}
                data-active={view === tab}
                aria-pressed={view === tab}
                onClick={() => setView(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {view === "Overview" ? (
            <>
              <dl className={ui.metricStrip}>
                {[
                  [
                    "Earned",
                    money.format(earned),
                    "Delivered projects and batches",
                  ],
                  ["Paid", money.format(paid), "Delivered and paid"],
                  [
                    "Unpaid",
                    money.format(earned - paid),
                    "Delivered, not paid yet",
                  ],
                  [
                    "Delivered edits",
                    String(delivered.length),
                    "0 salary edits",
                  ],
                ].map(([label, value, note]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                    <dd>{note}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.shareLabel}>
                <span>Paid share</span>
                <span>100% paid</span>
              </div>
              <div
                className={[ui.progress, styles.shareMeter].join(" ")}
                data-accent="true"
              >
                <i style={{ width: "100%" }} />
              </div>
              <div className={styles.charts}>
                <section className={ui.panel}>
                  <div className={ui.panelHead}>
                    <h3 className={ui.panelTitle}>Earnings by month</h3>
                    <div
                      className={ui.tabs}
                      role="group"
                      aria-label="Earnings trend range"
                    >
                      {["3M", "6M", "All"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={ui.tab}
                          data-active={range === value}
                          aria-pressed={range === value}
                          onClick={() => setRange(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={ui.panelBody}>
                    <Image
                      className={styles.chart}
                      src="/demo/earnings-july.png"
                      width={652}
                      height={190}
                      alt="July earnings: $1,200 from one delivered project"
                    />
                    <p className={styles.chartNote} aria-live="polite">
                      1 delivered edit earned $1,200 across 1 month.{" "}
                      {range === "All"
                        ? "All available history."
                        : "Last " + range.slice(0, 1) + " months."}
                    </p>
                  </div>
                </section>
                <section className={ui.panel}>
                  <div className={ui.panelHead}>
                    <h3 className={ui.panelTitle}>Work mix</h3>
                  </div>
                  <div className={ui.panelBody}>
                    <Image
                      className={styles.chart}
                      src="/demo/work-mix.png"
                      width={392}
                      height={196}
                      alt="Work mix: one Client Work project"
                    />
                    <div className={styles.shareLabel}>
                      <span>Client Work</span>
                      <span>1</span>
                    </div>
                  </div>
                </section>
              </div>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>This period</h3>
                </div>
                <div className={ui.panelBody}>
                  <dl className={styles.periodMetrics}>
                    {[
                      ["Completed projects", "1"],
                      ["Outputs delivered", "2"],
                      ["Average days to deliver", "No data"],
                      ["Overdue projects", "2"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Image
                    className={styles.deliveries}
                    src="/demo/deliveries-july.png"
                    width={1100}
                    height={160}
                    alt="July deliveries: one project"
                  />
                </div>
              </section>
            </>
          ) : view === "Payments" ? (
            <div className={styles.reportStack}>
              <section>
                <h3 className={ui.panelTitle}>Payments</h3>
                <p className={styles.chartNote}>
                  Sign in to create payment plans. Local mode uses the payment
                  batch settings.
                </p>
              </section>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Payment batches</h3>
                  <span className={ui.badge}>0</span>
                </div>
                <div className={ui.panelBody}>
                  <div className={styles.batchHead}>
                    <span>Batch</span>
                    <span>Completed</span>
                    <span>Edits</span>
                    <span>Amount</span>
                    <span>Payment</span>
                  </div>
                  <div className={styles.empty}>
                    <b>No batches yet</b>
                    <p>
                      Finish the next salary batch to record its payment here.
                    </p>
                  </div>
                </div>
              </section>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Invoice drafts</h3>
                </div>
                <div className={ui.panelBody}>
                  <p className={styles.chartNote}>
                    Drafts for delivered client projects. Relay does not collect
                    payments.
                  </p>
                  <div className={styles.empty}>
                    <b>No invoice drafts</b>
                    <p>
                      Deliver a freelance project for a named client to draft
                      its invoice.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : view === "Clients" ? (
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Earnings by client</h3>
                <select
                  className={ui.input}
                  aria-label="Filter earnings by client"
                  value={selectedClient}
                  onChange={(event) => setSelectedClient(event.target.value)}
                >
                  <option>All clients</option>
                  {clients.map((client) => (
                    <option key={client}>{client}</option>
                  ))}
                </select>
              </div>
              <div className={ui.panelBody} data-flush="true">
                <ul className={ui.rows}>
                  {clients
                    .filter(
                      (client) =>
                        selectedClient === "All clients" ||
                        client === selectedClient
                    )
                    .map((client) => {
                      const completed = delivered.filter(
                        (project) => project.client === client
                      );
                      return (
                        <li key={client}>
                          <span className={ui.rowMain}>
                            <b>{client}</b>
                            <span>{completed.length} delivered</span>
                          </span>
                          <span>
                            {money.format(
                              completed.reduce(
                                (sum, project) => sum + project.value,
                                0
                              )
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </section>
          ) : (
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Team earnings</h3>
              </div>
              <div className={ui.panelBody}>
                <p>Team earnings are available in a team Workspace.</p>
              </div>
            </section>
          )}
          <p className={styles.reportDate}>
            July 2026 · {period} · Sample report
          </p>
        </AppWindow>
      </Reveal>
    </section>
  );
}

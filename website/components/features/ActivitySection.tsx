"use client";

import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import Reveal from "../site/Reveal";
import AppWindow from "./AppWindow";
import ui from "./app-ui.module.css";
import chapter from "./chapter.module.css";
import styles from "./ActivitySection.module.css";

const filters = ["All", "Project", "Review", "Delivery"] as const;
type Filter = (typeof filters)[number];
type Tone = "info" | "warning" | "success" | undefined;

const events = [
  {
    kind: "Project",
    action: "Summer launch film was created",
    owner: "Jordan",
    time: "9:02 AM",
  },
  {
    kind: "Project",
    action: "Summer launch film is in progress",
    owner: "Jordan",
    time: "9:04 AM",
  },
  {
    kind: "Review",
    action: "Priya commented on Summer launch v3",
    owner: "Priya",
    time: "9:15 AM",
  },
  {
    kind: "Review",
    action: "Alex added Summer launch v4",
    owner: "Alex",
    time: "10:11 AM",
  },
  {
    kind: "Delivery",
    action: "Field Notes episode 12 was delivered",
    owner: "Jordan",
    time: "11:32 AM",
  },
] as const satisfies readonly {
  kind: Exclude<Filter, "All">;
  action: string;
  owner: string;
  time: string;
}[];

const weeks: {
  label: string;
  projects: {
    name: string;
    client: string;
    due: string;
    status: string;
    tone: Tone;
  }[];
}[] = [
  {
    label: "Jul 6 – Jul 12",
    projects: [
      {
        name: "Field Notes episode 12",
        client: "Field Notes",
        due: "Jul 11",
        status: "Delivered",
        tone: "success",
      },
      {
        name: "Campaign cutdowns",
        client: "Aperture Coffee",
        due: "Jul 9",
        status: "Delivered",
        tone: "success",
      },
    ],
  },
  {
    label: "Jul 13 – Jul 19",
    projects: [
      {
        name: "Q2 team reel",
        client: "Orbit Labs",
        due: "Jul 16",
        status: "Delivered",
        tone: "success",
      },
      {
        name: "Field Notes episode 13",
        client: "Field Notes",
        due: "Jul 18",
        status: "Delivered",
        tone: "success",
      },
    ],
  },
  {
    label: "Jul 20 – Jul 26",
    projects: [
      {
        name: "Founder story cutdown",
        client: "Orbit Labs",
        due: "Jul 23",
        status: "Client Review",
        tone: "warning",
      },
      {
        name: "Summer launch film",
        client: "Aperture Coffee",
        due: "Jul 24",
        status: "In Progress",
        tone: "info",
      },
      {
        name: "Menu board spots",
        client: "Aperture Coffee",
        due: "Jul 25",
        status: "Client Review",
        tone: "warning",
      },
      {
        name: "Product teaser",
        client: "Orbit Labs",
        due: "Jul 26",
        status: "Planned",
        tone: undefined,
      },
    ],
  },
  {
    label: "Jul 27 – Aug 2",
    projects: [
      {
        name: "Aperture Coffee profile",
        client: "Aperture Coffee",
        due: "Jul 29",
        status: "In Progress",
        tone: "info",
      },
      {
        name: "Orbit Labs demo",
        client: "Orbit Labs",
        due: "Aug 1",
        status: "Planned",
        tone: undefined,
      },
    ],
  },
];

const sampleWeek = 2;

/**
 * Activity chapter on /features: a Relay dashboard with a filterable
 * activity feed and the week's deadlines.
 */
export default function ActivitySection() {
  const [filter, setFilter] = useState<Filter>("All");
  const [week, setWeek] = useState(sampleWeek);
  const visibleEvents =
    filter === "All" ? events : events.filter((event) => event.kind === filter);

  return (
    <section
      className={`story-section ${chapter.chapter}`}
      id="proof"
      aria-labelledby="activity-title"
    >
      <Reveal className={chapter.head}>
        <h2 className={chapter.title} id="activity-title">
          Project updates and deadlines.
        </h2>
        <p>Follow project changes, review activity, and upcoming deadlines.</p>
      </Reveal>

      <Reveal delay={0.1}>
        <AppWindow
          crumbs={["Dashboard"]}
          page="dashboard"
          label="Sample dashboard"
        >
          <div className={styles.grid}>
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Activity</h3>
                <div
                  className={styles.filters}
                  role="group"
                  aria-label="Filter activity"
                >
                  {filters.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={ui.tab}
                      data-active={item === filter}
                      aria-pressed={item === filter}
                      onClick={() => setFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <ol className={styles.events}>
                {visibleEvents.map((event) => (
                  <li key={event.action}>
                    <b>{event.action}</b>
                    <span>
                      {event.owner} ·{" "}
                      <span className={ui.mono}>{event.time}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <h3 className={ui.panelTitle}>Deadlines</h3>
                <div className={styles.weekNav}>
                  <button
                    className={`${ui.button} ${ui.icon}`}
                    type="button"
                    aria-label="Previous week"
                    disabled={week === 0}
                    onClick={() => setWeek((value) => Math.max(0, value - 1))}
                  >
                    <CaretLeftIcon size={14} aria-hidden="true" />
                  </button>
                  <span className={ui.mono} aria-live="polite">
                    {weeks[week].label}
                  </span>
                  <button
                    className={`${ui.button} ${ui.icon}`}
                    type="button"
                    aria-label="Next week"
                    disabled={week === weeks.length - 1}
                    onClick={() =>
                      setWeek((value) => Math.min(weeks.length - 1, value + 1))
                    }
                  >
                    <CaretRightIcon size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className={styles.tableHead} aria-hidden="true">
                <span>Project</span>
                <span>Due date</span>
                <span>Status</span>
              </div>
              <ul className={styles.table}>
                {weeks[week].projects.map((project) => (
                  <li key={project.name}>
                    <span className={ui.rowMain}>
                      <b>{project.name}</b>
                      <span>{project.client}</span>
                    </span>
                    <span className={`${ui.mono} ${styles.due}`}>
                      {project.due}
                    </span>
                    <span className={ui.status} data-tone={project.tone}>
                      {project.status}
                    </span>
                  </li>
                ))}
              </ul>
              {week === sampleWeek ? null : (
                <button
                  className={styles.reset}
                  type="button"
                  onClick={() => setWeek(sampleWeek)}
                >
                  Back to this week <ArrowRightIcon size={13} aria-hidden="true" />
                </button>
              )}
            </section>
          </div>
        </AppWindow>
      </Reveal>
    </section>
  );
}

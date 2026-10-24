"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";
import DemoDialog from "./DemoDialog";
import { MagnifyingGlassIcon } from "./AppIcons";
import Reveal from "../site/Reveal";
import ui from "./app-ui.module.css";
import chapter from "./chapter.module.css";
import styles from "./ActivitySection.module.css";

const initialProjects = [
  {
    id: "launch",
    name: "Summer launch film",
    client: "Aperture Coffee",
    status: "In Progress",
    progress: 33,
    value: 1800,
    due: "Jul 24",
    late: "2d late",
  },
  {
    id: "founder",
    name: "Founder story cutdown",
    client: "Orbit Labs",
    status: "Client Review",
    progress: 67,
    value: 950,
    due: "Jul 23",
    late: "3d late",
  },
];
const events = [
  {
    id: "launch",
    action: "Summer launch film is in progress",
    owner: "Workspace",
    time: "Today",
  },
  {
    id: "founder",
    action: "Founder story cutdown is client review",
    owner: "Workspace",
    time: "Yesterday",
  },
  {
    id: "field",
    action: "Field Notes episode 12 was delivered",
    owner: "Workspace",
    time: "Jul 11",
  },
];
const teamEvents = [
  {
    id: "review",
    action: "Priya resolved a comment on Summer launch v3",
    owner: "Priya",
    time: "9:20 AM",
  },
  {
    id: "version",
    action: "Alex added Summer launch v4",
    owner: "Alex",
    time: "10:11 AM",
  },
];
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Reproduces the populated dashboard at localhost:3100: metrics, attention, projects and activity. */
export default function ActivitySection() {
  const [projects, setProjects] = useState(initialProjects);
  const [activity, setActivity] = useState(events);
  const [tab, setTab] = useState("Recent");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showValue, setShowValue] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<
    (typeof initialProjects)[number] | null
  >(null);
  const visible = projects.filter(
    (project) =>
      (filter === "All" || project.status === filter) &&
      (project.name + " " + project.client)
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  return (
    <section
      className={["story-section", chapter.chapter].join(" ")}
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
          primaryAction="New project"
          onPrimaryAction={() => setCreating(true)}
        >
          <dl className={ui.metricStrip}>
            {[
              [
                "Active",
                String(projects.length),
                "of " + (projects.length + 1) + " projects",
              ],
              ["Due this week", "0", "2 overdue"],
              [
                "In review",
                String(
                  projects.filter(
                    (project) => project.status === "Client Review"
                  ).length + 1
                ),
                "Reviews and revisions",
              ],
              ["Paid", "$1,200", "$0 unpaid"],
            ].map(([label, value, note]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
                <dd>{note}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.grid}>
            <div className={styles.stack}>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Needs attention</h3>
                  <span className={ui.badge}>{initialProjects.length}</span>
                </div>
                <div className={ui.panelBody} data-flush="true">
                  <ul className={styles.attention}>
                    {initialProjects.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          className={ui.textButton}
                          onClick={() => setSelected(project)}
                        >
                          <b>{project.name}</b>
                          <span>{project.client}</span>
                        </button>
                        <span>{project.status}</span>
                        <span className={styles.nextStep}>
                          {project.status === "In Progress"
                            ? "Complete the current production pass."
                            : "Collect review notes and prepare the next cut."}
                        </span>
                        <span className={styles.late}>{project.late}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Projects</h3>
                  <div className={styles.tools}>
                    <label className={styles.search}>
                      <MagnifyingGlassIcon size={14} />
                      <input
                        aria-label="Search projects"
                        placeholder="Search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </label>
                    <select
                      className={ui.input}
                      aria-label="Filter projects"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="All">Filter</option>
                      <option>In Progress</option>
                      <option>Client Review</option>
                      <option>Planned</option>
                    </select>
                    <button
                      className={ui.textButton}
                      type="button"
                      aria-pressed={showValue}
                      onClick={() => setShowValue((value) => !value)}
                    >
                      Display
                    </button>
                  </div>
                </div>
                <div className={ui.panelBody} data-flush="true">
                  <div className={styles.tableScroll}>
                    <table className={styles.projects}>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Due</th>
                          <th>Status</th>
                          <th>Progress</th>
                          {showValue && <th>Value</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((project) => (
                          <tr key={project.id}>
                            <td>
                              <button
                                type="button"
                                className={ui.textButton}
                                onClick={() => setSelected(project)}
                              >
                                <b>{project.name}</b>
                                <small>{project.client}</small>
                              </button>
                            </td>
                            <td className={styles.late}>
                              {project.late || project.due}
                            </td>
                            <td>{project.status}</td>
                            <td>
                              <span className={styles.progressCell}>
                                <span className={ui.progress}>
                                  <i
                                    style={{ width: project.progress + "%" }}
                                  />
                                </span>
                                {project.progress}%
                              </span>
                            </td>
                            {showValue && (
                              <td>{money.format(project.value)}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visible.length === 0 && (
                    <p className={styles.empty} role="status">
                      No projects match your search.
                    </p>
                  )}
                </div>
              </section>
            </div>
            <div className={styles.stack}>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Activity</h3>
                  <div
                    className={styles.filters}
                    role="group"
                    aria-label="Filter activity"
                  >
                    {["Recent", "Team"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={ui.tab}
                        data-active={item === tab}
                        aria-pressed={item === tab}
                        onClick={() => setTab(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={ui.panelBody} data-flush="true">
                  <ol className={styles.events}>
                    {(tab === "Recent" ? activity : teamEvents).map((event) => (
                      <li key={event.id}>
                        <b>{event.action}</b>
                        <span>
                          {event.owner} · {event.time}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
              <section className={ui.panel}>
                <div className={ui.panelHead}>
                  <h3 className={ui.panelTitle}>Deadline risk</h3>
                </div>
                <div className={ui.panelBody}>
                  <p>Projects running late or waiting on a client.</p>
                  <span className={ui.badge}>Runs in a team Workspace.</span>
                </div>
              </section>
            </div>
          </div>
          <DemoDialog
            open={creating}
            onOpenChange={setCreating}
            title="New project"
          >
            <form
              className={ui.form}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("title") ?? "").trim();
                if (!name) return;
                const project = {
                  id: crypto.randomUUID(),
                  name,
                  client: String(data.get("client")),
                  status: "Planned",
                  progress: 0,
                  value: 0,
                  due: "Jul 24",
                  late: "",
                };
                setProjects((current) => [project, ...current]);
                setActivity((current) => [
                  {
                    id: project.id,
                    action: name + " was created",
                    owner: "You",
                    time: "Just now",
                  },
                  ...current,
                ]);
                setQuery("");
                setFilter("All");
                setTab("Recent");
                setCreating(false);
              }}
            >
              <label className={ui.field}>
                Project title
                <input
                  className={ui.input}
                  name="title"
                  required
                  maxLength={100}
                />
              </label>
              <label className={ui.field}>
                Client
                <select className={ui.input} name="client">
                  <option>Aperture Coffee</option>
                  <option>Orbit Labs</option>
                  <option>Field Notes</option>
                </select>
              </label>
              <button
                type="submit"
                className={[ui.button, ui.inkPrimary].join(" ")}
              >
                Create project
              </button>
            </form>
          </DemoDialog>
          <DemoDialog
            open={selected !== null}
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
            title={selected?.name ?? "Project"}
          >
            <dl className={ui.details}>
              <div>
                <dt>Client</dt>
                <dd>{selected?.client}</dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>{selected?.status}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{selected?.due}</dd>
              </div>
              <div>
                <dt>Value</dt>
                <dd>{money.format(selected?.value ?? 0)}</dd>
              </div>
            </dl>
          </DemoDialog>
        </AppWindow>
      </Reveal>
    </section>
  );
}

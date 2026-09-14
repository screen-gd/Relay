"use client";

import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Images,
  LayoutGrid,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

type ProjectStatus = "Delivered" | "Review" | "In progress";

type Project = {
  id: string;
  name: string;
  type: string;
  dueDate: string | null;
  status: ProjectStatus;
  progress: number;
  value: number | null;
  paid: number;
  priority: "Low" | "Medium";
  client: string;
  order: number;
};

const seedProjects: Project[] = [
  {
    id: "summer-launch",
    name: "Summer launch film",
    type: "Client project",
    dueDate: "2025-05-05",
    status: "In progress",
    progress: 72,
    value: 1800,
    paid: 0,
    priority: "Medium",
    client: "Aperture Coffee",
    order: 5,
  },
  {
    id: "founder-story",
    name: "Founder story cutdown",
    type: "Client project",
    dueDate: "2025-05-07",
    status: "Review",
    progress: 86,
    value: 950,
    paid: 0,
    priority: "Medium",
    client: "Orbit Labs",
    order: 4,
  },
  {
    id: "field-notes",
    name: "Field Notes episode 12",
    type: "Client project",
    dueDate: "2025-05-08",
    status: "Delivered",
    progress: 100,
    value: 1200,
    paid: 1200,
    priority: "Low",
    client: "Field Notes",
    order: 3,
  },
  {
    id: "campaign-cutdowns",
    name: "Campaign cutdowns",
    type: "Client project",
    dueDate: "2025-05-02",
    status: "Delivered",
    progress: 100,
    value: 760,
    paid: 760,
    priority: "Low",
    client: "Aperture Coffee",
    order: 2,
  },
  {
    id: "product-teaser",
    name: "Product teaser",
    type: "Client project",
    dueDate: "2025-04-29",
    status: "Review",
    progress: 91,
    value: 1050,
    paid: 0,
    priority: "Medium",
    client: "Orbit Labs",
    order: 1,
  },
];

const recentActivity = [
  "Field Notes episode 12 was delivered",
  "Founder story cutdown entered review",
  "Summer launch film was updated",
  "Product teaser entered review",
];

const teamActivity = [
  "Maya moved Founder story cutdown to review",
  "Jordan updated Summer launch film",
  "Maya delivered Field Notes episode 12",
];

const sidebarGroups = [
  [
    { label: "Dashboard demo", icon: LayoutGrid },
    { label: "Schedule", icon: CalendarDays },
    { label: "Workflow demo", icon: Workflow },
  ],
  [
    { label: "Projects", icon: FolderKanban },
    { label: "Clients", icon: Users },
    { label: "Client feedback", icon: MessageSquare },
    { label: "Project files", icon: FileText },
    { label: "Media library", icon: Images },
    { label: "Approvals", icon: ClipboardCheck },
  ],
  [
    { label: "Resources", icon: BookOpen },
    { label: "Automation", icon: Sparkles },
    { label: "Reports", icon: BarChart3 },
  ],
] as const;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const formatDueDate = (date: Project["dueDate"]) =>
  date ? dateFormat.format(new Date(date)) : "No date";

export default function InteractiveDashboard() {
  const [projects, setProjects] = useState(seedProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [activityScope, setActivityScope] = useState<"Recent" | "Team">(
    "Recent"
  );
  const [selectedId, setSelectedId] = useState(seedProjects[0].id);
  const [activeSidebarItem, setActiveSidebarItem] = useState("Dashboard demo");
  const [notice, setNotice] = useState("");

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects
      .filter((project) => status === "All" || project.status === status)
      .filter((project) => project.name.toLowerCase().includes(normalizedQuery))
      .toSorted((left, right) =>
        sort === "Newest"
          ? right.order - left.order
          : left.name.localeCompare(right.name)
      );
  }, [projects, query, sort, status]);

  const selectedProject =
    visibleProjects.find((project) => project.id === selectedId) ??
    visibleProjects[0];
  const waitingReviews = projects.filter(
    (project) => project.status === "Review"
  ).length;
  const deliveredProjects = projects.filter(
    (project) => project.status === "Delivered"
  ).length;
  const upcomingProjects = projects.filter(
    (project) =>
      project.status !== "Delivered" &&
      project.dueDate !== null &&
      project.dueDate >= "2025-05-05" &&
      project.dueDate <= "2025-05-11"
  ).length;
  const collected = projects.reduce(
    (total, project) => total + project.paid,
    0
  );
  const outstanding = projects.reduce(
    (total, project) => total + (project.value ?? 0) - project.paid,
    0
  );
  const activity = activityScope === "Recent" ? recentActivity : teamActivity;

  const createProject = () => {
    const project: Project = {
      id: `untitled-${projects.length + 1}`,
      name: "Untitled edit",
      type: "Client project",
      dueDate: null,
      status: "In progress",
      progress: 0,
      value: null,
      paid: 0,
      priority: "Medium",
      client: "No client",
      order: projects.length + 1,
    };
    setProjects((current) => [project, ...current]);
    setSelectedId(project.id);
    setQuery("");
    setStatus("All");
    setSort("Newest");
    setNotice("Draft project created");
  };

  return (
    <div className="demo-dashboard">
      <aside className="demo-sidebar" aria-label="Workspace sections">
        <span className="demo-app-mark" aria-hidden="true">
          <Image
            src="/brand/relay/mark-white.svg"
            width={20}
            height={20}
            alt=""
          />
        </span>
        <nav>
          {sidebarGroups.map((group, groupIndex) => (
            <div className="demo-sidebar-group" key={groupIndex}>
              {group.map((item) => {
                const Icon = item.icon;
                const isActive = item.label === activeSidebarItem;
                return (
                  <button
                    className={isActive ? "is-active" : ""}
                    key={item.label}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={isActive}
                    title={item.label}
                    onClick={() => setActiveSidebarItem(item.label)}
                  >
                    <Icon size={15} strokeWidth={1.7} />
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          className="demo-settings"
          type="button"
          aria-label="Settings"
          aria-pressed={activeSidebarItem === "Settings"}
          title="Settings"
          onClick={() => setActiveSidebarItem("Settings")}
        >
          <Settings size={15} strokeWidth={1.7} />
        </button>
        <span className="demo-sidebar-collapse" aria-hidden="true">
          <PanelLeftClose size={14} strokeWidth={1.7} />
        </span>
      </aside>

      <div className="demo-workspace">
        <header className="demo-topbar">
          <div className="demo-breadcrumb">
            <span>Relay</span>
            <b>/</b>
            <strong>Dashboard</strong>
          </div>
          <label className="demo-quick-search">
            <Search size={14} strokeWidth={1.7} />
            <span className="sr-only">Quick search</span>
            <input
              aria-label="Quick search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Quick search"
            />
          </label>
          <div className="demo-top-actions">
            <button
              className="demo-icon-button"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={14} />
            </button>
            <button type="button" onClick={createProject}>
              <Plus size={14} />
              Quick create
            </button>
          </div>
        </header>

        <div className="demo-main">
          <section className="demo-dashboard-heading">
            <div>
              <h3>Good to see you, Screen.</h3>
            </div>
            <div className="demo-ledger-tools">
              <label>
                <Search size={14} />
                <span className="sr-only">Search the project ledger</span>
                <input
                  aria-label="Search the project ledger"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the project ledger"
                />
              </label>
              <label className="demo-select">
                <SlidersHorizontal size={14} />
                <span className="sr-only">Filter projects</span>
                <select
                  aria-label="Filter projects"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option>All</option>
                  <option>Delivered</option>
                  <option>Review</option>
                  <option>In progress</option>
                </select>
              </label>
              <label className="demo-select">
                <span className="sr-only">Sort projects</span>
                <select
                  aria-label="Sort projects"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option>Newest</option>
                  <option>Name</option>
                </select>
              </label>
            </div>
          </section>

          <section className="demo-overview-grid">
            <div className="demo-attention">
              <strong>Attention queue</strong>
              <p>{waitingReviews} projects are waiting for client review.</p>
            </div>
            <div className="demo-activity">
              <div className="demo-panel-title">
                <strong>Activity</strong>
                <div>
                  <button
                    className={activityScope === "Recent" ? "is-active" : ""}
                    aria-pressed={activityScope === "Recent"}
                    onClick={() => setActivityScope("Recent")}
                    type="button"
                  >
                    Recent
                  </button>
                  <button
                    className={activityScope === "Team" ? "is-active" : ""}
                    aria-pressed={activityScope === "Team"}
                    onClick={() => setActivityScope("Team")}
                    type="button"
                  >
                    Team
                  </button>
                </div>
              </div>
              {activity.map((item) => (
                <div className="demo-activity-row" key={item}>
                  <CheckCircle2 size={14} />
                  <span>
                    <b>{item}</b>
                    <small>Workspace · 4d ago</small>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="demo-metrics" aria-label="Production metrics">
            <div>
              <span>In motion</span>
              <b>
                {
                  projects.filter((project) => project.status === "In progress")
                    .length
                }
              </b>
              <small>of {projects.length} projects</small>
            </div>
            <div>
              <span>Due within 7 days</span>
              <b>{upcomingProjects}</b>
              <small>upcoming handoffs</small>
            </div>
            <div>
              <span>Waiting reviews</span>
              <b>{waitingReviews}</b>
              <small>awaiting client action</small>
            </div>
            <div>
              <span>Collected</span>
              <b>{currency.format(collected)}</b>
              <small>{currency.format(outstanding)} due</small>
            </div>
            <div>
              <span>Salary batch</span>
              <b>{deliveredProjects}</b>
              <small>/ {projects.length} edits</small>
              <strong className="demo-batch-percent">
                {Math.round((deliveredProjects / projects.length) * 100)}%
              </strong>
              <button
                className="demo-payment-button"
                type="button"
                onClick={() =>
                  setNotice("Sample salary batch marked for payment")
                }
              >
                Mark payment
              </button>
              <i className="demo-batch-progress" aria-hidden="true">
                <b
                  style={{
                    width: `${(deliveredProjects / projects.length) * 100}%`,
                  }}
                />
              </i>
            </div>
          </section>

          <section
            className="demo-ledger"
            id="demo-projects"
            aria-label="Project ledger"
          >
            <div className="demo-ledger-header">
              <strong>Project ledger</strong>
              <span>{visibleProjects.length}</span>
            </div>
            <div className="demo-project-head">
              <span>Project</span>
              <span>Type</span>
              <span>Due date</span>
              <span>Status</span>
              <span>Progress</span>
              <span>Value</span>
              <span />
            </div>
            <div className="demo-project-list">
              {visibleProjects.length > 0 ? (
                visibleProjects.map((project) => (
                  <button
                    className={`demo-project-row${project.id === selectedProject?.id ? " is-selected" : ""}`}
                    type="button"
                    key={project.id}
                    aria-pressed={project.id === selectedProject?.id}
                    onClick={() => setSelectedId(project.id)}
                  >
                    <span className="demo-project-name">
                      <i>
                        <FolderKanban size={13} />
                      </i>
                      <span>
                        <b>{project.name}</b>
                        <small>{project.client}</small>
                      </span>
                    </span>
                    <span>{project.type}</span>
                    <span>{formatDueDate(project.dueDate)}</span>
                    <span>
                      <em data-status={project.status}>{project.status}</em>
                    </span>
                    <span className="demo-progress">
                      <small>{project.progress}%</small>
                      <i>
                        <b style={{ width: `${project.progress}%` }} />
                      </i>
                    </span>
                    <span>
                      {project.value === null
                        ? "Not set"
                        : currency.format(project.value)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="demo-empty">No projects match this view.</p>
              )}
            </div>
          </section>

          {selectedProject ? (
            <aside
              className="demo-project-detail"
              aria-label="Selected project"
            >
              <div className="demo-detail-title">
                <span>
                  <i />
                  {selectedProject.name}
                </span>
              </div>
              <em data-status={selectedProject.status}>
                {selectedProject.status}
              </em>
              <dl>
                <div>
                  <dt>Client</dt>
                  <dd>{selectedProject.client}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedProject.type}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>{formatDueDate(selectedProject.dueDate)}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{selectedProject.priority}</dd>
                </div>
              </dl>
              <div className="demo-detail-progress">
                <span>
                  Progress <b>{selectedProject.progress}%</b>
                </span>
                <i>
                  <b style={{ width: `${selectedProject.progress}%` }} />
                </i>
              </div>
              <div className="demo-detail-action">
                <span>
                  <small>Value</small>
                  <b>
                    {selectedProject.value === null
                      ? "Not set"
                      : currency.format(selectedProject.value)}
                  </b>
                </span>
                <button
                  type="button"
                  onClick={() => setNotice("Workflow preview opened")}
                >
                  View workflow <ArrowRight size={14} />
                </button>
              </div>
            </aside>
          ) : (
            <aside className="demo-project-detail demo-empty">
              Select a matching project to view its details.
            </aside>
          )}
        </div>
      </div>
      {notice ? (
        <div className="demo-notice" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}

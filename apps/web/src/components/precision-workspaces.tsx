"use client";

import {
  Copy,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "@/components/icons";
import { Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Client, SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import {
  paymentStatusTone,
  projectStatusTone,
} from "@/lib/project-status-style";
import {
  buildPayoutReport,
  paidSharePercent,
  payoutReportToCsv,
  type PayoutPeriod,
} from "@/lib/payout-reporting";
import {
  buildInvoiceDrafts,
  invoiceDraftsToCsv,
} from "@/lib/invoice-reporting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { projectLink } from "@/features/projects/project-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { PaidShareMeter } from "@/components/paid-share-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { Area } from "@/components/dither-kit/area";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Bar } from "@/components/dither-kit/bar";
import { Grid } from "@/components/dither-kit/grid";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Pie } from "@/components/dither-kit/pie";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import {
  PALETTE,
  rgb,
  type DitherColor,
} from "@/components/dither-kit/palette";
import { useHydratedReducedMotion } from "@/lib/motion";

/** Series colors for the dither charts, in order of use. */
const ditherColors = [
  "lime",
  "blue",
  "green",
  "purple",
  "pink",
] satisfies DitherColor[];
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsCount, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContentSection,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageActions,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  SectionNav,
  sectionListClassName,
  sectionRowClassName,
  WorkspacePage,
} from "@/components/workspace-page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

/** A Project in progress: not delivered, cancelled, or archived. */
function active(project: WorkItem) {
  return (
    !delivered(project) && project.status !== "Cancelled" && !project.archived
  );
}

function review(project: WorkItem) {
  return (
    ["Review", "Revision", "Client Review"].includes(project.status) ||
    /review|feedback|approval|revision/i.test(project.notes)
  );
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function priorDateRange(start: string, end: string) {
  if (!start || !end) return undefined;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const days =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  const priorEnd = new Date(startDate);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - days + 1);
  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function clientInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CL"
  );
}

type ClientRecord = Client & {
  projects: WorkItem[];
  active: number;
  delivered: number;
  earned: number;
  collected: number;
  outstanding: number;
};

const payoutPeriods = ["month", "quarter", "year", "custom", "all"] as const;

export function PrecisionClients({
  projects,
  settings,
  onAddClient,
  onUpdateClient,
  onViewProject,
  loading = false,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  onAddClient: (client: Omit<Client, "id" | "archived">) => void;
  onUpdateClient: (client: Client) => void;
  onViewProject: (project: WorkItem) => void;
  /** Completed history is still loading; counts and totals wait for it. */
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [copiedName, setCopiedName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [hubContactName, setHubContactName] = useState("");
  const [hubContactEmail, setHubContactEmail] = useState("");
  const [hubMessage, setHubMessage] = useState("");
  const addHubContact = useMutation(api.clientHub.addContact);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const clients = useMemo(() => {
    const savedRecords = settings.clients.length
      ? settings.clients
      : settings.customClients.map((name) => ({
          id: `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name,
          company: "",
          contactName: "",
          email: "",
          phone: "",
          notes: "",
          archived: false,
        }));
    const records = [...savedRecords];
    const knownIds = new Set(records.map((client) => client.id));
    const knownNames = new Set(
      records.map((client) => client.name.trim().toLowerCase())
    );
    for (const project of projects) {
      const name = project.client?.trim();
      const normalizedName = name?.toLowerCase();
      if (!name || !normalizedName) continue;
      if (
        (project.clientId && knownIds.has(project.clientId)) ||
        knownNames.has(normalizedName)
      ) {
        continue;
      }
      const id =
        project.clientId ||
        `client-${normalizedName.replace(/[^a-z0-9]+/g, "-")}`;
      records.push({
        id,
        name,
        company: "",
        contactName: "",
        email: "",
        phone: "",
        notes: "",
        archived: false,
      });
      knownIds.add(id);
      knownNames.add(normalizedName);
    }
    const map = new Map<string, { client: Client; projects: WorkItem[] }>(
      records.map((client) => [client.id, { client, projects: [] }])
    );
    for (const project of projects) {
      const name = project.client?.trim();
      if (!project.clientId && !name) continue;
      const entry =
        (project.clientId ? map.get(project.clientId) : undefined) ??
        [...map.values()].find(
          ({ client }) => client.name.toLowerCase() === name?.toLowerCase()
        );
      if (entry) entry.projects.push(project);
    }
    return Array.from(map.values())
      .map(({ client, projects: clientProjects }): ClientRecord => {
        const deliveredProjects = clientProjects.filter(delivered);
        const earned = deliveredProjects.reduce(
          (sum, project) => sum + (Number(project.earnings) || 0),
          0
        );
        const collected = deliveredProjects
          .filter((project) => project.paid)
          .reduce((sum, project) => sum + (Number(project.earnings) || 0), 0);
        return {
          ...client,
          projects: clientProjects,
          active: clientProjects.filter(active).length,
          delivered: deliveredProjects.length,
          earned,
          collected,
          outstanding: earned - collected,
        };
      })
      .filter((client) => showArchived || !client.archived)
      .filter(
        (client) =>
          !query.trim() ||
          [client.name, client.company, client.contactName, client.email].some(
            (value) => value.toLowerCase().includes(query.trim().toLowerCase())
          )
      )
      .sort(
        (a, b) =>
          b.projects.length - a.projects.length || a.name.localeCompare(b.name)
      );
  }, [projects, query, settings.clients, settings.customClients, showArchived]);

  useEffect(() => {
    if (!clients.some((client) => client.name === selectedName))
      setSelectedName(clients[0]?.name ?? "");
  }, [clients, selectedName]);

  useEffect(() => {
    if (!copiedName) return;
    const timeout = window.setTimeout(() => setCopiedName(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedName]);

  const selected =
    clients.find((client) => client.name === selectedName) ??
    clients[0] ??
    null;

  function addClient() {
    const name = newClient.trim();
    if (!name) return;
    onAddClient({
      name,
      company: newCompany.trim(),
      contactName: newContactName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      notes: newNotes.trim(),
    });
    setSelectedName(name);
    setNewClient("");
    setNewCompany("");
    setNewContactName("");
    setNewEmail("");
    setNewPhone("");
    setNewNotes("");
    setAddOpen(false);
  }

  async function copyClientName(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
    } catch {
      setCopiedName("");
    }
  }

  async function grantHubAccess(clientId: string) {
    setHubMessage("");
    try {
      await addHubContact({
        clientId,
        name: hubContactName,
        email: hubContactEmail,
      });
      setHubContactName("");
      setHubContactEmail("");
      setHubMessage("Client Hub access added.");
    } catch (error) {
      setHubMessage(
        error instanceof Error ? error.message : "Could not add access."
      );
    }
  }

  return (
    <WorkspacePage family="master-detail" mode="fill">
      <PageHeader
        title="Clients"
        description="Each client's projects and delivery history."
        actions={
          <PageActions
            primary={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus /> New client
              </Button>
            }
            more={[
              {
                label: "Show archived",
                onSelect: () => setShowArchived((value) => !value),
                checked: showArchived,
              },
            ]}
          />
        }
      />

      <PageContent mode="fill">
        <MasterDetail
          className={cn(
            "min-h-0 flex-1 lg:overflow-hidden",
            !clients.length &&
              !query.trim() &&
              "lg:grid-cols-1 [&>div:first-child]:hidden"
          )}
          master={
            <aside className="flex min-h-0 flex-col overflow-hidden rounded-frame bg-well p-1 lg:h-full">
              <div className="flex items-center gap-2 px-2 pt-1 pb-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search clients"
                    aria-label="Search clients"
                    className="ps-8 pe-8"
                  />
                  {query ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Clear client search"
                      className="absolute end-1.5 top-1/2 -translate-y-1/2"
                      onClick={() => setQuery("")}
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
                <span className="shrink-0 text-text-3 type-label-sm data">
                  {clients.length}
                </span>
              </div>
              <ul
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-soft bg-page shadow-[0_0_0_1px_var(--line-frame)]"
                aria-label="Client directory"
              >
                {clients.map((client) => (
                  <li key={client.name} className="rule-row">
                    <button
                      type="button"
                      aria-pressed={selected?.name === client.name}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-start outline-none transition-colors duration-(--dur-fast) hover:bg-hover focus-visible:focus-ring-inset",
                        selected?.name === client.name && "bg-selected"
                      )}
                      aria-label={`${client.name}, ${client.projects.length} projects, ${client.active} active`}
                      onClick={() => setSelectedName(client.name)}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tile text-text-1 type-label-sm">
                        {clientInitials(client.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-text-1 type-label">
                          {client.name}
                        </span>
                        <span className="mt-0.5 flex gap-2 text-text-3 type-label-sm">
                          <span>{client.projects.length} projects</span>
                          <span>{client.active} active</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {!clients.length ? (
                  <li>
                    <PageEmptyState
                      compact
                      title={
                        query.trim() ? "No clients match" : "No clients yet"
                      }
                      description={
                        query.trim()
                          ? `Nothing matches "${query.trim()}". Clear the search to see every client.`
                          : showArchived
                            ? "Create a client to group projects and payments."
                            : "Create a client, or show archived clients from the More menu."
                      }
                    />
                  </li>
                ) : null}
              </ul>
            </aside>
          }
          detail={
            selected ? (
              <section
                aria-label={`${selected.name} details`}
                className="@container flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain lg:h-full"
              >
                <header className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-text-1 type-heading-sm">
                      {selected.name}
                    </h2>
                    <p className="mt-1 flex flex-wrap gap-3 text-text-2 type-label-sm">
                      {selected.company ? (
                        <span>{selected.company}</span>
                      ) : null}
                      <span>{selected.active} active</span>
                      {loading ? null : (
                        <span>{selected.delivered} delivered</span>
                      )}
                      {selected.archived ? (
                        <span className="text-text-3">Archived</span>
                      ) : null}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingClient(selected)}
                  >
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`More actions for ${selected.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => void copyClientName(selected.name)}
                      >
                        <Copy />
                        {copiedName === selected.name
                          ? "Name copied"
                          : "Copy name"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          onUpdateClient({
                            ...selected,
                            archived: !selected.archived,
                          })
                        }
                      >
                        {selected.archived
                          ? "Restore client"
                          : "Archive client"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </header>

                <MetricStrip
                  columns={4}
                  aria-label={`${selected.name} totals`}
                  aria-busy={loading || undefined}
                >
                  {(
                    [
                      ["Projects", String(selected.projects.length)],
                      ["Earned", money(selected.earned, settings.currencyCode)],
                      [
                        "Paid",
                        money(selected.collected, settings.currencyCode),
                      ],
                      [
                        "Unpaid",
                        money(selected.outstanding, settings.currencyCode),
                      ],
                    ] as const
                  ).map(([label, value]) => (
                    <MetricItem
                      key={label}
                      label={label}
                      value={
                        loading ? (
                          <Skeleton className="h-5 w-20 rounded-inner" />
                        ) : (
                          value
                        )
                      }
                    />
                  ))}
                </MetricStrip>

                {/* Projects lead; contact and Hub access sit beside them as the
                    client's properties once the pane is wide enough, and above
                    them when it is not. */}
                <div className="grid items-start gap-4 @2xl:grid-cols-[minmax(0,1fr)_280px]">
                  <ContentSection
                    title="Projects"
                    metadata={
                      <span className="text-text-3 type-label-sm data">
                        {selected.projects.length}
                      </span>
                    }
                    bodyMode="flush"
                  >
                    {selected.projects.length ? (
                      <ul className={sectionListClassName}>
                        {selected.projects
                          .slice()
                          .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                          .map((project) => (
                            <li key={project.id}>
                              <button
                                type="button"
                                className={cn(
                                  sectionRowClassName,
                                  "grid w-full gap-x-4 gap-y-1 text-start outline-none focus-visible:focus-ring-inset sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-center"
                                )}
                                aria-label={`Open ${project.title}`}
                                onClick={() => onViewProject(project)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-text-1 type-label">
                                    {project.title}
                                  </span>
                                  <span className="mt-0.5 block truncate text-text-3 type-label-sm">
                                    {project.notes || project.workType}
                                  </span>
                                </span>
                                <span className="text-text-2 type-label-sm data">
                                  {formatDate(project.dueDate)}
                                </span>
                                <Badge
                                  className={cn(
                                    "w-fit",
                                    projectStatusTone(project.status)
                                  )}
                                >
                                  {project.status}
                                </Badge>
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <PageEmptyState
                        compact
                        title="No projects yet"
                        description="Pick this client when you create a project."
                      />
                    )}
                  </ContentSection>

                  <aside
                    aria-label={`${selected.name} properties`}
                    className="-order-1 grid gap-4 @2xl:order-none"
                  >
                    <ContentSection title="Contact">
                      {[
                        selected.contactName,
                        selected.email,
                        selected.phone,
                        selected.notes,
                      ].some(Boolean) ? (
                        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-2 type-label">
                          {[
                            ["Contact", selected.contactName],
                            ["Email", selected.email],
                            ["Phone", selected.phone],
                            ["Notes", selected.notes],
                          ]
                            .filter((entry) => entry[1])
                            .map(([label, value]) => (
                              <Fragment key={label}>
                                <dt className="text-text-3">{label}</dt>
                                <dd className="min-w-0 text-text-1 [overflow-wrap:anywhere]">
                                  {value}
                                </dd>
                              </Fragment>
                            ))}
                        </dl>
                      ) : (
                        <p className="text-text-2 type-body-sm">
                          No contact details. Add them with Edit.
                        </p>
                      )}
                    </ContentSection>
                    <ContentSection
                      title="Client Hub access"
                      description="Give a contact a sign-in to this client's Hub."
                    >
                      <div className="grid gap-2">
                        <Input
                          value={hubContactName}
                          onChange={(event) =>
                            setHubContactName(event.target.value)
                          }
                          placeholder="Contact name"
                          aria-label="Client Hub contact name"
                        />
                        <Input
                          type="email"
                          value={hubContactEmail}
                          onChange={(event) =>
                            setHubContactEmail(event.target.value)
                          }
                          placeholder="contact@example.com"
                          aria-label="Client Hub contact email"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p
                            role="status"
                            className="text-text-2 type-label-sm"
                          >
                            {hubMessage}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hubContactEmail.trim()}
                            onClick={() => void grantHubAccess(selected.id)}
                          >
                            Add access
                          </Button>
                        </div>
                      </div>
                    </ContentSection>
                  </aside>
                </div>
              </section>
            ) : (
              <PageEmptyState
                title="Add your first client"
                description="Clients group projects, deliveries and payments in one place."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus /> New client
                  </Button>
                }
              />
            )
          }
        />
      </PageContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>
              Create a client record now and assign it to projects later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={newClient}
              onChange={(event) => setNewClient(event.target.value)}
              placeholder="Client name"
              aria-label="Client name"
              autoFocus
            />
            <Input
              value={newCompany}
              onChange={(event) => setNewCompany(event.target.value)}
              placeholder="Company (optional)"
              aria-label="Company"
            />
            <Input
              value={newContactName}
              onChange={(event) => setNewContactName(event.target.value)}
              placeholder="Contact name (optional)"
              aria-label="Contact name"
            />
            <Input
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="Email (optional)"
              aria-label="Email"
              type="email"
            />
            <Input
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              placeholder="Phone (optional)"
              aria-label="Phone"
            />
            <Input
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Notes (optional)"
              aria-label="Notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addClient} disabled={!newClient.trim()}>
              Create client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>
              Update the durable client record without changing its project
              links.
            </DialogDescription>
          </DialogHeader>
          {editingClient ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  "name",
                  "company",
                  "contactName",
                  "email",
                  "phone",
                  "notes",
                ] as const
              ).map((field) => (
                <Input
                  key={field}
                  aria-label={
                    {
                      name: "Client name",
                      company: "Company",
                      contactName: "Contact name",
                      email: "Email",
                      phone: "Phone",
                      notes: "Notes",
                    }[field]
                  }
                  value={editingClient[field]}
                  type={field === "email" ? "email" : "text"}
                  onChange={(event) =>
                    setEditingClient({
                      ...editingClient,
                      [field]: event.target.value,
                    })
                  }
                />
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editingClient?.name.trim()}
              onClick={() => {
                if (editingClient)
                  onUpdateClient({
                    ...editingClient,
                    name: editingClient.name.trim(),
                  });
                setEditingClient(null);
              }}
            >
              Save client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

export function PrecisionFeedback({
  projects,
  onViewProject,
}: {
  projects: WorkItem[];
  onViewProject: (project: WorkItem) => void;
}) {
  const [filter, setFilter] = useState<"All" | "Review" | "Revision">("All");
  const [selectedId, setSelectedId] = useState("");
  const queue = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            review(project) ||
            (active(project) && /client|approval/i.test(project.notes))
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [projects]
  );
  const visibleQueue = useMemo(
    () =>
      queue.filter((project) => {
        if (filter === "Revision") return project.status === "Revision";
        if (filter === "Review") return project.status !== "Revision";
        return true;
      }),
    [filter, queue]
  );
  const deliveredCount = projects.filter(delivered).length;
  const revisionCount = projects.filter(
    (project) => project.status === "Revision"
  ).length;
  const selected =
    visibleQueue.find((project) => project.id === selectedId) ??
    visibleQueue[0] ??
    null;

  useEffect(() => {
    if (!visibleQueue.some((project) => project.id === selectedId)) {
      setSelectedId(visibleQueue[0]?.id ?? "");
    }
  }, [selectedId, visibleQueue]);

  return (
    <WorkspacePage family="master-detail" mode="fill">
      <PageHeader
        title="Client reviews"
        description="Review notes, revisions and approvals for each project."
      />
      <PageContent mode="fill">
        <PageToolbar
          primary={
            <Tabs
              value={filter}
              onValueChange={(value) =>
                setFilter(
                  value === "Review" || value === "Revision" ? value : "All"
                )
              }
            >
              <TabsList aria-label="Filter review queue">
                {(["All", "Review", "Revision"] as const).map((option) => {
                  const count =
                    option === "All"
                      ? queue.length
                      : queue.filter((project) =>
                          option === "Revision"
                            ? project.status === "Revision"
                            : project.status !== "Revision"
                        ).length;
                  return (
                    <TabsTrigger
                      key={option}
                      id={`review-${option.toLowerCase()}-tab`}
                      aria-controls="review-queue-panel"
                      value={option}
                    >
                      {option === "Revision" ? "Revisions" : option}
                      <TabsCount>{count}</TabsCount>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          }
          secondary={
            <span className="flex gap-3 text-text-3 type-label-sm">
              <span>{revisionCount} in revision</span>
              <span>{deliveredCount} delivered</span>
            </span>
          }
        />
        <span className="sr-only" aria-live="polite">
          {visibleQueue.length} {filter.toLowerCase()} queue items shown
        </span>
        <MasterDetail
          variant="detail-rail"
          className="min-h-0 flex-1 lg:overflow-hidden"
          master={
            <div
              id="review-queue-panel"
              role="tabpanel"
              aria-labelledby={`review-${filter.toLowerCase()}-tab`}
              className="min-h-0 overflow-y-auto overscroll-contain rounded-frame bg-well p-1 lg:h-full"
            >
              {visibleQueue.length ? (
                <ul
                  key={filter}
                  className="animate-rise overflow-hidden rounded-soft bg-page shadow-[0_0_0_1px_var(--line-frame)]"
                >
                  {visibleQueue.map((project) => (
                    <li key={project.id} className="rule-row">
                      <button
                        type="button"
                        aria-pressed={selected?.id === project.id}
                        className={cn(
                          "grid w-full gap-x-4 gap-y-1 px-4 py-3 text-start outline-none transition-colors duration-(--dur-fast) hover:bg-hover focus-visible:focus-ring-inset sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-center",
                          selected?.id === project.id && "bg-selected"
                        )}
                        onClick={() => setSelectedId(project.id)}
                        onDoubleClick={() => onViewProject(project)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            (event.metaKey || event.ctrlKey)
                          )
                            onViewProject(project);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-text-1 type-label">
                            {project.title}
                          </span>
                          <span className="mt-0.5 block truncate text-text-3 type-label-sm">
                            {project.notes ||
                              project.client ||
                              project.workType}
                          </span>
                        </span>
                        <span className="text-text-2 type-label-sm data">
                          Due {formatDate(project.dueDate)}
                        </span>
                        <Badge
                          className={cn(
                            "w-fit",
                            projectStatusTone(project.status)
                          )}
                        >
                          {project.status}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <PageEmptyState
                  title={
                    filter === "All"
                      ? "Nothing is waiting on review"
                      : `No ${filter === "Revision" ? "revisions" : "reviews"}`
                  }
                  description={
                    filter === "All"
                      ? "Send a project to client review from its Client review tab to start a thread."
                      : filter === "Revision"
                        ? "Projects marked for revision show up here."
                        : "Projects sent to client review show up here."
                  }
                />
              )}
            </div>
          }
          detail={
            <section
              data-slot="review-detail"
              aria-label="Review details"
              className="flex min-h-0 flex-col overflow-y-auto rounded-frame bg-well lg:h-full"
            >
              {selected ? (
                <div
                  key={selected.id}
                  className="flex flex-1 animate-rise flex-col"
                >
                  <div className="p-4">
                    <h2 className="text-text-1 type-heading-xs">
                      {selected.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-3">
                      <Badge className={projectStatusTone(selected.status)}>
                        {selected.status}
                      </Badge>
                      <span className="text-text-2 type-label-sm data">
                        Due {formatDate(selected.dueDate)}
                      </span>
                    </p>
                  </div>
                  <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 pb-4 type-label">
                    <dt className="text-text-3">Client</dt>
                    <dd className="text-text-1">
                      {selected.client || "No client"}
                    </dd>
                    <dt className="text-text-3">Work type</dt>
                    <dd className="text-text-1">{selected.workType}</dd>
                    <dt className="text-text-3">Stage</dt>
                    <dd className="text-text-1">
                      {selected.status === "Revision"
                        ? "Revision requested"
                        : "Review requested"}
                    </dd>
                  </dl>
                  <div className="rule-top px-4 py-3">
                    <p className="text-text-3 type-label-sm">
                      Latest review note
                    </p>
                    <p className="mt-1 text-text-1 type-body-sm">
                      {selected.notes || "None recorded yet."}
                    </p>
                  </div>
                  <div className="mt-auto p-4">
                    <Button asChild className="w-full">
                      <Link
                        {...projectLink({
                          projectId: selected.id,
                          view: "review",
                        })}
                      >
                        Open client review
                      </Link>
                    </Button>
                    <p className="mt-2 text-text-3 type-label-sm">
                      Files, versions and comments live on the project.
                    </p>
                  </div>
                </div>
              ) : (
                <PageEmptyState
                  title="Select a review"
                  description="Pick a project on the left to read its notes."
                />
              )}
            </section>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

export function PrecisionReports({
  advancedReports = false,
  projects,
  salaryBatches,
  settings,
  editors,
  currentUserId,
  canManageFinance,
  onUpdateBatchPayment,
  batchesLocked = false,
  salaryPlans,
  earningsQa,
  loading = false,
}: {
  advancedReports?: boolean;
  projects: WorkItem[];
  salaryBatches: SalaryBatch[];
  settings: SettingsState;
  editors: Array<{ userId: string; name: string }>;
  currentUserId?: string;
  canManageFinance: boolean;
  onUpdateBatchPayment: (batchId: string, paid: boolean) => void;
  /** Free workspaces keep their batch ledger but cannot record payments. */
  batchesLocked?: boolean;
  /** Owner-only salary plan panel, rendered above the batch ledger. */
  salaryPlans?: ReactNode;
  /** AI earnings Q&A panel, rendered after client totals. */
  earningsQa?: ReactNode;
  /** Completed history is still loading; totals show skeletons until it lands. */
  loading?: boolean;
}) {
  const [trendRange, setTrendRange] = useState<3 | 6 | "all">(6);
  const [reportView, setReportView] = useState<
    "overview" | "payments" | "clients" | "team"
  >("overview");
  const [period, setPeriod] = useState<PayoutPeriod>("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const reportProjects = useMemo(
    () =>
      canManageFinance
        ? projects
        : projects.map((project) => ({
            ...project,
            earnings: 0,
            paid: false,
            paidDate: "",
          })),
    [canManageFinance, projects]
  );
  const reportBatches = useMemo(
    () =>
      canManageFinance
        ? salaryBatches
        : salaryBatches.map((batch) => ({
            ...batch,
            amount: 0,
            paid: false,
            paidDate: "",
          })),
    [canManageFinance, salaryBatches]
  );
  const report = useMemo(
    () =>
      buildPayoutReport({
        projects: reportProjects,
        salaryBatches: reportBatches,
        salaryWorkType: settings.salaryWorkType,
        salaryBatchAmount: Number(settings.salaryBatchAmount) || 0,
        profileName: settings.profileName,
        editors,
        currentUserId,
        period,
        customRange,
      }),
    [
      currentUserId,
      customRange,
      editors,
      period,
      reportBatches,
      reportProjects,
      settings.profileName,
      settings.salaryBatchAmount,
      settings.salaryWorkType,
    ]
  );
  const salaryEdits = report.deliveredProjects.filter(
    (project) => project.isSalaryEdit
  ).length;
  const priorRange = priorDateRange(report.periodStart, report.periodEnd);
  const priorReport = useMemo(
    () =>
      priorRange
        ? buildPayoutReport({
            projects: reportProjects,
            salaryBatches: reportBatches,
            salaryWorkType: settings.salaryWorkType,
            salaryBatchAmount: Number(settings.salaryBatchAmount) || 0,
            profileName: settings.profileName,
            editors,
            currentUserId,
            period: "custom",
            customRange: priorRange,
          })
        : null,
    [
      currentUserId,
      editors,
      priorRange,
      reportBatches,
      reportProjects,
      settings.profileName,
      settings.salaryBatchAmount,
      settings.salaryWorkType,
    ]
  );
  const deliveredIds = new Set(
    report.deliveredProjects.map((project) => project.id)
  );
  const completedProjects = reportProjects.filter((project) =>
    deliveredIds.has(project.id)
  );
  const outputCount = completedProjects.reduce(
    (total, project) => total + (project.templateDeliverables?.length ?? 0),
    0
  );
  const turnaroundProjects = completedProjects.filter(
    (project) => project.startDate && project.completedAt
  );
  const averageTurnaround = turnaroundProjects.length
    ? Math.round(
        turnaroundProjects.reduce(
          (total, project) =>
            total +
            Math.max(
              0,
              (new Date(project.completedAt!).getTime() -
                new Date(`${project.startDate}T00:00:00`).getTime()) /
                86_400_000
            ),
          0
        ) / turnaroundProjects.length
      )
    : 0;
  const delayedStages = projects.filter(
    (project) =>
      active(project) &&
      project.dueDate &&
      project.dueDate < new Date().toISOString().slice(0, 10)
  ).length;
  const invoiceDrafts = useMemo(
    () =>
      buildInvoiceDrafts({
        projects: reportProjects,
        salaryWorkType: settings.salaryWorkType,
        currencyCode: settings.currencyCode,
        period,
        customRange,
      }),
    [
      customRange,
      period,
      reportProjects,
      settings.currencyCode,
      settings.salaryWorkType,
    ]
  );
  const trendSeries = useMemo(() => {
    const map = new Map<
      string,
      { label: string; earned: number; delivered: number }
    >();
    const addPoint = (
      dateValue: string,
      earned: number,
      deliveredCount: number
    ) => {
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = map.get(key) ?? {
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
        earned: 0,
        delivered: 0,
      };
      existing.earned += earned;
      existing.delivered += deliveredCount;
      map.set(key, existing);
    };
    for (const project of report.deliveredProjects)
      addPoint(project.date, project.amount, 1);
    for (const batch of report.batches) addPoint(batch.date, batch.amount, 0);
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [report.batches, report.deliveredProjects]);
  const trendData =
    trendRange === "all" ? trendSeries : trendSeries.slice(-trendRange);

  const mixData = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of report.deliveredProjects)
      map.set(project.workType, (map.get(project.workType) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [report.deliveredProjects]);
  const reduceMotion = useHydratedReducedMotion();
  const mixConfig = Object.fromEntries(
    mixData.map((item, index) => [
      item.name,
      { label: item.name, color: ditherColors[index % ditherColors.length] },
    ])
  );
  /** Top six clients by delivered value, for the stacked paid/unpaid bars. */
  const clientChartData = [...report.clients]
    .sort((a, b) => b.collected + b.outstanding - (a.collected + a.outstanding))
    .slice(0, 6)
    .map((client) => ({
      name: client.name,
      paid: client.collected,
      unpaid: client.outstanding,
    }));
  const editorSummary = report.editors.length
    ? report.editors.map((editor) => ({
        userId: editor.id,
        name: editor.name,
        delivered: editor.deliveredProjects,
        value: editor.totalEarnings,
      }))
    : [
        {
          userId: "workspace",
          name: settings.profileName || "Workspace owner",
          delivered: 0,
          value: 0,
        },
      ];

  function downloadCsv(csv: string, fileName: string) {
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportReport() {
    downloadCsv(
      payoutReportToCsv(report, settings.currencyCode),
      `relay-payout-report-${period}.csv`
    );
  }

  function exportInvoiceDrafts() {
    downloadCsv(
      invoiceDraftsToCsv(invoiceDrafts),
      `relay-invoice-drafts-${period}.csv`
    );
  }

  const reportViews = [
    { id: "overview" as const, label: "Overview" },
    { id: "payments" as const, label: "Payments" },
    ...(advancedReports
      ? [
          { id: "clients" as const, label: "Clients" },
          { id: "team" as const, label: "Team" },
        ]
      : []),
  ];
  const money_ = (value: number) => money(value, settings.currencyCode);

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="Payments"
        description="Earnings, deliveries, work mix and payment batches."
        actions={
          <>
            <Select
              value={period}
              onValueChange={(value) => {
                const nextPeriod = payoutPeriods.find(
                  (candidate) => candidate === value
                );
                if (nextPeriod) setPeriod(nextPeriod);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-[132px]"
                aria-label="Payout period"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="custom">Custom dates</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            {advancedReports ? (
              <PageActions
                more={[
                  {
                    label: "Export payout CSV",
                    onSelect: exportReport,
                    disabled: !canManageFinance,
                  },
                  {
                    label: "Export invoice drafts",
                    onSelect: exportInvoiceDrafts,
                    disabled: !invoiceDrafts.length,
                  },
                ]}
              />
            ) : null}
          </>
        }
      />

      <SectionNav
        aria-label="Payment report views"
        items={reportViews}
        value={reportView}
        onValueChange={setReportView}
      />

      {period === "custom" ? (
        <div className="flex flex-wrap gap-2" aria-label="Custom report dates">
          <DatePicker
            aria-label="Report start date"
            placeholder="Start date"
            className="w-auto"
            value={customRange.start}
            onChange={(start) =>
              setCustomRange((range) => ({ ...range, start }))
            }
            weekStart={settings.weekStart}
            dateFormat={settings.dateFormat}
          />
          <DatePicker
            aria-label="Report end date"
            placeholder="End date"
            className="w-auto"
            value={customRange.end}
            onChange={(end) => setCustomRange((range) => ({ ...range, end }))}
            weekStart={settings.weekStart}
            dateFormat={settings.dateFormat}
          />
        </div>
      ) : null}

      <div key={reportView} className="grid min-w-0 animate-rise gap-4">
        {loading ? <ReportsSkeleton /> : null}
        {!loading && reportView === "overview" ? (
          <>
            <MetricStrip columns={4} aria-label="Payment totals">
              <MetricItem
                label="Earned"
                value={canManageFinance ? money_(report.earned) : "Restricted"}
                supporting={
                  priorReport && canManageFinance
                    ? `${money_(report.earned - priorReport.earned)} vs prior period`
                    : "Delivered projects and batches"
                }
              />
              <MetricItem
                label="Paid"
                value={
                  canManageFinance ? money_(report.collected) : "Restricted"
                }
                supporting="Delivered and paid"
              />
              <MetricItem
                label="Unpaid"
                value={
                  canManageFinance ? money_(report.outstanding) : "Restricted"
                }
                supporting="Delivered, not paid yet"
              />
              <MetricItem
                label="Delivered edits"
                value={String(report.deliveredProjects.length)}
                supporting={`${salaryEdits} salary edits`}
              />
            </MetricStrip>

            {canManageFinance && report.collected + report.outstanding > 0 ? (
              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3 type-label-sm">
                  <span className="text-text-2">Paid share</span>
                  <span className="text-text-1 data">
                    {paidSharePercent(report.collected, report.outstanding)}%
                    paid
                  </span>
                </div>
                <PaidShareMeter
                  paid={report.collected}
                  unpaid={report.outstanding}
                  label="Paid share this period"
                />
              </div>
            ) : null}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ContentSection
                title="Earnings by month"
                actions={
                  <Tabs
                    value={String(trendRange)}
                    onValueChange={(value) =>
                      setTrendRange(
                        value === "3" ? 3 : value === "all" ? "all" : 6
                      )
                    }
                  >
                    <TabsList aria-label="Earnings trend range">
                      {[
                        { value: "3", label: "3M" },
                        { value: "6", label: "6M" },
                        { value: "all", label: "All" },
                      ].map((option) => (
                        <TabsTrigger
                          key={option.value}
                          id={`earnings-${option.value}-tab`}
                          aria-controls="earnings-trend-panel"
                          value={option.value}
                        >
                          {option.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                }
              >
                <div
                  id="earnings-trend-panel"
                  role="tabpanel"
                  aria-labelledby={`earnings-${trendRange}-tab`}
                >
                  {trendData.length ? (
                    <div
                      key={trendRange}
                      role="img"
                      aria-label={`Earnings trend for ${trendData.length} months. ${trendData.map((item) => `${item.label}: ${money_(item.earned)}`).join(", ")}`}
                      className="h-[190px]"
                    >
                      <AreaChart
                        data={trendData}
                        config={{ earned: { label: "Earned", color: "lime" } }}
                        animate={!reduceMotion}
                        animationDuration={420}
                        bloom="high"
                        bloomOnHover
                      >
                        <Grid />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <ChartTooltip
                          labelKey="label"
                          valueFormatter={(value) => money_(value)}
                        />
                        <Area dataKey="earned" variant="gradient" />
                      </AreaChart>
                    </div>
                  ) : (
                    <p className="text-text-2 type-body-sm">
                      Mark a project delivered to start the earnings trend.
                    </p>
                  )}
                  <p
                    className="mt-3 text-text-2 type-body-sm"
                    aria-label="Earnings trend summary"
                  >
                    {trendData.length
                      ? `${trendData.reduce((sum, item) => sum + item.delivered, 0)} delivered edits earned ${money_(
                          trendData.reduce((sum, item) => sum + item.earned, 0)
                        )} across ${trendData.length} month${trendData.length === 1 ? "" : "s"}.`
                      : "No deliveries in this period yet."}
                  </p>
                </div>
              </ContentSection>

              <ContentSection title="Work mix" bodyClassName="flex flex-col">
                {mixData.length ? (
                  // The chart takes the height the trend panel beside it sets;
                  // the legend sits on the bottom edge like the trend summary.
                  <div className="flex flex-1 flex-col justify-between gap-4">
                    <div
                      role="img"
                      aria-label={`Work mix: ${mixData.map((item) => `${item.name}, ${item.value} projects`).join("; ")}`}
                      className="min-h-[170px] flex-1"
                    >
                      <PieChart
                        className="mx-auto max-w-[240px]"
                        data={mixData}
                        config={mixConfig}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={0.65}
                        animate={!reduceMotion}
                        animationDuration={420}
                        bloom="high"
                        bloomOnHover
                      >
                        <Pie variant="gradient" />
                        <ChartTooltip labelKey="name" />
                      </PieChart>
                    </div>
                    <ul className="grid gap-1.5" aria-label="Work mix legend">
                      {mixData.map((item, index) => (
                        <li
                          key={item.name}
                          className="flex items-center gap-2 type-label-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-inner"
                            style={{
                              background: rgb(
                                PALETTE[
                                  ditherColors[index % ditherColors.length]
                                ].fill
                              ),
                            }}
                          />
                          <span className="truncate text-text-2">
                            {item.name}
                          </span>
                          <span className="ms-auto text-text-1 data">
                            {item.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-text-2 type-body-sm">
                    Deliver projects to see how your work splits across types.
                  </p>
                )}
              </ContentSection>
            </div>

            <ContentSection title="This period">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <PeriodMetric
                  label="Completed projects"
                  value={String(report.deliveredProjects.length)}
                />
                <PeriodMetric
                  label="Outputs delivered"
                  value={String(outputCount)}
                />
                <PeriodMetric
                  label="Average days to deliver"
                  value={
                    turnaroundProjects.length
                      ? `${averageTurnaround} ${averageTurnaround === 1 ? "day" : "days"}`
                      : "No data"
                  }
                />
                <PeriodMetric
                  label="Overdue projects"
                  value={String(delayedStages)}
                />
              </dl>
              {trendSeries.length ? (
                <div
                  role="img"
                  aria-label={`Deliveries by month: ${trendSeries
                    .slice(-6)
                    .map((item) => `${item.label} ${item.delivered}`)
                    .join(", ")}`}
                  className="mt-5 h-[160px]"
                >
                  <BarChart
                    data={trendSeries.slice(-6)}
                    config={{
                      delivered: { label: "Delivered", color: "lime" },
                    }}
                    animate={!reduceMotion}
                    animationDuration={420}
                    bloom="high"
                    bloomOnHover
                  >
                    <XAxis dataKey="label" />
                    <ChartTooltip labelKey="label" />
                    <Bar dataKey="delivered" variant="gradient" />
                  </BarChart>
                </div>
              ) : null}
            </ContentSection>
            {earningsQa}
          </>
        ) : null}

        {!loading && reportView === "payments" ? (
          <>
            {salaryPlans}
            <ContentSection
              title="Payment batches"
              description="Completed batches and whether they are paid."
              metadata={
                <span className="text-text-3 type-label-sm data">
                  {report.batches.length}
                </span>
              }
              bodyMode="flush"
              footer={
                batchesLocked ? (
                  <CapabilityUpgradePrompt capability="salaryPlans" inline />
                ) : undefined
              }
            >
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4">Batch</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Edits</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="pe-4 text-end">
                      <span className="sr-only">Action</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="ps-4">
                        Batch {batch.number}
                      </TableCell>
                      <TableCell className="text-text-2 data">
                        {batch.date ? formatDate(batch.date) : "Pending"}
                      </TableCell>
                      <TableCell className="data">
                        {settings.salaryBatchSize}
                      </TableCell>
                      <TableCell className="data">
                        {money_(batch.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentStatusTone(batch.paid)}>
                          {batch.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pe-4 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${batch.paid ? "Mark unpaid" : "Mark paid"} for batch ${batch.number}`}
                          disabled={!canManageFinance || batchesLocked}
                          onClick={() =>
                            onUpdateBatchPayment(batch.id, !batch.paid)
                          }
                        >
                          {batch.paid ? "Mark unpaid" : "Mark paid"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!report.batches.length ? (
                <PageEmptyState
                  compact
                  art
                  title="No batches yet"
                  description="Finish the next salary batch to record its payment here."
                />
              ) : null}
            </ContentSection>

            {advancedReports ? (
              <ContentSection
                title="Invoice drafts"
                description="Drafts for delivered client projects. Relay does not collect payments."
                bodyMode="flush"
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportInvoiceDrafts}
                    disabled={!invoiceDrafts.length}
                  >
                    <Download /> Export
                  </Button>
                }
              >
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-4">Draft</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="pe-4 text-end">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceDrafts.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell className="ps-4 data">
                          {draft.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-text-2">
                          {draft.client}
                        </TableCell>
                        <TableCell className="data">
                          {draft.lineItems.length}
                        </TableCell>
                        <TableCell className="text-text-2 data">
                          {formatDate(draft.dueDate)}
                        </TableCell>
                        <TableCell className="pe-4 text-end data">
                          {money_(draft.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!invoiceDrafts.length ? (
                  <PageEmptyState
                    compact
                    art
                    title="No invoice drafts"
                    description="Deliver a freelance project for a named client to draft its invoice."
                  />
                ) : null}
              </ContentSection>
            ) : null}
          </>
        ) : null}

        {!loading && reportView === "clients" && advancedReports ? (
          <ContentSection
            title="Client totals"
            description="Delivered value per client, paid and unpaid."
            bodyMode="flush"
          >
            {canManageFinance && report.clients.length ? (
              <div
                role="img"
                aria-label={`Paid and unpaid by client: ${clientChartData
                  .map(
                    (client) =>
                      `${client.name} ${money_(client.paid)} paid, ${money_(client.unpaid)} unpaid`
                  )
                  .join("; ")}`}
                className="h-[180px] px-4 pt-4"
              >
                <BarChart
                  data={clientChartData}
                  config={{
                    paid: { label: "Paid", color: "lime" },
                    unpaid: { label: "Unpaid", color: "grey" },
                  }}
                  stackType="stacked"
                  animate={!reduceMotion}
                  animationDuration={420}
                  bloom="high"
                  bloomOnHover
                >
                  <XAxis dataKey="name" />
                  <ChartTooltip
                    labelKey="name"
                    valueFormatter={(value) => money_(value)}
                  />
                  <Bar dataKey="paid" variant="gradient" />
                  <Bar dataKey="unpaid" variant="gradient" />
                </BarChart>
              </div>
            ) : null}
            {report.clients.length ? (
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4">Client</TableHead>
                    <TableHead className="text-end">Projects</TableHead>
                    <TableHead className="text-end">Paid</TableHead>
                    <TableHead className="text-end">Unpaid</TableHead>
                    <TableHead className="w-40 pe-4">
                      <span className="sr-only">Paid share</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.clients.map((client) => {
                    const total = client.collected + client.outstanding;
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="ps-4">{client.name}</TableCell>
                        <TableCell className="text-end data">
                          {client.deliveredProjects}
                        </TableCell>
                        <TableCell className="text-end data">
                          {canManageFinance
                            ? money_(client.collected)
                            : "Restricted"}
                        </TableCell>
                        <TableCell className="text-end data">
                          {canManageFinance
                            ? money_(client.outstanding)
                            : "Restricted"}
                        </TableCell>
                        <TableCell className="pe-4">
                          {canManageFinance && total ? (
                            <PaidShareMeter
                              size="sm"
                              paid={client.collected}
                              unpaid={client.outstanding}
                              label={`${client.name} paid share`}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <PageEmptyState
                compact
                art
                title="No client totals yet"
                description="Deliver a client project in this period to see its totals."
              />
            )}
          </ContentSection>
        ) : null}

        {!loading && reportView === "team" && advancedReports ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <ContentSection
              title="Editors"
              description="Delivered work attributed to each editor."
              metadata={
                <span className="text-text-3 type-label-sm data">
                  {editorSummary.length}
                </span>
              }
              bodyMode="flush"
            >
              <ul className={sectionListClassName}>
                {editorSummary.map((editor) => (
                  <li
                    key={editor.userId}
                    className="flex items-center gap-3 rule-row px-4 py-2.5"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tile text-text-1 type-label-sm">
                      {editor.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-text-1 type-label">
                        {editor.name}
                      </span>
                      <span className="mt-0.5 block text-text-3 type-label-sm">
                        {editor.delivered} delivered edits
                      </span>
                    </span>
                    <span className="text-text-1 type-label data">
                      {money_(editor.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </ContentSection>
            <ContentSection
              title="Delivered projects"
              description="The most recently completed work."
              metadata={
                <span className="text-text-3 type-label-sm data">
                  {report.deliveredProjects.length}
                </span>
              }
              bodyMode="flush"
            >
              {report.deliveredProjects.length ? (
                <ul className={sectionListClassName}>
                  {report.deliveredProjects.slice(0, 8).map((project) => (
                    <li
                      key={project.id}
                      className="grid grid-cols-[minmax(0,1fr)_90px_auto] items-center gap-3 rule-row px-4 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-text-1 type-label">
                          {project.title}
                        </span>
                        <span className="mt-0.5 flex gap-2 truncate text-text-3 type-label-sm">
                          <span className="truncate">{project.editorName}</span>
                          <span className="truncate">{project.workType}</span>
                        </span>
                      </span>
                      <span className="text-text-2 type-label-sm data">
                        {formatDate(project.date)}
                      </span>
                      <span className="text-text-1 type-label data">
                        {project.isSalaryEdit
                          ? "Batch"
                          : money_(project.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <PageEmptyState
                  compact
                  art
                  title="Nothing delivered yet"
                  description="Deliver a project to list it here."
                />
              )}
            </ContentSection>
          </div>
        ) : null}
      </div>
    </WorkspacePage>
  );
}

/** Stand-in for the report while completed history loads: totals, then two panels. */
function ReportsSkeleton() {
  return (
    <div
      className="grid gap-4"
      aria-label="Loading payment report"
      aria-busy="true"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="grid gap-2 px-4 py-3">
            <Skeleton className="h-2.5 w-16 rounded-inner" />
            <Skeleton className="h-5 w-24 rounded-inner" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-[220px] rounded-frame opacity-40" />
        <Skeleton className="h-[220px] rounded-frame opacity-40" />
      </div>
    </div>
  );
}

/** Unframed label/value pair for the period summary `<dl>`. */
function PeriodMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-2 type-label-sm">{label}</dt>
      <dd className="mt-1 text-text-1 type-heading-sm data">{value}</dd>
    </div>
  );
}

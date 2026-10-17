"use client";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Grid } from "@/components/dither-kit/grid";
import { type DitherColor } from "@/components/dither-kit/palette";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip as ChartTooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  FolderKanban,
  MessageSquareText,
  Plus,
  Search,
  UsersRound,
  X,
} from "@/components/icons";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContentSection,
  FillViewport,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageActions,
  PageContent,
  PageEmptyState,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { projectLink } from "@/features/projects/project-view";
import {
  buildInvoiceDrafts,
  invoiceDraftsToCsv,
} from "@/lib/invoice-reporting";
import {
  buildPayoutReport,
  payoutReportToCsv,
  type PayoutPeriod,
} from "@/lib/payout-reporting";
import {
  paymentStatusTone,
  projectStatusTone,
} from "@/lib/project-status-style";
import type { Client, SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function active(project: WorkItem) {
  return !delivered(project) && project.status !== "Cancelled";
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
}: {
  projects: WorkItem[];
  settings: SettingsState;
  onAddClient: (client: Omit<Client, "id" | "archived">) => void;
  onUpdateClient: (client: Client) => void;
  onViewProject: (project: WorkItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const clientHash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
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

  const allClients = useMemo(() => {
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
      .sort(
        (a, b) =>
          b.projects.length - a.projects.length || a.name.localeCompare(b.name)
      );
  }, [projects, settings.clients, settings.customClients]);
  const clients = useMemo(
    () =>
      allClients
        .filter((client) => showArchived || !client.archived)
        .filter(
          (client) =>
            !query.trim() ||
            [
              client.name,
              client.company,
              client.contactName,
              client.email,
            ].some((value) =>
              value.toLowerCase().includes(query.trim().toLowerCase())
            )
        ),
    [allClients, query, showArchived]
  );

  useEffect(() => {
    if (!clients.some((client) => client.name === selectedName))
      setSelectedName(clients[0]?.name ?? "");
  }, [clients, selectedName]);

  useEffect(() => {
    if (clientHash) setQuery("");
  }, [clientHash]);

  useEffect(() => {
    if (!copiedName) return;
    const timeout = window.setTimeout(() => setCopiedName(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedName]);

  const selected =
    allClients.find(
      ({ id }) => id === clientHash || encodeURIComponent(id) === clientHash
    ) ??
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
              <Button className="" onClick={() => setAddOpen(true)}>
                <Plus /> New Client
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
        {clients.length ? (
          <MetricStrip columns={3}>
            <MetricItem
              label="Clients"
              value={clients.length}
              icon={<UsersRound className="size-4" />}
              className="rounded-md"
            />
            <MetricItem
              label="Active projects"
              value={projects.filter(active).length}
              icon={<FolderKanban className="size-4" />}
              className="rounded-md"
            />
            <MetricItem
              label="Delivered"
              value={projects.filter(delivered).length}
              icon={<CheckCircle2 className="size-4" />}
              className="rounded-md"
            />
          </MetricStrip>
        ) : null}

        <FillViewport
          bodyLabel="Client workspace"
          bodyClassName="overflow-visible lg:overflow-hidden"
        >
          <MasterDetail
            className={cn(
              "min-h-full lg:h-full lg:min-h-0",
              !clients.length &&
                !query.trim() &&
                "lg:grid-cols-1 [&>div:first-child]:hidden"
            )}
            master={
              <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-3 lg:h-full">
                <div className="pb-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-meta)]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search clients..."
                      aria-label="Search clients"
                      className="pl-8 pr-8"
                    />
                    {query ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Clear client search"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2"
                            onClick={() => setQuery("")}
                          >
                            <X className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear search</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                  tabIndex={0}
                  aria-label="Scrollable client directory"
                >
                  {clients.map((client, index) => (
                    <button
                      key={client.name}
                      type="button"
                      aria-pressed={selected?.name === client.name}
                      className={cn(
                        "flex relative h-auto w-full justify-start gap-3 px-3 py-3 text-left font-normal whitespace-normal hover:bg-[var(--surface-fill)] dark:hover:bg-[var(--surface-fill)] focus-visible:z-10 text-[var(--text-primary)] min-h-10",
                        selected?.name === client.name &&
                          "bg-[var(--surface-active)] text-[var(--text-primary)] min-h-10"
                      )}
                      aria-label={`${client.name}, ${client.projects.length} projects, ${client.active} active`}
                      onClick={() => {
                        setSelectedName(client.name);
                        void navigate({
                          to: "/clients",
                          hash: client.id,
                          replace: true,
                        });
                      }}
                    >
                      {selected?.name === client.name ? (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-md bg-[var(--surface-active)]" />
                      ) : null}
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--surface-fill)] text-meta font-semibold text-[var(--text-primary)]">
                        {clientInitials(client.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">
                          {client.name}
                        </span>
                        <span className="mt-1 block text-meta text-[var(--text-meta)]">
                          {client.projects.length} projects · {client.active}{" "}
                          active
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-[var(--text-meta)]" />
                    </button>
                  ))}
                  {!clients.length ? (
                    <PageEmptyState
                      compact
                      title={query.trim() ? "No matches" : "No clients yet"}
                      description={
                        query.trim()
                          ? "Clear the search to see every client."
                          : "Create a client, or show archived clients from More."
                      }
                      action={
                        query.trim() ? (
                          <Button variant="ghost" onClick={() => setQuery("")}>
                            Clear filters
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : null}
                </div>
              </aside>
            }
            detail={
              <div className="h-full">
                {selected ? (
                  <div className="flex min-h-0 min-w-0 flex-col gap-10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-fill)] text-meta font-semibold text-[var(--text-primary)]">
                        {clientInitials(selected.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-title font-semibold">
                          {selected.name}
                        </h2>
                        <p className="mt-1 text-meta text-[var(--text-meta)]">
                          {selected.company ||
                            `${selected.active} active projects · ${selected.delivered} delivered`}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="self-start"
                        onClick={() => setEditingClient(selected)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="self-start"
                        onClick={() =>
                          onUpdateClient({
                            ...selected,
                            archived: !selected.archived,
                          })
                        }
                      >
                        {selected.archived ? "Restore" : "Archive"}
                      </Button>
                      <Button
                        variant="secondary"
                        className="self-start"
                        onClick={() => void copyClientName(selected.name)}
                        aria-label={
                          copiedName === selected.name
                            ? `${selected.name} copied`
                            : `Copy ${selected.name} to clipboard`
                        }
                      >
                        {copiedName === selected.name ? (
                          <CheckCircle2 />
                        ) : (
                          <Copy />
                        )}
                        {copiedName === selected.name ? "Copied" : "Copy name"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ClientMetric
                        label="Projects"
                        value={String(selected.projects.length)}
                      />
                      <ClientMetric
                        label="Earned"
                        value={money(selected.earned, settings.currencyCode)}
                      />
                      <ClientMetric
                        label="Paid"
                        value={money(selected.collected, settings.currencyCode)}
                      />
                      <ClientMetric
                        label="Unpaid"
                        value={money(
                          selected.outstanding,
                          settings.currencyCode
                        )}
                      />
                    </div>
                    {[
                      selected.contactName,
                      selected.email,
                      selected.phone,
                      selected.notes,
                    ].some(Boolean) ? (
                      <dl className="grid gap-3 text-body sm:grid-cols-2">
                        {[
                          ["Contact", selected.contactName],
                          ["Email", selected.email],
                          ["Phone", selected.phone],
                          ["Notes", selected.notes],
                        ]
                          .filter((entry) => entry[1])
                          .map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-meta text-[var(--text-meta)]">
                                {label}
                              </dt>
                              <dd className="mt-1 text-[var(--text-primary)]">
                                {value}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void grantHubAccess(selected.id)}
                      >
                        Add Hub access
                      </Button>
                      {hubMessage ? (
                        <p className="text-meta sm:col-span-3">{hubMessage}</p>
                      ) : null}
                    </div>
                    <section
                      className="min-h-0 flex-1"
                      tabIndex={0}
                      aria-label="Scrollable client project history"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-section">Project history</h3>
                          <p className="mt-1 text-meta text-[var(--text-meta)]">
                            Current and completed work for this client.
                          </p>
                        </div>
                      </div>
                      {selected.projects.length ? (
                        <div className="overflow-hidden rounded-md">
                          {selected.projects
                            .slice()
                            .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                            .map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                className="h-auto w-full grid justify-start gap-2 px-3 py-3 text-left font-normal whitespace-normal hover:bg-[var(--surface-fill)] dark:hover:bg-[var(--surface-fill)] focus-visible:z-10 sm:grid-cols-[minmax(0,1fr)_120px_100px_auto] sm:items-center text-[var(--text-primary)] min-h-10"
                                aria-label={`Open ${project.title}`}
                                onClick={() => onViewProject(project)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-meta font-medium">
                                    {project.title}
                                  </span>
                                  <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                                    {project.notes || project.workType}
                                  </span>
                                </span>
                                <span className="text-meta text-[var(--text-meta)]">
                                  {formatDate(project.dueDate)}
                                </span>
                                <Badge
                                  variant="secondary"
                                  status={projectStatusTone(project.status)}
                                >
                                  {project.status}
                                </Badge>
                                <ArrowRight className="size-4 text-[var(--text-meta)]" />
                              </button>
                            ))}
                        </div>
                      ) : (
                        <Empty className="min-h-56 flex-none gap-0 rounded-md p-0 text-center [text-wrap:wrap] md:p-0">
                          <div>
                            <BriefcaseBusiness className="mx-auto size-6 text-[var(--text-meta)]" />
                            <p className="mt-2 text-section">No projects yet</p>
                            <p className="mt-1 text-meta text-[var(--text-meta)]">
                              Assign this client when creating a project.
                            </p>
                          </div>
                        </Empty>
                      )}
                    </section>
                  </div>
                ) : (
                  <div className="grid h-full min-h-[420px] place-items-center p-6 text-center">
                    <PageEmptyState
                      icon={<UsersRound className="size-4" />}
                      title="Add your first client"
                      description="Create your first client to group projects, deliverables, and payment history."
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAddOpen(true)}
                        >
                          <Plus /> New Client
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            }
          />
        </FillViewport>
      </PageContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
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
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addClient} disabled={!newClient.trim()}>
              New Client
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
            <DialogTitle>Edit Client</DialogTitle>
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
            <Button variant="ghost" onClick={() => setEditingClient(null)}>
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
              Save Client
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
    <WorkspacePage family="master-detail">
      <PageHeader
        title="Client reviews"
        description="Review notes, revisions, and approvals for each project."
      />
      <PageContent>
        <MetricStrip columns={3}>
          <MetricItem
            label="Waiting for review"
            value={queue.length}
            icon={<MessageSquareText className="size-4" />}
          />
          <MetricItem
            label="Revisions"
            value={revisionCount}
            icon={<Clock3 className="size-4" />}
          />
          <MetricItem
            label="Delivered"
            value={deliveredCount}
            icon={<CheckCircle2 className="size-4" />}
          />
        </MetricStrip>
        <MasterDetail
          variant="detail-rail"
          master={
            <ContentSection
              title="Review Queue"
              description="Active work requiring client or editor attention."
              bodyMode="flush"
              actions={
                <Tabs
                  value={filter}
                  onValueChange={(value) =>
                    setFilter(
                      value === "Review" || value === "Revision" ? value : "All"
                    )
                  }
                  className="block"
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
                          {option}{" "}
                          <span className="tabular-nums opacity-70">
                            {count}
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              }
            >
              <span className="sr-only" aria-live="polite">
                {visibleQueue.length} {filter.toLowerCase()} queue items shown
              </span>
              <div
                id="review-queue-panel"
                role="tabpanel"
                aria-labelledby={`review-${filter.toLowerCase()}-tab`}
                className=""
              >
                {visibleQueue.length ? (
                  <div key={filter} className="">
                    {visibleQueue.map((project, index) => (
                      <button
                        key={project.id}
                        type="button"
                        aria-pressed={selected?.id === project.id}
                        className={cn(
                          "h-auto w-full grid justify-start gap-3 px-4 py-4 text-left font-normal whitespace-normal hover:bg-[var(--surface-fill)] dark:hover:bg-[var(--surface-fill)] focus-visible:z-10 sm:grid-cols-[minmax(0,1fr)_150px_120px_auto] sm:items-center text-[var(--text-primary)] min-h-10",
                          selected?.id === project.id &&
                            "bg-[var(--surface-active)] text-[var(--text-primary)] min-h-10"
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
                          <span className="block truncate text-section">
                            {project.title}
                          </span>
                          <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                            {project.client || project.workType} ·{" "}
                            {project.notes || "No review note"}
                          </span>
                        </span>
                        <span className="text-meta text-[var(--text-meta)]">
                          Due {formatDate(project.dueDate)}
                        </span>
                        <Badge
                          variant="secondary"
                          status={projectStatusTone(project.status)}
                        >
                          {project.status}
                        </Badge>
                        <span className="inline-flex h-7 items-center gap-1 justify-self-start rounded-md px-2 text-meta font-medium text-[var(--text-primary)] sm:justify-self-end">
                          Open <ArrowRight className="size-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <PageEmptyState
                    icon={<CheckCircle2 />}
                    title={
                      filter === "All"
                        ? "Review queue is clear"
                        : `No ${filter.toLowerCase()} items`
                    }
                    description={
                      filter === "All"
                        ? "Request review on a project to start a thread."
                        : filter === "Revision"
                          ? "Mark a project for revision to see it here."
                          : "Request client review on a project to fill this queue."
                    }
                  />
                )}
              </div>
            </ContentSection>
          }
          detail={
            <ContentSection
              data-slot="review-detail"
              title={selected?.title ?? "Review context"}
              description={
                selected
                  ? `${selected.client || selected.workType} · due ${formatDate(selected.dueDate)}`
                  : "Select a queue item to inspect its review context."
              }
            >
              {selected ? (
                <div key={selected.id} className="space-y-4">
                  <Badge
                    variant="secondary"
                    status={projectStatusTone(selected.status)}
                  >
                    {selected.status}
                  </Badge>
                  <dl className="grid grid-cols-2 gap-4">
                    <ClientMetric
                      label="Client"
                      value={selected.client || "No client"}
                    />
                    <ClientMetric label="Work type" value={selected.workType} />
                  </dl>
                  <div className="pt-4">
                    <p className="text-meta font-medium text-[var(--text-meta)]">
                      Latest review note
                    </p>
                    <p className="mt-2 text-meta text-[var(--text-primary)]">
                      {selected.notes ||
                        "No review note has been recorded yet."}
                    </p>
                  </div>
                  <div className="pt-4">
                    <p className="text-meta font-medium text-[var(--text-meta)]">
                      Review history
                    </p>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-3 text-meta">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--surface-active)]" />
                        <div>
                          <p className="font-medium">
                            {selected.status === "Revision"
                              ? "Revision requested"
                              : "Review requested"}
                          </p>
                          <p className="mt-1 text-meta text-[var(--text-meta)]">
                            Current production stage
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 text-meta">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full" />
                        <div>
                          <p className="font-medium">
                            Project prepared for feedback
                          </p>
                          <p className="mt-1 text-meta text-[var(--text-meta)]">
                            Open the project for files and comments
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link
                      {...projectLink({
                        projectId: selected.id,
                        view: "review",
                      })}
                    >
                      Open review workspace <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center text-center">
                  <div>
                    <MessageSquareText className="mx-auto size-8 text-[var(--text-meta)]" />
                    <p className="mt-2 text-section">Select a review item</p>
                    <p className="mt-1 text-meta text-[var(--text-meta)]">
                      Open a queue item to read its notes and jump into the
                      project.
                    </p>
                  </div>
                </div>
              )}
            </ContentSection>
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
}) {
  const [trendRange, setTrendRange] = useState<3 | 6 | "all">(6);
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
  const colors = [
    "accent",
    "neutral",
    "muted",
    "neutral",
    "muted",
  ] satisfies DitherColor[];
  /** Top six clients by delivered value, for the stacked paid/unpaid bars. */
  const clientChartData = useMemo(
    () =>
      [...report.clients]
        .sort(
          (a, b) => b.collected + b.outstanding - (a.collected + a.outstanding)
        )
        .slice(0, 6)
        .map((client) => ({
          name: client.name,
          paid: client.collected,
          unpaid: client.outstanding,
        })),
    [report.clients]
  );
  const mixConfig = Object.fromEntries(
    mixData.map((item, index) => [
      item.name,
      { label: item.name, color: colors[index % colors.length] },
    ])
  );
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

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="Reports"
        description="Earnings, deliveries, work mix, and payment batch payments."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={period}
              onValueChange={(value) => {
                const nextPeriod = payoutPeriods.find(
                  (candidate) => candidate === value
                );
                if (nextPeriod) setPeriod(nextPeriod);
              }}
            >
              <SelectTrigger className="w-[138px]" aria-label="Payout period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="custom">Custom dates</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            {advancedReports ? (
              <PageActions
                primary={
                  <Button
                    variant="secondary"
                    size="sm"
                    className=""
                    onClick={exportReport}
                    disabled={!canManageFinance}
                  >
                    <Download /> Export CSV
                  </Button>
                }
              />
            ) : null}
          </div>
        }
      />
      <PageContent>
        {period === "custom" ? (
          <div className="flex flex-wrap" aria-label="Custom report dates">
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
        <MetricStrip columns={4}>
          <MetricItem
            label="Earned"
            value={
              canManageFinance
                ? money(report.earned, settings.currencyCode)
                : "Restricted"
            }
            supporting={
              priorReport && canManageFinance
                ? `${money(report.earned - priorReport.earned, settings.currencyCode)} vs prior period`
                : "Delivered project and batch value"
            }
            icon={<CircleDollarSign className="size-4" />}
          />
          <MetricItem
            label="Paid"
            value={
              canManageFinance
                ? money(report.collected, settings.currencyCode)
                : "Restricted"
            }
            supporting="Delivered and paid"
            icon={<CircleDollarSign className="size-4" />}
          />
          <MetricItem
            label="Unpaid"
            value={
              canManageFinance
                ? money(report.outstanding, settings.currencyCode)
                : "Restricted"
            }
            supporting="Delivered, not paid yet"
            icon={<Clock3 className="size-4" />}
          />
          <MetricItem
            label="Delivered edits"
            value={String(report.deliveredProjects.length)}
            supporting={`${salaryEdits} salary edits`}
            icon={<CheckCircle2 className="size-4" />}
          />
        </MetricStrip>
        {earningsQa}

        <SplitPane
          primary={
            <section className="flex h-full min-w-0 flex-col">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-section">Delivery and earnings trend</h2>
                  <p className="mt-1 text-meta text-[var(--text-meta)]">
                    Delivered value and payment batches grouped by month.
                  </p>
                </div>
                <Tabs
                  value={String(trendRange)}
                  onValueChange={(value) =>
                    setTrendRange(
                      value === "3" ? 3 : value === "all" ? "all" : 6
                    )
                  }
                  className="block"
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
              </div>
              <div
                id="earnings-trend-panel"
                role="tabpanel"
                aria-labelledby={`earnings-${trendRange}-tab`}
              >
                <div
                  key={trendRange}
                  role="img"
                  aria-label={`Earnings trend for ${trendData.length} months. ${trendData.map((item) => `${item.label}: ${money(item.earned, settings.currencyCode)}`).join(", ")}`}
                  className="mt-3 h-[170px] shrink-0 sm:h-[190px]"
                >
                  {trendData.length ? (
                    <AreaChart
                      data={trendData}
                      config={{ earned: { label: "Earned", color: "accent" } }}
                    >
                      <Grid />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <ChartTooltip
                        labelKey="label"
                        valueFormatter={(value) =>
                          money(value, settings.currencyCode)
                        }
                      />
                      <Area dataKey="earned" variant="gradient" />
                    </AreaChart>
                  ) : (
                    <div className="grid h-full place-items-center text-meta text-[var(--text-meta)]">
                      Mark a project as delivered to start the earnings trend.
                    </div>
                  )}
                </div>
              </div>
              <p
                className="mt-auto min-h-9 pt-3 text-meta text-[var(--text-meta)]"
                aria-label="Earnings trend summary"
              >
                {trendData.length
                  ? `${trendData.reduce((sum, item) => sum + item.delivered, 0)} delivered edits generated ${money(
                      trendData.reduce((sum, item) => sum + item.earned, 0),
                      settings.currencyCode
                    )} across ${trendData.length} month${trendData.length === 1 ? "" : "s"}.`
                  : "No deliveries in this period yet."}
              </p>
            </section>
          }
          secondary={
            <section className="flex h-full min-w-0 flex-col">
              <div>
                <h2 className="text-section">Work mix</h2>
                <p className="mt-1 text-meta text-[var(--text-meta)]">
                  Distribution across project types.
                </p>
              </div>
              <div
                className="mt-3 h-[170px] shrink-0 sm:h-[190px]"
                role="img"
                aria-label={
                  mixData.length
                    ? `Work mix: ${mixData.map((item) => `${item.name}, ${item.value} projects`).join("; ")}`
                    : "No work mix data available"
                }
              >
                {mixData.length ? (
                  <PieChart
                    className="mx-auto max-w-[280px]"
                    data={mixData}
                    config={mixConfig}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={0.65}
                  >
                    <Pie variant="gradient" />
                    <ChartTooltip labelKey="name" />
                  </PieChart>
                ) : (
                  <div className="grid h-full place-items-center rounded-md px-4 text-center text-meta text-[var(--text-meta)]">
                    Deliver projects to see how your work splits across types.
                  </div>
                )}
              </div>
              <div className="mt-auto min-h-9 space-y-2 pt-3">
                {mixData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 text-meta"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          index === 0
                            ? "var(--accent-mark)"
                            : index % 2
                              ? "var(--text-meta)"
                              : "var(--surface-active)",
                      }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          }
        />

        <ContentSection
          title="This period"
          description="Delivered work, finished outputs, delivery time, and overdue projects."
        >
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
              label="Avg. days to deliver"
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
              className="mt-4 h-[160px]"
            >
              <BarChart
                data={trendSeries.slice(-6)}
                config={{ delivered: { label: "Delivered", color: "accent" } }}
              >
                <XAxis dataKey="label" />
                <ChartTooltip labelKey="label" />
                <Bar dataKey="delivered" variant="gradient" />
              </BarChart>
            </div>
          ) : null}
        </ContentSection>

        {advancedReports ? (
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
                      `${client.name} ${money(client.paid, settings.currencyCode)} paid, ${money(client.unpaid, settings.currencyCode)} unpaid`
                  )
                  .join("; ")}`}
                className="mx-4 mb-4 h-[180px]"
              >
                <BarChart
                  data={clientChartData}
                  config={{
                    paid: { label: "Paid", color: "accent" },
                    unpaid: { label: "Unpaid", color: "neutral" },
                  }}
                  stackType="stacked"
                >
                  <XAxis dataKey="name" />
                  <ChartTooltip
                    labelKey="name"
                    valueFormatter={(value) =>
                      money(value, settings.currencyCode)
                    }
                  />
                  <Bar dataKey="paid" variant="gradient" />
                  <Bar dataKey="unpaid" variant="gradient" />
                </BarChart>
              </div>
            ) : null}
            <div className="">
              {report.clients.length ? (
                <div
                  className={cn(
                    clientTotalsGrid,
                    "h-10 items-center border-b border-[var(--border-table)] text-meta font-medium text-[var(--text-meta)]"
                  )}
                >
                  <span>Client</span>
                  <span className="text-right">Projects</span>
                  <span className="text-right">Paid</span>
                  <span className="text-right">Unpaid</span>
                </div>
              ) : null}
              {report.clients.map((client) => (
                <div
                  key={client.id}
                  className={cn(
                    clientTotalsGrid,
                    "min-h-10 items-center border-b border-[var(--border-table)] last:border-0 py-2 text-body hover:bg-[var(--surface-fill)]"
                  )}
                >
                  <span className="truncate font-semibold">{client.name}</span>
                  <span className="text-right tabular-nums">
                    {client.deliveredProjects}
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {canManageFinance
                      ? money(client.collected, settings.currencyCode)
                      : "Restricted"}
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {canManageFinance
                      ? money(client.outstanding, settings.currencyCode)
                      : "Restricted"}
                  </span>
                </div>
              ))}
              {!report.clients.length ? (
                <div className="grid min-h-24 place-items-center text-meta text-[var(--text-meta)]">
                  Deliver a client project in this period to see its totals.
                </div>
              ) : null}
            </div>
          </ContentSection>
        ) : null}

        {salaryPlans}
        <ContentSection
          title="Payment batches"
          description="Completed batches and whether they are paid."
          metadata={
            <span className="text-meta text-[var(--text-meta)]">
              {report.batches.length} batches
            </span>
          }
          bodyMode="flush"
          footer={
            batchesLocked ? (
              <CapabilityUpgradePrompt capability="salaryPlans" inline />
            ) : undefined
          }
        >
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[720px] border-collapse">
              <TableHeader>
                <TableRow className="text-left text-meta font-medium text-[var(--text-meta)]">
                  <TableHead className="h-8 px-4">Batch</TableHead>
                  <TableHead className="px-4">Completed</TableHead>
                  <TableHead className="px-4">Edits</TableHead>
                  <TableHead className="px-4">Amount</TableHead>
                  <TableHead className="px-4">Payment</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {report.batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="h-10 text-body transition-colors hover:bg-[var(--surface-fill)]"
                  >
                    <TableCell className="px-4 font-semibold">
                      Batch #{batch.number}
                    </TableCell>
                    <TableCell className="px-4 text-[var(--text-primary)]">
                      {batch.date ? formatDate(batch.date) : "Pending"}
                    </TableCell>
                    <TableCell className="px-4">
                      {settings.salaryBatchSize}
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {money(batch.amount, settings.currencyCode)}
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge
                        variant="secondary"
                        status={paymentStatusTone(batch.paid)}
                      >
                        {batch.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className=""
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
                {!report.batches.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-meta text-[var(--text-meta)]"
                    >
                      Finish the next salary batch to record its payment here.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </ContentSection>

        {advancedReports ? (
          <ContentSection
            title="Invoice drafts"
            description="CSV invoice drafts for delivered client projects. Relay doesn't collect payments."
            bodyMode="flush"
            actions={
              <Button
                variant="secondary"
                size="sm"
                className=""
                onClick={exportInvoiceDrafts}
                disabled={!invoiceDrafts.length}
              >
                <Download /> Export invoices
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[760px] border-collapse">
                <TableHeader>
                  <TableRow className="text-left text-meta font-medium text-[var(--text-meta)]">
                    <TableHead className="h-8 px-4">Draft</TableHead>
                    <TableHead className="px-4">Client</TableHead>
                    <TableHead className="px-4">Projects</TableHead>
                    <TableHead className="px-4">Due</TableHead>
                    <TableHead className="px-4 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="">
                  {invoiceDrafts.map((draft) => (
                    <TableRow
                      key={draft.id}
                      className="h-10 text-body transition-colors hover:bg-[var(--surface-fill)]"
                    >
                      <TableCell className="px-4 font-semibold">
                        {draft.invoiceNumber}
                      </TableCell>
                      <TableCell className="px-4 text-[var(--text-primary)]">
                        {draft.client}
                      </TableCell>
                      <TableCell className="px-4">
                        {draft.lineItems.length}
                      </TableCell>
                      <TableCell className="px-4 text-[var(--text-primary)]">
                        {formatDate(draft.dueDate)}
                      </TableCell>
                      <TableCell className="px-4 text-right font-semibold">
                        {money(draft.total, settings.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!invoiceDrafts.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-meta text-[var(--text-meta)]"
                      >
                        Deliver a freelance project for a named client to draft
                        its invoice.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </ContentSection>
        ) : null}
        {advancedReports ? (
          <SplitPane
            ratio="balanced"
            primary={
              <ContentSection
                title="Editor Summary"
                description="Delivered work attributed to workspace editors."
                metadata={
                  <span className="text-meta text-[var(--text-meta)]">
                    {editorSummary.length} editors
                  </span>
                }
                bodyMode="flush"
              >
                <div className="">
                  {editorSummary.map((editor) => (
                    <div
                      key={editor.userId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="grid size-8 place-items-center rounded-md bg-[var(--surface-active)] text-meta font-medium text-[var(--text-primary)]">
                        {editor.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-meta font-medium">
                          {editor.name}
                        </span>
                        <span className="mt-1 block text-meta text-[var(--text-meta)]">
                          {editor.delivered} delivered edits
                        </span>
                      </span>
                      <span className="text-meta font-medium">
                        {money(editor.value, settings.currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              </ContentSection>
            }
            secondary={
              <ContentSection
                title="Delivered Projects"
                description="Most recently completed editing work."
                metadata={
                  <span className="text-meta text-[var(--text-meta)]">
                    {report.deliveredProjects.length} projects
                  </span>
                }
                bodyMode="flush"
              >
                <div className="">
                  {report.deliveredProjects.slice(0, 6).map((project) => (
                    <div
                      key={project.id}
                      className="grid grid-cols-[minmax(0,1fr)_100px_auto] items-center gap-3 px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-meta font-medium">
                          {project.title}
                        </span>
                        <span className="mt-1 block truncate text-meta text-[var(--text-meta)]">
                          {project.editorName} · {project.workType}
                        </span>
                      </span>
                      <span className="text-meta text-[var(--text-meta)]">
                        {formatDate(project.date)}
                      </span>
                      <span className="text-meta font-medium">
                        {project.isSalaryEdit
                          ? "Batch"
                          : money(project.amount, settings.currencyCode)}
                      </span>
                    </div>
                  ))}
                  {!report.deliveredProjects.length ? (
                    <div className="grid min-h-28 place-items-center text-meta text-[var(--text-meta)]">
                      Deliver a project to list it here.
                    </div>
                  ) : null}
                </div>
              </ContentSection>
            }
          />
        ) : null}
      </PageContent>
    </WorkspacePage>
  );
}

/** Columns shared by the Client totals header and rows. */
const clientTotalsGrid =
  "grid grid-cols-[minmax(0,1fr)_5rem_8rem_8rem] gap-4 px-4";

function ClientMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-fill)] p-4">
      <p className="text-meta font-medium text-[var(--text-meta)]">{label}</p>
      <p className="mt-1 text-section">{value}</p>
    </div>
  );
}

/** Unframed label/value pair for the Reports period summary `<dl>`. */
function PeriodMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-[var(--text-meta)]">{label}</dt>
      <dd className="mt-1 text-metric">{value}</dd>
    </div>
  );
}

"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Clock3,
  Download,
  FolderKanban,
  MessageSquareText,
  Plus,
  Search,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import {
  buildPayoutReport,
  payoutReportToCsv,
  type PayoutPeriod,
} from "@/lib/payout-reporting";
import {
  buildInvoiceDrafts,
  invoiceDraftsToCsv,
} from "@/lib/invoice-reporting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function active(project: WorkItem) {
  return !delivered(project) && project.status !== "Cancelled";
}

function review(project: WorkItem) {
  return ["Review", "Revision", "Client Review"].includes(project.status)
    || /review|feedback|approval|revision/i.test(project.notes);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function clientInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function statusTone(status: WorkItem["status"]) {
  if (status === "Delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (["Review", "Revision", "Client Review"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
  if (status === "In Progress") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
  return "border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
}

type ClientRecord = {
  name: string;
  projects: WorkItem[];
  active: number;
  delivered: number;
  value: number;
};

const revealTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export function PrecisionClients({
  projects,
  settings,
  onAddClient,
  onViewProject,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  onAddClient: (name: string) => void;
  onViewProject: (project: WorkItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [copiedName, setCopiedName] = useState("");
  const reduceMotion = useHydratedReducedMotion();

  const clients = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const name of settings.customClients) {
      if (name.trim()) map.set(name.trim(), []);
    }
    for (const project of projects) {
      const name = project.client?.trim();
      if (!name) continue;
      map.set(name, [...(map.get(name) ?? []), project]);
    }
    return Array.from(map.entries())
      .map(([name, clientProjects]): ClientRecord => ({
        name,
        projects: clientProjects,
        active: clientProjects.filter(active).length,
        delivered: clientProjects.filter(delivered).length,
        value: clientProjects.filter(delivered).reduce((sum, project) => sum + (Number(project.earnings) || 0), 0),
      }))
      .filter((client) => !query.trim() || client.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  }, [projects, query, settings.customClients]);

  useEffect(() => {
    if (!clients.some((client) => client.name === selectedName)) setSelectedName(clients[0]?.name ?? "");
  }, [clients, selectedName]);

  useEffect(() => {
    if (!copiedName) return;
    const timeout = window.setTimeout(() => setCopiedName(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedName]);

  const selected = clients.find((client) => client.name === selectedName) ?? clients[0] ?? null;

  function addClient() {
    const name = newClient.trim();
    if (!name) return;
    onAddClient(name);
    setSelectedName(name);
    setNewClient("");
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

  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-highlight)]">Relationships</p>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.015em]">Clients</h1>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Projects, delivery history, and account context in one focused directory.</p>
        </div>
        <Button className="h-9 self-start sm:self-auto" onClick={() => setAddOpen(true)}><Plus /> New Client</Button>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--app-border)] overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
        <Summary label="Clients" value={clients.length} icon={UsersRound} />
        <Summary label="Active projects" value={projects.filter(active).length} icon={FolderKanban} />
        <Summary label="Delivered" value={projects.filter(delivered).length} icon={CheckCircle2} />
      </div>

      <div className="mt-4 grid overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] lg:max-h-[calc(100dvh-300px)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[var(--app-border)] bg-[var(--app-soft-panel)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--app-border)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." aria-label="Search clients" className="h-9 bg-[var(--app-panel)] pl-8 pr-8 text-xs" />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear client search"
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]"
                  onClick={() => setQuery("")}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-[var(--app-border)] overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Scrollable client directory">
            {clients.map((client, index) => (
              <motion.button
                key={client.name}
                type="button"
                aria-pressed={selected?.name === client.name}
                initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.025, 0.18) }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className={cn(
                  "relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)]",
                  selected?.name === client.name && "bg-[var(--app-active)]",
                )}
                onClick={() => setSelectedName(client.name)}
              >
                {selected?.name === client.name ? (
                  <motion.span
                    layoutId="client-directory-selection"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--app-highlight)]"
                    transition={reduceMotion ? { duration: 0 } : revealTransition}
                  />
                ) : null}
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--app-panel)] text-xs font-semibold text-[var(--app-highlight)] ring-1 ring-[var(--app-border)]">{clientInitials(client.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{client.name}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--app-muted)]">{client.projects.length} projects · {client.active} active</span>
                </span>
                <ArrowRight className="size-3.5 text-[var(--app-muted)]" />
              </motion.button>
            ))}
            {!clients.length ? <div className="p-6 text-center text-xs text-[var(--app-muted)]">No clients match this view.</div> : null}
          </div>
        </aside>

        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.main
              key={selected.name}
              initial={reduceMotion ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -6 }}
              transition={reduceMotion ? { duration: 0 } : revealTransition}
              className="flex min-h-0 min-w-0 flex-col"
            >
            <div className="flex flex-col gap-4 border-b border-[var(--app-border)] p-5 sm:flex-row sm:items-start">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[var(--app-active)] text-sm font-semibold text-[var(--app-highlight)]">{clientInitials(selected.name)}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{selected.active} active projects · {selected.delivered} delivered</p>
              </div>
              <Button
                variant="outline"
                className="h-8 self-start border-[var(--app-border)] bg-[var(--app-panel)] text-xs"
                onClick={() => void copyClientName(selected.name)}
                aria-label={copiedName === selected.name ? `${selected.name} copied` : `Copy ${selected.name} to clipboard`}
              >
                {copiedName === selected.name ? <CheckCircle2 /> : <Copy />}
                {copiedName === selected.name ? "Copied" : "Copy name"}
              </Button>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--app-border)] border-b border-[var(--app-border)]">
              <ClientMetric label="Projects" value={String(selected.projects.length)} />
              <ClientMetric label="Delivered" value={String(selected.delivered)} />
              <ClientMetric label="Collected" value={money(selected.value, settings.currencyCode)} />
            </div>
            <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5" tabIndex={0} aria-label="Scrollable client project history">
              <div className="mb-3 flex items-center justify-between">
                <div><h3 className="text-sm font-semibold">Project history</h3><p className="mt-0.5 text-[11px] text-[var(--app-muted)]">Current and completed work for this client.</p></div>
              </div>
              {selected.projects.length ? (
                <div className="divide-y divide-[var(--app-border)] overflow-hidden rounded-lg border border-[var(--app-border)]">
                  {selected.projects.slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((project, index) => (
                    <motion.button
                      key={project.id}
                      type="button"
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.025, 0.15) }}
                      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                      className="grid w-full gap-2 px-3 py-3 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[minmax(0,1fr)_120px_100px_auto] sm:items-center"
                      onClick={() => onViewProject(project)}
                    >
                      <span className="min-w-0"><span className="block truncate text-xs font-semibold">{project.title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.notes || project.workType}</span></span>
                      <span className="text-[11px] text-[var(--app-muted)]">{formatDate(project.dueDate)}</span>
                      <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", statusTone(project.status))}>{project.status}</Badge>
                      <ArrowRight className="size-3.5 text-[var(--app-muted)]" />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-[var(--app-border)] text-center"><div><BriefcaseBusiness className="mx-auto size-6 text-[var(--app-muted)]" /><p className="mt-2 text-sm font-semibold">No projects yet</p><p className="mt-1 text-xs text-[var(--app-muted)]">Assign this client when creating a project.</p></div></div>
              )}
            </section>
            </motion.main>
          ) : (
            <motion.main
              key="empty-clients"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              className="grid min-h-[420px] place-items-center p-6 text-center"
            >
              <div><UsersRound className="mx-auto size-7 text-[var(--app-muted)]" /><p className="mt-2 text-sm font-semibold">Add your first client</p><p className="mt-1 text-xs text-[var(--app-muted)]">Client records organize project history and delivery context.</p><Button className="mt-3 h-8" size="sm" onClick={() => setAddOpen(true)}><Plus /> New Client</Button></div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
            <DialogDescription>Create a client record now and assign it to projects later.</DialogDescription>
          </DialogHeader>
          <Input value={newClient} onChange={(event) => setNewClient(event.target.value)} placeholder="Client or company name" autoFocus onKeyDown={(event) => { if (event.key === "Enter") addClient(); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addClient} disabled={!newClient.trim()}>New Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  const reduceMotion = useHydratedReducedMotion();
  const queue = useMemo(() => projects
    .filter((project) => review(project) || (active(project) && /client|approval/i.test(project.notes)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [projects]);
  const visibleQueue = useMemo(() => queue.filter((project) => {
    if (filter === "Revision") return project.status === "Revision";
    if (filter === "Review") return project.status !== "Revision";
    return true;
  }), [filter, queue]);
  const deliveredCount = projects.filter(delivered).length;
  const revisionCount = projects.filter((project) => project.status === "Revision").length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="border-b border-[var(--app-border)] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-highlight)]">Client review</p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.015em]">Feedback</h1>
        <p className="mt-1 text-xs text-[var(--app-muted)]">Track review notes, revisions, and approval state without losing production context.</p>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--app-border)] overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
        <Summary label="Awaiting review" value={queue.length} icon={MessageSquareText} />
        <Summary label="Revisions" value={revisionCount} icon={Clock3} />
        <Summary label="Delivered" value={deliveredCount} icon={CheckCircle2} />
      </div>
      <section className="mt-4 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
        <header className="flex min-h-12 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold">Review Queue</h2><p className="text-[10px] text-[var(--app-muted)]">Active work requiring client or editor attention.</p></div>
          <div className="flex items-center gap-1" role="group" aria-label="Filter review queue">
            {(["All", "Review", "Revision"] as const).map((option) => {
              const count = option === "All"
                ? queue.length
                : queue.filter((project) => option === "Revision" ? project.status === "Revision" : project.status !== "Revision").length;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[10px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]",
                    filter === option && "bg-[var(--app-active)] text-[var(--app-highlight)]",
                  )}
                >
                  {option} <span className="ml-1 tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </header>
        <span className="sr-only" aria-live="polite">{visibleQueue.length} {filter.toLowerCase()} queue items shown</span>
        <div className="border-t border-[var(--app-border)]">
          <AnimatePresence mode="wait" initial={false}>
            {visibleQueue.length ? (
              <motion.div
                key={filter}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                className="divide-y divide-[var(--app-border)]"
              >
                {visibleQueue.map((project, index) => (
                  <motion.button
                    key={project.id}
                    type="button"
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.03, 0.18) }}
                    whileTap={reduceMotion ? undefined : { scale: 0.996 }}
                    className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[minmax(0,1fr)_150px_120px_auto] sm:items-center"
                    onClick={() => onViewProject(project)}
                  >
                <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{project.title}</span><span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">{project.client || project.workType} · {project.notes || "No review note"}</span></span>
                <span className="text-[11px] text-[var(--app-muted)]">Due {formatDate(project.dueDate)}</span>
                <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", statusTone(project.status))}>{project.status}</Badge>
                <span className="inline-flex h-7 items-center gap-1 justify-self-start rounded-md px-2 text-xs font-medium text-[var(--app-highlight)] sm:justify-self-end">Open <ArrowRight className="size-3.5" /></span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${filter}`}
                initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : revealTransition}
                className="grid min-h-72 place-items-center px-5 text-center"
              >
                <div><CheckCircle2 className="mx-auto size-7 text-[var(--app-success)]" /><p className="mt-2 text-sm font-semibold">{filter === "All" ? "Review queue is clear" : `No ${filter.toLowerCase()} items`}</p><p className="mt-1 text-xs text-[var(--app-muted)]">Projects waiting for feedback or revision will appear here.</p></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

export function PrecisionReports({
  projects,
  salaryBatches,
  settings,
  editors,
  onUpdateBatchPayment,
}: {
  projects: WorkItem[];
  salaryBatches: SalaryBatch[];
  settings: SettingsState;
  editors: Array<{ userId: string; name: string }>;
  onUpdateBatchPayment: (batchId: string, paid: boolean) => void;
}) {
  const [trendRange, setTrendRange] = useState<3 | 6 | "all">(6);
  const [period, setPeriod] = useState<PayoutPeriod>("all");
  const reduceMotion = useHydratedReducedMotion();
  const report = useMemo(() => buildPayoutReport({
    projects,
    salaryBatches,
    salaryWorkType: settings.salaryWorkType,
    salaryBatchAmount: Number(settings.salaryBatchAmount) || 0,
    profileName: settings.profileName,
    editors,
    period,
  }), [editors, period, projects, salaryBatches, settings.profileName, settings.salaryBatchAmount, settings.salaryWorkType]);
  const collected = report.manualEarnings + report.paidBatchEarnings;
  const salaryEdits = report.deliveredProjects.filter((project) => project.isSalaryEdit).length;
  const invoiceDrafts = useMemo(() => buildInvoiceDrafts({
    projects,
    salaryWorkType: settings.salaryWorkType,
    currencyCode: settings.currencyCode,
    period,
  }), [period, projects, settings.currencyCode, settings.salaryWorkType]);
  const invoiceTotal = invoiceDrafts.reduce((total, draft) => total + draft.total, 0);

  const trendSeries = useMemo(() => {
    const map = new Map<string, { label: string; earned: number; delivered: number }>();
    const addPoint = (dateValue: string, earned: number, deliveredCount: number) => {
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
    for (const project of report.deliveredProjects) addPoint(project.date, project.amount, 1);
    for (const batch of report.batches) addPoint(batch.date, batch.amount, 0);
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [report.batches, report.deliveredProjects]);
  const trendData = trendRange === "all" ? trendSeries : trendSeries.slice(-trendRange);

  const mixData = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of report.deliveredProjects) map.set(project.workType, (map.get(project.workType) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [report.deliveredProjects]);
  const colors = ["#3478f6", "#2d9b63", "#cc7a16", "#8a67d5", "#7f8898"];
  const editorSummary = report.editors.length
    ? report.editors.map((editor) => ({
      userId: editor.id,
      name: editor.name,
      delivered: editor.deliveredProjects,
      value: editor.totalEarnings,
    }))
    : [{ userId: "workspace", name: settings.profileName || "Workspace owner", delivered: 0, value: 0 }];

  function downloadCsv(csv: string, fileName: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportReport() {
    downloadCsv(payoutReportToCsv(report, settings.currencyCode), `cutlab-payout-report-${period}.csv`);
  }

  function exportInvoiceDrafts() {
    downloadCsv(invoiceDraftsToCsv(invoiceDrafts), `cutlab-invoice-drafts-${period}.csv`);
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1580px] px-3 py-4 sm:px-5 lg:min-h-[calc(100dvh-56px)] lg:px-6 lg:py-5">
      <div className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-highlight)]">Performance</p>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.015em]">Reports</h1>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Earnings, delivery throughput, work mix, and salary batch payout state.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as PayoutPeriod)}>
            <SelectTrigger className="h-8 w-[138px] text-xs" aria-label="Payout period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8" onClick={exportReport}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-[var(--app-border)] overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] lg:grid-cols-4 lg:divide-y-0">
        <ReportMetric label="Collected" value={money(collected, settings.currencyCode)} helper="Freelance plus paid batches" icon={CircleDollarSign} index={0} reduceMotion={Boolean(reduceMotion)} />
        <ReportMetric label="Outstanding" value={money(report.unpaidBatchEarnings, settings.currencyCode)} helper={`${report.unpaidBatchCount} unpaid batches`} icon={Clock3} index={1} reduceMotion={Boolean(reduceMotion)} />
        <ReportMetric label="Delivered edits" value={String(report.deliveredProjects.length)} helper={`${salaryEdits} salary edits`} icon={CheckCircle2} index={2} reduceMotion={Boolean(reduceMotion)} />
        <ReportMetric label="Invoice drafts" value={String(invoiceDrafts.length)} helper={money(invoiceTotal, settings.currencyCode)} icon={BriefcaseBusiness} index={3} reduceMotion={Boolean(reduceMotion)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: 0.08 }}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-sm font-semibold">Delivery and earnings trend</h2><p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Delivered value and salary batches grouped by month.</p></div>
            <div className="flex items-center gap-1" role="group" aria-label="Earnings trend range">
              {([
                { value: 3 as const, label: "3M" },
                { value: 6 as const, label: "6M" },
                { value: "all" as const, label: "All" },
              ]).map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={trendRange === option.value}
                  onClick={() => setTrendRange(option.value)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[10px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:ring-[var(--app-highlight)]",
                    trendRange === option.value && "bg-[var(--app-active)] text-[var(--app-highlight)]",
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <motion.div
            key={trendRange}
            role="img"
            aria-label={`Earnings trend for ${trendData.length} months. ${trendData.map((item) => `${item.label}: ${money(item.earned, settings.currencyCode)}`).join(", ")}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="mt-4 h-[260px]"
          >
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="report-earned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3478f6" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#3478f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--app-chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ChartTooltip contentStyle={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="earned" stroke="#3478f6" strokeWidth={2} fill="url(#report-earned)" isAnimationActive={!reduceMotion} animationDuration={420} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-[var(--app-muted)]">Delivered projects will create the earnings trend.</div>
            )}
          </motion.div>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: 0.12 }}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
        >
          <div><h2 className="text-sm font-semibold">Work mix</h2><p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Distribution across project types.</p></div>
          <div className="mt-3 h-[190px]">
            {mixData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={2} isAnimationActive={!reduceMotion} animationDuration={420}>
                    {mixData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <ChartTooltip contentStyle={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <div className="space-y-2">
            {mixData.map((item, index) => (
              <div key={item.name} className="flex items-center text-[11px]"><span className="mr-2 size-2 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate">{item.name}</span><span className="ml-auto font-semibold">{item.value}</span></div>
            ))}
          </div>
        </motion.section>
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
        <header className="flex min-h-12 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold">Invoice drafts</h2><p className="text-[10px] text-[var(--app-muted)]">Local CSV drafts for delivered client projects. Payment collection still requires a trusted payment provider.</p></div>
          <Button variant="outline" size="sm" className="h-8" onClick={exportInvoiceDrafts} disabled={!invoiceDrafts.length}><Download /> Export invoices</Button>
        </header>
        <div className="overflow-x-auto border-t border-[var(--app-border)]">
          <Table className="min-w-[760px] border-collapse">
            <TableHeader><TableRow className="bg-[var(--app-soft-panel)] text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]"><TableHead className="h-8 p-0 px-4">Draft</TableHead><TableHead className="h-8 p-0 px-4">Client</TableHead><TableHead className="h-8 p-0 px-4">Projects</TableHead><TableHead className="h-8 p-0 px-4">Due</TableHead><TableHead className="h-8 p-0 px-4 text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-[var(--app-border)]">
              {invoiceDrafts.map((draft) => (
                <TableRow key={draft.id} className="h-12 text-xs transition-colors hover:bg-[var(--app-hover)]">
                  <TableCell className="p-0 px-4 font-semibold">{draft.invoiceNumber}</TableCell>
                  <TableCell className="p-0 px-4 text-[var(--app-muted)]">{draft.client}</TableCell>
                  <TableCell className="p-0 px-4">{draft.lineItems.length}</TableCell>
                  <TableCell className="p-0 px-4 text-[var(--app-muted)]">{formatDate(draft.dueDate)}</TableCell>
                  <TableCell className="p-0 px-4 text-right font-semibold">{money(draft.total, settings.currencyCode)}</TableCell>
                </TableRow>
              ))}
              {!invoiceDrafts.length ? <TableRow><TableCell colSpan={5} className="h-28 p-0 px-4 text-center text-xs text-[var(--app-muted)]">Delivered freelance projects with client names and positive earnings will appear here.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="mt-4 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
        <header className="flex h-12 items-center justify-between px-4"><div><h2 className="text-sm font-semibold">Salary Batch Ledger</h2><p className="text-[10px] text-[var(--app-muted)]">Completed edit batches and payout status.</p></div><span className="text-[11px] text-[var(--app-muted)]">{report.batches.length} batches</span></header>
        <div className="overflow-x-auto border-t border-[var(--app-border)]">
          <Table className="min-w-[720px] border-collapse">
            <TableHeader><TableRow className="bg-[var(--app-soft-panel)] text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]"><TableHead className="h-8 p-0 px-4">Batch</TableHead><TableHead className="h-8 p-0 px-4">Completed</TableHead><TableHead className="h-8 p-0 px-4">Edits</TableHead><TableHead className="h-8 p-0 px-4">Amount</TableHead><TableHead className="h-8 p-0 px-4">Payment</TableHead><TableHead className="h-8 p-0 px-4 text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-[var(--app-border)]">
              {report.batches.map((batch) => (
                <TableRow key={batch.id} className="h-12 text-xs transition-colors hover:bg-[var(--app-hover)]">
                  <TableCell className="p-0 px-4 font-semibold">Batch #{batch.number}</TableCell>
                  <TableCell className="p-0 px-4 text-[var(--app-muted)]">{batch.date ? formatDate(batch.date) : "Pending"}</TableCell>
                  <TableCell className="p-0 px-4">{settings.salaryBatchSize}</TableCell>
                  <TableCell className="p-0 px-4 font-medium">{money(batch.amount, settings.currencyCode)}</TableCell>
                  <TableCell className="p-0 px-4"><Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px]", batch.paid ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300")}>{batch.paid ? "Paid" : "Unpaid"}</Badge></TableCell>
                  <TableCell className="p-0 px-4 text-right"><Button variant="ghost" size="sm" className="h-7 text-xs" aria-label={`${batch.paid ? "Mark unpaid" : "Mark paid"} for batch ${batch.number}`} onClick={() => onUpdateBatchPayment(batch.id, !batch.paid)}>{batch.paid ? "Mark unpaid" : "Mark paid"}</Button></TableCell>
                </TableRow>
              ))}
              {!report.batches.length ? <TableRow><TableCell colSpan={6} className="h-32 p-0 px-4 text-center text-xs text-[var(--app-muted)]">Completed salary batches will appear here automatically.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
          <header className="flex h-12 items-center justify-between px-4">
            <div><h2 className="text-sm font-semibold">Editor Summary</h2><p className="text-[10px] text-[var(--app-muted)]">Delivered work attributed to workspace editors.</p></div>
            <span className="text-[11px] text-[var(--app-muted)]">{editorSummary.length} editors</span>
          </header>
          <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
            {editorSummary.map((editor) => (
              <div key={editor.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--app-active)] text-[10px] font-semibold text-[var(--app-highlight)]">
                  {editor.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{editor.name}</span><span className="mt-0.5 block text-[10px] text-[var(--app-muted)]">{editor.delivered} delivered edits</span></span>
                <span className="text-xs font-semibold">{money(editor.value, settings.currencyCode)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
          <header className="flex h-12 items-center justify-between px-4">
            <div><h2 className="text-sm font-semibold">Delivered Projects</h2><p className="text-[10px] text-[var(--app-muted)]">Most recently completed editing work.</p></div>
            <span className="text-[11px] text-[var(--app-muted)]">{report.deliveredProjects.length} projects</span>
          </header>
          <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
            {report.deliveredProjects.slice(0, 6).map((project) => (
              <div key={project.id} className="grid grid-cols-[minmax(0,1fr)_100px_auto] items-center gap-3 px-4 py-3">
                <span className="min-w-0"><span className="block truncate text-xs font-semibold">{project.title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.editorName} · {project.workType}</span></span>
                <span className="text-[10px] text-[var(--app-muted)]">{formatDate(project.date)}</span>
                <span className="text-xs font-semibold">{project.isSalaryEdit ? "Batch" : money(project.amount, settings.currencyCode)}</span>
              </div>
            ))}
            {!report.deliveredProjects.length ? <div className="grid min-h-28 place-items-center text-xs text-[var(--app-muted)]">Delivered projects will appear here.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof UsersRound }) {
  return <div className="flex min-h-[76px] items-center gap-2.5 px-3 py-3"><span className="grid size-8 place-items-center rounded-md bg-[var(--app-soft-panel)] text-[var(--app-muted)]"><Icon className="size-4" /></span><span><span className="block text-[10px] text-[var(--app-muted)]">{label}</span><span className="mt-0.5 block text-xl font-semibold tabular-nums">{value}</span></span></div>;
}

function ClientMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-4 py-3"><p className="text-[9px] font-semibold uppercase text-[var(--app-subtle)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function ReportMetric({
  label,
  value,
  helper,
  icon: Icon,
  index,
  reduceMotion,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof CircleDollarSign;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: index * 0.045 }}
      className="flex min-h-[92px] items-center gap-3 px-4 py-3"
    >
      <span className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]"><Icon className="size-[18px]" /></span>
      <span className="min-w-0">
        <span className="block text-[10px] text-[var(--app-muted)]">{label}</span>
        <span className="mt-0.5 block truncate text-xl font-semibold tabular-nums">{value}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[var(--app-subtle)]">{helper}</span>
      </span>
    </motion.div>
  );
}

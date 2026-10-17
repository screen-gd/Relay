"use client";

import { Plus } from "@/components/icons";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

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
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  DataTableFrame,
  PageEmptyState,
} from "@/components/workspace-page";
import { trackOptionalEvent } from "@/lib/telemetry";
import type { SettingsState, WorkItem } from "@/lib/types";

type SalaryPlan = Doc<"salaryPlans">;
type SalaryBatch = Doc<"projectSalaryBatches">;

type PlanDraft = {
  planId?: Id<"salaryPlans">;
  clientId: string;
  requiredProjectCount: string;
  amount: string;
  startDate: string;
  notes: string;
};

function emptyDraft(clientId = ""): PlanDraft {
  return {
    clientId,
    requiredProjectCount: "20",
    amount: "10000",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function draftFromPlan(plan: SalaryPlan): PlanDraft {
  return {
    planId: plan._id,
    clientId: plan.clientId,
    requiredProjectCount: String(plan.requiredProjectCount),
    amount: String(plan.amount),
    startDate: plan.startDate,
    notes: plan.notes,
  };
}

function formatDay(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  );
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

function isReceived(batch: SalaryBatch) {
  return batch.received ?? batch.paid;
}

type SalaryPlansPanelProps = {
  settings: SettingsState;
  projects: readonly WorkItem[];
  isOwner: boolean;
  canCreatePlans: boolean;
};

/**
 * Owner-only Payment plan management on the Reports page: create and edit plan
 * terms, track progress toward the next batch, and mark batches received.
 */
export function SalaryPlansPanel({
  settings,
  projects,
  isOwner,
  canCreatePlans,
}: SalaryPlansPanelProps) {
  const { isAuthenticated } = useConvexAuth();
  const enabled = isOwner && isAuthenticated;
  const plans = useQuery(
    api.salaryPlans.list,
    enabled ? { includeArchived: true } : "skip"
  );
  const batches = useQuery(api.salaryPlans.listBatches, enabled ? {} : "skip");
  const createPlan = useMutation(api.salaryPlans.create);
  const updatePlan = useMutation(api.salaryPlans.update);
  const setArchived = useMutation(api.salaryPlans.setArchived);
  const setReceived = useMutation(api.salaryPlans.setReceived);
  const setCorrectionNote = useMutation(api.salaryPlans.setCorrectionNote);
  const clients = useMemo(
    () => settings.clients.filter((client) => !client.archived),
    [settings.clients]
  );
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!batches) return;
    setCorrectionNotes((current) =>
      Object.fromEntries(
        batches.map((batch) => [
          batch._id,
          current[batch._id] ?? batch.correctionNote ?? "",
        ])
      )
    );
  }, [batches]);

  if (!isOwner) return null;

  if (!isAuthenticated) {
    return (
      <ContentSection
        title="Payments"
        description="Sign in to create payment plans. Local mode uses the payment batch settings."
        bodyMode="flush"
      />
    );
  }

  function openNewPlan() {
    setDraftError("");
    setDraft(emptyDraft(clients[0]?.id));
  }

  async function savePlan(current: PlanDraft) {
    const requiredProjectCount = Number(current.requiredProjectCount);
    const amount = Number(current.amount);
    if (
      !current.clientId ||
      !Number.isInteger(requiredProjectCount) ||
      requiredProjectCount < 1 ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !current.startDate
    ) {
      setDraftError("Choose a client and enter valid plan terms.");
      return;
    }
    setBusy("plan");
    setDraftError("");
    try {
      const changes = {
        clientId: current.clientId,
        requiredProjectCount,
        amount,
        startDate: current.startDate,
        notes: current.notes,
      };
      if (current.planId) await updatePlan({ planId: current.planId, changes });
      else await createPlan(changes);
      trackOptionalEvent("salary_plan_used", {
        action: current.planId ? "update" : "create",
      });
      setDraft(null);
    } catch (caught) {
      setDraftError(errorMessage(caught, "Could not save the payment plan."));
    } finally {
      setBusy("");
    }
  }

  async function toggleArchived(plan: SalaryPlan) {
    setBusy(plan._id);
    setError("");
    try {
      await setArchived({ planId: plan._id, archived: !plan.archived });
      trackOptionalEvent("salary_plan_used", {
        action: plan.archived ? "restore" : "archive",
      });
    } catch (caught) {
      setError(errorMessage(caught, "Could not update the payment plan."));
    } finally {
      setBusy("");
    }
  }

  async function toggleReceived(batch: SalaryBatch) {
    setBusy(batch._id);
    setError("");
    try {
      await setReceived({
        batchId: batch._id,
        received: !isReceived(batch),
        correctionNote:
          correctionNotes[batch._id] ?? batch.correctionNote ?? "",
      });
      trackOptionalEvent("salary_batch_used", {
        action: isReceived(batch) ? "unreceived" : "received",
      });
    } catch (caught) {
      setError(errorMessage(caught, "Could not update payment state."));
    } finally {
      setBusy("");
    }
  }

  /** Saves the note when the field loses focus, only if it changed. */
  async function saveCorrectionNote(batch: SalaryBatch) {
    const note = correctionNotes[batch._id] ?? "";
    if (note === (batch.correctionNote ?? "")) return;
    setBusy(`note-${batch._id}`);
    setError("");
    try {
      await setCorrectionNote({ batchId: batch._id, correctionNote: note });
      trackOptionalEvent("salary_batch_used", { action: "correction_note" });
    } catch (caught) {
      setError(errorMessage(caught, "Could not save the correction note."));
    } finally {
      setBusy("");
    }
  }

  const archivedCount = (plans ?? []).filter((plan) => plan.archived).length;
  const visiblePlans = (plans ?? [])
    .filter((plan) => showArchived || !plan.archived)
    .sort((a, b) => Number(a.archived) - Number(b.archived));
  const planIds = new Set((plans ?? []).map((plan) => plan._id));
  const hasLegacyBatches = (batches ?? []).some(
    (batch) => !batch.salaryPlanId || !planIds.has(batch.salaryPlanId)
  );
  const clientName = (clientId?: string) =>
    clients.find((client) => client.id === clientId)?.name ?? "Unknown client";
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: settings.currencyCode,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <>
      <ContentSection
        title="Payments"
        description="Batch terms per client. Completed batches keep the terms they closed with."
        bodyMode="flush"
        actions={
          <>
            {archivedCount ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={showArchived}
                onClick={() => setShowArchived((current) => !current)}
              >
                {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
              </Button>
            ) : null}
            {canCreatePlans ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!clients.length}
                onClick={openNewPlan}
              >
                <Plus /> New plan
              </Button>
            ) : null}
          </>
        }
      >
        {!canCreatePlans ? (
          <div className="mb-4">
            <CapabilityUpgradePrompt capability="salaryPlans" inline />
            <p className="mt-2 text-meta text-[var(--text-meta)]">
              Existing plans and batches stay visible. Creating plans,
              completing batches, and recording batch payments require Creator
              or Team.
            </p>
          </div>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-4 text-meta text-[var(--status-danger)]"
          >
            {error}
          </p>
        ) : null}
        {plans === undefined ? (
          <div
            role="status"
            aria-label="Loading payment plans"
            className="grid gap-3"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : visiblePlans.length ? (
          <div className="grid gap-10">
            {visiblePlans.map((plan) => (
              <SalaryPlanRow
                key={plan._id}
                plan={plan}
                clientName={clientName(plan.clientId)}
                batches={(batches ?? [])
                  .filter((batch) => batch.salaryPlanId === plan._id)
                  .sort((a, b) => b.number - a.number)}
                projects={projects}
                money={money}
                busy={busy}
                locked={!canCreatePlans}
                correctionNotes={correctionNotes}
                onEdit={() => {
                  setDraftError("");
                  setDraft(draftFromPlan(plan));
                }}
                onToggleArchived={() => void toggleArchived(plan)}
                onToggleReceived={(batch) => void toggleReceived(batch)}
                onNoteChange={(batchId, note) =>
                  setCorrectionNotes((current) => ({
                    ...current,
                    [batchId]: note,
                  }))
                }
                onNoteCommit={(batch) => void saveCorrectionNote(batch)}
              />
            ))}
          </div>
        ) : (
          <PageEmptyState
            compact
            icon={<Plus />}
            title="No payment plans yet"
            description={
              clients.length
                ? "Create a plan to track client payment batches."
                : "Add a client before creating a payment plan."
            }
            action={
              canCreatePlans && clients.length ? (
                <Button variant="secondary" onClick={openNewPlan}>
                  New plan
                </Button>
              ) : undefined
            }
          />
        )}
        {hasLegacyBatches ? (
          <p className="mt-3 text-meta text-[var(--text-meta)]">
            Older payment batches stay in the Payment batches list. New plans do
            not change them.
          </p>
        ) : null}
      </ContentSection>

      <PlanDialog
        draft={draft}
        clients={clients}
        settings={settings}
        saving={busy === "plan"}
        error={draftError}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSave={(current) => void savePlan(current)}
      />
    </>
  );
}

function SalaryPlanRow({
  plan,
  clientName,
  batches,
  projects,
  money,
  busy,
  locked,
  correctionNotes,
  onEdit,
  onToggleArchived,
  onToggleReceived,
  onNoteChange,
  onNoteCommit,
}: {
  plan: SalaryPlan;
  clientName: string;
  batches: SalaryBatch[];
  projects: readonly WorkItem[];
  money: (value: number) => string;
  busy: string;
  /** Free workspaces see their batches but cannot record batch payments. */
  locked: boolean;
  correctionNotes: Record<string, string>;
  onEdit: () => void;
  onToggleArchived: () => void;
  onToggleReceived: (batch: SalaryBatch) => void;
  onNoteChange: (batchId: string, note: string) => void;
  onNoteCommit: (batch: SalaryBatch) => void;
}) {
  const settledProjectIds = new Set(
    batches.flatMap((batch) => batch.projectIds)
  );
  const progress = projects.filter(
    (project) =>
      project.salaryPlanId === plan._id &&
      project.status === "Delivered" &&
      !settledProjectIds.has(project.id)
  ).length;
  return (
    <section aria-label={`${clientName} payment plan`} className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-section">
            <span className="truncate">{clientName}</span>
            {plan.archived ? (
              <span className="text-meta font-normal text-[var(--text-meta)]">
                Archived
              </span>
            ) : null}
          </h3>
          <p className="mt-1 text-meta text-[var(--text-meta)]">
            {money(plan.amount)} per {plan.requiredProjectCount} projects ·
            Started {formatDay(plan.startDate)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy === plan._id}
            onClick={onToggleArchived}
          >
            {plan.archived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <div className="grid max-w-xl gap-2">
        <div className="flex items-baseline justify-between gap-3 text-meta">
          <span className="text-[var(--text-meta)]">
            Batch #{batches.length + 1}
          </span>
          <span className="font-mono tabular-nums text-[var(--text-primary)]">
            {progress} / {plan.requiredProjectCount}
          </span>
        </div>
        <Progress
          aria-label={`${clientName} progress toward the next batch`}
          max={plan.requiredProjectCount}
          value={progress}
        />
      </div>

      {plan.notes ? (
        <p className="max-w-3xl text-body text-[var(--text-primary)]">
          {plan.notes}
        </p>
      ) : null}

      {batches.length ? (
        <DataTableFrame bodyLabel={`${clientName} payment batches`}>
          <Table className="min-w-160">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 px-3">Batch</TableHead>
                <TableHead className="px-3 text-right">Amount</TableHead>
                <TableHead className="px-3 text-right">Projects</TableHead>
                <TableHead className="px-3">Completed</TableHead>
                <TableHead className="w-36 px-3">Payment</TableHead>
                <TableHead className="w-1/3 px-3">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const received = isReceived(batch);
                return (
                  <TableRow key={batch._id}>
                    <TableCell className="px-3 font-mono font-medium">
                      #{batch.number}
                    </TableCell>
                    <TableCell className="px-3 text-right font-mono tabular-nums">
                      {money(batch.amount)}
                    </TableCell>
                    <TableCell className="px-3 text-right font-mono tabular-nums">
                      {batch.projectIds.length}
                    </TableCell>
                    <TableCell className="px-3 font-mono">
                      {formatDay(batch.completedAt)}
                    </TableCell>
                    <TableCell className="px-3">
                      <Button
                        type="button"
                        variant={received ? "ghost" : "secondary"}
                        size="sm"
                        aria-pressed={received}
                        aria-label={
                          received
                            ? `Batch ${batch.number} received. Mark as not received`
                            : `Mark batch ${batch.number} received`
                        }
                        disabled={locked || busy === batch._id}
                        onClick={() => onToggleReceived(batch)}
                      >
                        {received ? (
                          <Badge status="success">Received</Badge>
                        ) : (
                          "Mark received"
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="px-3">
                      <Input
                        aria-label={`Correction note for batch ${batch.number}`}
                        placeholder="Add a note"
                        className="h-8"
                        maxLength={4000}
                        disabled={locked || busy === `note-${batch._id}`}
                        value={correctionNotes[batch._id] ?? ""}
                        onChange={(event) =>
                          onNoteChange(batch._id, event.target.value)
                        }
                        onBlur={() => onNoteCommit(batch)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableFrame>
      ) : (
        <p className="text-meta text-[var(--text-meta)]">
          No completed batches yet. Only delivered projects linked to this plan
          count toward a batch.
        </p>
      )}
    </section>
  );
}

function PlanDialog({
  draft,
  clients,
  settings,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  draft: PlanDraft | null;
  clients: ReadonlyArray<{ id: string; name: string }>;
  settings: Pick<SettingsState, "weekStart" | "dateFormat">;
  saving: boolean;
  error: string;
  onChange: (draft: PlanDraft) => void;
  onClose: () => void;
  onSave: (draft: PlanDraft) => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {draft ? (
          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft);
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {draft.planId ? "Edit payment plan" : "New payment plan"}
              </DialogTitle>
              <DialogDescription>
                Changes apply to future batches only.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLayout label="Client" controlId="salary-plan-client">
                <Select
                  value={draft.clientId || undefined}
                  onValueChange={(clientId) => onChange({ ...draft, clientId })}
                >
                  <SelectTrigger id="salary-plan-client" className="w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldLayout>
              <FieldLayout label="Start date">
                <DatePicker
                  value={draft.startDate}
                  onChange={(startDate) => onChange({ ...draft, startDate })}
                  weekStart={settings.weekStart}
                  dateFormat={settings.dateFormat}
                />
              </FieldLayout>
              <FieldLayout label="Projects per batch">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={draft.requiredProjectCount}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      requiredProjectCount: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Batch amount">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={draft.amount}
                  onChange={(event) =>
                    onChange({ ...draft, amount: event.target.value })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Notes" className="sm:col-span-2">
                <Input
                  value={draft.notes}
                  maxLength={4000}
                  placeholder="Optional"
                  onChange={(event) =>
                    onChange({ ...draft, notes: event.target.value })
                  }
                />
              </FieldLayout>
            </div>
            {error ? (
              <p role="alert" className="text-body text-[var(--status-danger)]">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                pending={saving}
                pendingLabel="Saving..."
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : draft.planId
                    ? "Save plan"
                    : "Create plan"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

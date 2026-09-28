"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Plus } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import { ContentSection } from "@/components/workspace-page";
import { Button } from "@/components/ui/button";
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
import type { SettingsState, WorkItem } from "@/lib/types";
import { trackOptionalEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

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
};

/**
 * Owner-only Salary Plan management on the Reports page: create and edit plan
 * terms, track progress toward the next batch, and mark batches received.
 */
export function SalaryPlansPanel({
  settings,
  projects,
  isOwner,
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
        title="Salary plans"
        description="Sign in to create salary plans. Local mode uses the salary batch settings."
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
      setDraftError(errorMessage(caught, "Could not save the salary plan."));
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
      setError(errorMessage(caught, "Could not update the salary plan."));
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
        title="Salary plans"
        description="Batch terms per client. Completed batches keep the terms they closed with."
        bodyMode="flush"
        actions={
          <>
            {archivedCount ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                aria-pressed={showArchived}
                onClick={() => setShowArchived((current) => !current)}
              >
                {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={!clients.length}
              onClick={openNewPlan}
            >
              <Plus /> New plan
            </Button>
          </>
        }
      >
        {error ? (
          <p
            role="alert"
            className="border-t border-border px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {plans === undefined ? (
          <p className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
            Loading salary plans...
          </p>
        ) : visiblePlans.length ? (
          <div className="divide-y divide-border border-t border-border">
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
          <p className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
            {clients.length
              ? "No salary plans yet."
              : "Add a client before creating a salary plan."}
          </p>
        )}
        {hasLegacyBatches ? (
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Older salary batches stay in the Salary Batches list. New plans do
            not change them.
          </p>
        ) : null}
      </ContentSection>

      <PlanDialog
        draft={draft}
        clients={clients}
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
  const percent = Math.min(
    100,
    Math.round((progress / plan.requiredProjectCount) * 100)
  );

  return (
    <section
      aria-label={`${clientName} salary plan`}
      className={cn("grid gap-4 px-4 py-4", plan.archived && "opacity-70")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="truncate">{clientName}</span>
            {plan.archived ? (
              <span className="text-xs font-normal text-muted-foreground">
                Archived
              </span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
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
            className="text-muted-foreground"
            disabled={busy === plan._id}
            onClick={onToggleArchived}
          >
            {plan.archived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <div className="grid max-w-xl gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Batch #{batches.length + 1}
          </span>
          <span className="font-mono tabular-nums text-foreground">
            {progress} / {plan.requiredProjectCount}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${clientName} progress toward the next batch`}
          aria-valuemin={0}
          aria-valuemax={plan.requiredProjectCount}
          aria-valuenow={progress}
          className="h-1.5 overflow-hidden rounded-sm bg-[var(--app-progress-track)]"
        >
          <div
            className="h-full rounded-sm bg-[var(--app-accent)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {plan.notes ? (
        <p className="max-w-3xl text-xs text-muted-foreground">{plan.notes}</p>
      ) : null}

      {batches.length ? (
        <div className="overflow-hidden rounded-md border border-border">
          <Table className="min-w-[640px] text-xs">
            <TableHeader>
              <TableRow className="bg-[var(--app-soft-panel)] hover:bg-[var(--app-soft-panel)]">
                <TableHead className="h-8 w-20 px-3 text-[11px]">
                  Batch
                </TableHead>
                <TableHead className="h-8 px-3 text-[11px]">Amount</TableHead>
                <TableHead className="h-8 px-3 text-[11px]">Projects</TableHead>
                <TableHead className="h-8 px-3 text-[11px]">
                  Completed
                </TableHead>
                <TableHead className="h-8 w-36 px-3 text-[11px]">
                  Payment
                </TableHead>
                <TableHead className="h-8 w-[34%] px-3 text-[11px]">
                  Note
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const received = isReceived(batch);
                return (
                  <TableRow key={batch._id} className="h-12">
                    <TableCell className="px-3 font-medium">
                      #{batch.number}
                    </TableCell>
                    <TableCell className="px-3 font-mono tabular-nums">
                      {money(batch.amount)}
                    </TableCell>
                    <TableCell className="px-3 tabular-nums">
                      {batch.projectIds.length}
                    </TableCell>
                    <TableCell className="px-3 text-muted-foreground">
                      {formatDay(batch.completedAt)}
                    </TableCell>
                    <TableCell className="px-3">
                      <Button
                        type="button"
                        variant={received ? "ghost" : "outline"}
                        size="xs"
                        aria-pressed={received}
                        aria-label={
                          received
                            ? `Batch ${batch.number} received. Mark as not received`
                            : `Mark batch ${batch.number} received`
                        }
                        className={cn(
                          received && "px-0 text-[var(--app-success)]"
                        )}
                        disabled={busy === batch._id}
                        onClick={() => onToggleReceived(batch)}
                      >
                        {received ? (
                          <>
                            <Check /> Received
                          </>
                        ) : (
                          "Mark received"
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="px-3">
                      <Input
                        aria-label={`Correction note for batch ${batch.number}`}
                        placeholder="Add a note"
                        className="h-8 text-xs"
                        maxLength={4000}
                        disabled={busy === `note-${batch._id}`}
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
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
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
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  draft: PlanDraft | null;
  clients: ReadonlyArray<{ id: string; name: string }>;
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
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft);
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {draft.planId ? "Edit salary plan" : "New salary plan"}
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
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    onChange({ ...draft, startDate: event.target.value })
                  }
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
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
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

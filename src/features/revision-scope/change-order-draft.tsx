"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { extraCharges } from "../../../convex/revisionRoundsRules";
import { AiLockedNotice } from "@/features/ai/ai-availability";
import { projectHref } from "@/features/projects/project-view";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Summary = NonNullable<
  FunctionReturnType<typeof api.revisionRounds.getSummary>
>;

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Editor review of a saved draft. Copying is manual; nothing is sent. */
function DraftEditor({ draft }: { draft: Doc<"changeOrderDrafts"> }) {
  const update = useMutation(api.changeOrders.update);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [message, setMessage] = useState(draft.message ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setStatus("");
    try {
      await update({ draftId: draft._id, subject, message });
      await operation();
      setStatus(success);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save draft."
      );
    } finally {
      setBusy(false);
    }
  }
  const ready = Boolean(subject.trim() && message.trim());
  const outputsHref = projectHref({
    projectId: draft.projectId,
    view: "outputs",
  });
  return (
    <div className="grid gap-2">
      <p className="type-label-sm">AI-drafted · Review before sending</p>
      <Input
        aria-label="Change order subject"
        value={subject}
        maxLength={120}
        disabled={busy}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        aria-label="Change order message"
        value={message}
        maxLength={2000}
        rows={8}
        disabled={busy}
        onChange={(event) => setMessage(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || !ready}
          onClick={() => void act(async () => {}, "Saved")}
        >
          Save draft
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || !ready}
          onClick={() =>
            void act(
              () =>
                navigator.clipboard.writeText(
                  `${subject.trim()}\n\n${message.trim()}`
                ),
              "Copied"
            )
          }
        >
          Copy text
        </Button>
      </div>
      <p className="flex flex-wrap gap-3 type-label-sm">
        {draft.sourceOutputIds.map((id, index) => (
          <a
            key={id}
            className="underline"
            href={`${outputsHref}#output-${id}`}
          >
            {draft.facts.outputs[index]?.title ?? `Output ${index + 1}`}
          </a>
        ))}
        {draft.sourceRevisionItemIds.map((id, index) => (
          <a
            key={id}
            className="underline"
            href={`${outputsHref}#revision-${id}`}
          >
            Revision {index + 1}
          </a>
        ))}
      </p>
      {status ? (
        <p role="status" className="type-body">
          {status}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Change-order panel. Counts and amounts are computed in code and shown here;
 * AI only words the message, which the editor edits and copies.
 */
export function ChangeOrderDraft({
  projectId,
  summary,
}: {
  projectId: string;
  summary: Summary;
}) {
  const { isAuthenticated } = useConvexAuth();
  const options = useQuery(api.changeOrders.revisionItemOptions, { projectId });
  const generate = useMutation(api.changeOrders.generate);
  const [runId, setRunId] = useState<Id<"aiRuns"> | null>(null);
  const latest = useQuery(api.changeOrders.latest, {
    projectId,
    ...(runId ? { runId } : {}),
  });
  const [selected, setSelected] = useState<Id<"revisionItems">[]>([]);
  const [hoursText, setHoursText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hours = hoursText.trim() ? Number(hoursText) : 0;
  const validHours =
    Number.isFinite(hours) &&
    hours >= 0 &&
    hours <= 500 &&
    Number.isInteger(hours * 4);
  const charges = extraCharges({
    extraRounds: summary.extraRounds,
    extraHours: validHours ? hours : 0,
    extraRoundRate: summary.extraRoundRate,
    extraHourRate: summary.extraHourRate,
  });
  const billable = summary.extraRounds > 0 || (validHours && hours > 0);
  const running =
    busy || latest?.status === "queued" || latest?.status === "running";

  async function request(modelTier: "default" | "better") {
    setBusy(true);
    setError("");
    try {
      const result = await generate({
        projectId,
        revisionItemIds: selected,
        extraHours: hours,
        modelTier,
      });
      setRunId(result.runId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not draft change order."
      );
    } finally {
      setBusy(false);
    }
  }

  const money = (value: number | null) =>
    value === null ? "No rate saved" : formatMoney(value, summary.currencyCode);

  return (
    <section aria-label="Change order" className="grid gap-3 pt-2">
      <h4 className="type-label">Change order</h4>
      <dl className="grid gap-1 type-label-sm">
        <div className="flex justify-between gap-3">
          <dt>Extra rounds</dt>
          <dd className="font-mono tabular-nums">
            {summary.extraRounds}
            {summary.extraRounds ? ` · ${money(charges.extraRounds)}` : ""}
          </dd>
        </div>
        {validHours && hours > 0 ? (
          <div className="flex justify-between gap-3">
            <dt>Extra work</dt>
            <dd className="font-mono tabular-nums">
              {hours} h · {money(charges.extraHours)}
            </dd>
          </div>
        ) : null}
        {charges.total !== null ? (
          <div className="flex justify-between gap-3">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{money(charges.total)}</dd>
          </div>
        ) : null}
      </dl>
      <label className="flex items-center gap-2 type-label-sm">
        Extra work hours
        <Input
          inputMode="decimal"
          className="w-20"
          placeholder="0"
          value={hoursText}
          disabled={running}
          onChange={(event) => setHoursText(event.target.value)}
        />
      </label>
      {options?.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 type-label-sm">Include as extra scope</legend>
          {options.map((item) => (
            <label key={item._id} className="flex items-start gap-2 type-body">
              <Checkbox
                className="mt-0.5"
                checked={selected.includes(item._id)}
                disabled={running}
                onCheckedChange={(checked) =>
                  setSelected((current) =>
                    checked === true
                      ? [...current, item._id].slice(0, 20)
                      : current.filter((id) => id !== item._id)
                  )
                }
              />
              <span>
                {item.text}
                <span className="block type-label-sm">
                  {item.outputTitle}
                  {item.possibleNewScope ? " · Possible new scope" : ""}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {summary.aiEnabled ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={running || !billable || !validHours}
            onClick={() => void request("default")}
          >
            Draft a change order
          </Button>
          {latest ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={running || !billable || !validHours}
              onClick={() => void request("better")}
            >
              Retry with better model
            </Button>
          ) : null}
        </div>
      ) : (
        <AiLockedNotice
          feature="Draft a change order"
          access={isAuthenticated ? "settings" : "signIn"}
        />
      )}
      {latest && latest.status !== "succeeded" ? (
        <p role="status" className="type-label-sm">
          {latest.status === "queued"
            ? "Queued"
            : latest.status === "running"
              ? "Drafting..."
              : "Draft failed. Retry or use the better model."}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="type-body">
          {error}
        </p>
      ) : null}
      {latest && latest.draft.message !== undefined ? (
        <DraftEditor key={latest.draft._id} draft={latest.draft} />
      ) : null}
    </section>
  );
}

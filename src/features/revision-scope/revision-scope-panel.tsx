"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { RoundBasis } from "../../../convex/revisionRoundsRules";
import { ContentSection } from "@/components/workspace-page";
import { AiLockedNotice } from "@/features/ai/ai-availability";
import { projectHref } from "@/features/projects/project-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChangeOrderDraft } from "./change-order-draft";

type Summary = NonNullable<
  FunctionReturnType<typeof api.revisionRounds.getSummary>
>;

const limitSourceLabels = {
  project: "Set for this project",
  template: "From the project template",
  workspace: "Workspace default",
} as const;

const basisLabels = {
  per_output: "Per output",
  per_project: "Per project",
} as const satisfies Record<RoundBasis, string>;

/**
 * Chooses whether Included Rounds apply per output or per project. With
 * `allowDefault`, "default" means use the Workspace default.
 */
export function RoundBasisSelect({
  value,
  onChange,
  disabled,
  allowDefault,
}: {
  value: RoundBasis | "default";
  onChange: (value: RoundBasis | "default") => void;
  disabled?: boolean;
  allowDefault?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as RoundBasis | "default")}
    >
      <SelectTrigger
        size="sm"
        className="w-40 dark:text-white"
        aria-label="Included rounds apply"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="dark:bg-black dark:text-white [&_[data-slot=select-item]:focus]:bg-transparent">
        {allowDefault ? (
          <SelectItem value="default">Workspace default</SelectItem>
        ) : null}
        <SelectItem value="per_output">{basisLabels.per_output}</SelectItem>
        <SelectItem value="per_project">{basisLabels.per_project}</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Parses a blank (null) or whole-number field; NaN means invalid. */
export function parseWholeNumber(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

const controlClassName =
  "dark:bg-black dark:text-white [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button]:dark:text-white [&_input]:bg-transparent [&_input]:dark:bg-black [&_textarea]:dark:bg-black";

function OutputRow({
  projectId,
  output,
  includedRounds,
  canEdit,
  onError,
}: {
  projectId: string;
  output: Summary["outputs"][number];
  includedRounds: number | null;
  canEdit: boolean;
  onError: (message: string) => void;
}) {
  const correct = useMutation(api.revisionRounds.correctRounds);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(output.roundsUsed));
  const [busy, setBusy] = useState(false);
  async function save(rounds: number | null) {
    setBusy(true);
    try {
      await correct({ projectId, outputId: output.outputId, rounds });
      setEditing(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const parsed = parseWholeNumber(value);
  return (
    <li className="grid gap-2 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
        <a
          href={`${projectHref({ projectId, view: "outputs" })}#output-${output.outputId}`}
          className="min-w-0 truncate underline-offset-4 hover:underline"
        >
          {output.title}
        </a>
        <span className="font-mono tabular-nums">
          {output.roundsUsed}
          {includedRounds === null ? "" : ` / ${includedRounds}`}
          {output.extraRounds ? ` · ${output.extraRounds} extra` : ""}
        </span>
      </div>
      <p className="text-xs">
        {output.adjustment
          ? `Counted ${output.computed}, corrected by editor`
          : output.closingVersions.length
            ? `Closed by version ${output.closingVersions.join(", ")}`
            : "No closed rounds"}
        {output.openRound ? " · Feedback waiting for a new version" : ""}
      </p>
      {canEdit && editing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (parsed !== null && !Number.isNaN(parsed)) void save(parsed);
          }}
        >
          <Input
            aria-label={`Rounds for ${output.title}`}
            inputMode="numeric"
            className="w-20"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || parsed === null || Number.isNaN(parsed)}
          >
            Save
          </Button>
          {output.adjustment ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void save(null)}
            >
              Use counted
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      ) : canEdit ? (
        <Button
          size="sm"
          variant="ghost"
          className="justify-self-start px-0"
          onClick={() => {
            setValue(String(output.roundsUsed));
            setEditing(true);
          }}
        >
          Correct count
        </Button>
      ) : null}
    </li>
  );
}

function LimitEditor({
  projectId,
  summary,
  onError,
}: {
  projectId: string;
  summary: Summary;
  onError: (message: string) => void;
}) {
  const setLimit = useMutation(api.revisionRounds.setProjectLimit);
  const [value, setValue] = useState(
    summary.limitSource === "project" ? String(summary.includedRounds) : ""
  );
  const [basis, setBasis] = useState<RoundBasis | "default">(
    summary.basisSource === "project" ? summary.roundBasis : "default"
  );
  const [busy, setBusy] = useState(false);
  const parsed = parseWholeNumber(value);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (Number.isNaN(parsed)) return;
        setBusy(true);
        try {
          await setLimit({
            projectId,
            includedRounds: parsed,
            roundBasis: basis === "default" ? null : basis,
          });
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="text-xs" htmlFor="project-included-rounds">
        Included rounds
      </label>
      <Input
        id="project-included-rounds"
        inputMode="numeric"
        placeholder={
          summary.limitSource && summary.limitSource !== "project"
            ? String(summary.includedRounds)
            : "None"
        }
        className="w-20"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <RoundBasisSelect
        allowDefault
        value={basis}
        disabled={busy}
        onChange={setBasis}
      />
      <Button size="sm" variant="ghost" disabled={busy || Number.isNaN(parsed)}>
        Save
      </Button>
    </form>
  );
}

/**
 * Revision rounds per Project Output against the included limit (applied per
 * output or across the Project), with editor controls and the AI-drafted
 * change order when scope is exceeded.
 */
export function RevisionScopePanel({ projectId }: { projectId: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const summary = useQuery(
    api.revisionRounds.getSummary,
    isAuthenticated ? { projectId } : "skip"
  );
  const [error, setError] = useState("");
  /**
   * Rounds are counted in a Workspace. Sign-in resolves first, so a local visit
   * meets the change order where it lives instead of waiting on a query that
   * never runs.
   */
  if (isLoading) return null;
  if (!isAuthenticated)
    return (
      <ContentSection
        title="Revision rounds"
        description="Counted in a team Workspace."
      >
        <AiLockedNotice feature="Draft a change order" />
      </ContentSection>
    );
  if (!summary) return null;
  return (
    <ContentSection
      title="Revision rounds"
      metadata={
        <span className="font-mono text-xs tabular-nums">
          {summary.roundsUsed}
          {summary.includedRounds === null
            ? ""
            : ` · ${summary.includedRounds} included ${
                summary.roundBasis === "per_project"
                  ? "per project"
                  : "per output"
              }`}
        </span>
      }
      description={
        summary.limitSource
          ? limitSourceLabels[summary.limitSource]
          : "No limit set"
      }
    >
      <div className={`grid gap-3 ${controlClassName}`}>
        {summary.canEdit ? (
          <LimitEditor
            key={`${summary.limitSource}-${summary.includedRounds}-${summary.basisSource}-${summary.roundBasis}`}
            projectId={projectId}
            summary={summary}
            onError={setError}
          />
        ) : null}
        {summary.outputs.length ? (
          <ul className="grid">
            {summary.outputs.map((output) => (
              <OutputRow
                key={`${output.outputId}-${output.roundsUsed}`}
                projectId={projectId}
                output={output}
                includedRounds={
                  summary.roundBasis === "per_project"
                    ? null
                    : summary.includedRounds
                }
                canEdit={summary.canEdit}
                onError={setError}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm">No outputs yet.</p>
        )}
        {summary.truncated ? (
          <p className="text-xs">Only the first 20 outputs are counted.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm">
            {error}
          </p>
        ) : null}
        {summary.canEdit ? (
          <ChangeOrderDraft projectId={projectId} summary={summary} />
        ) : null}
      </div>
    </ContentSection>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToastState } from "@/features/routes/shared/route-types";
import { SettingsPanel } from "@/features/settings/settings-components";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { parseWholeNumber, RoundBasisSelect } from "./revision-scope-panel";

type ScopeSettings = NonNullable<
  FunctionReturnType<typeof api.revisionRounds.getWorkspaceSettings>
>;

/** Blank is null; otherwise a non-negative amount, or NaN when invalid. */
function parseAmount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

const text = (value: number | null) => (value === null ? "" : String(value));

function ScopeForm({
  workspaceId,
  settings,
  templates,
  notify,
}: {
  workspaceId: Id<"teamWorkspaces">;
  settings: ScopeSettings;
  templates: ReadonlyArray<{ id: string; name: string }>;
  notify: (message: string, tone?: ToastState["tone"]) => void;
}) {
  const save = useMutation(api.revisionRounds.saveWorkspaceSettings);
  const [rounds, setRounds] = useState(text(settings.defaultIncludedRounds));
  const [roundBasis, setRoundBasis] = useState(settings.roundBasis);
  const [roundRate, setRoundRate] = useState(text(settings.extraRoundRate));
  const [hourRate, setHourRate] = useState(text(settings.extraHourRate));
  const [templateRounds, setTemplateRounds] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        settings.templateLimits.map((limit) => [
          limit.templateId,
          String(limit.includedRounds),
        ])
      )
  );
  const [busy, setBusy] = useState(false);
  const values = {
    defaultIncludedRounds: parseWholeNumber(rounds),
    roundBasis,
    extraRoundRate: parseAmount(roundRate),
    extraHourRate: parseAmount(hourRate),
    templateLimits: templates.map((template) => ({
      templateId: template.id,
      includedRounds: parseWholeNumber(templateRounds[template.id] ?? ""),
    })),
  };
  const invalid = [
    values.defaultIncludedRounds,
    values.extraRoundRate,
    values.extraHourRate,
  ]
    .concat(values.templateLimits.map((limit) => limit.includedRounds))
    .some((value) => Number.isNaN(value));
  const disabled = !settings.canManage || busy;
  return (
    <form
      className="grid gap-3 text-[var(--text-primary)]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (invalid) return;
        setBusy(true);
        try {
          await save({ workspaceId, ...values });
          notify("Revision scope saved.", "success");
        } catch (error) {
          notify(
            error instanceof Error ? error.message : "Could not save.",
            "warning"
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {(
        [
          ["Included rounds", rounds, setRounds, "numeric"],
          ["Rate per extra round", roundRate, setRoundRate, "decimal"],
          ["Hourly rate for extra work", hourRate, setHourRate, "decimal"],
        ] as const
      ).map(([label, value, setValue, inputMode]) => (
        <label
          key={label}
          className="flex items-center justify-between gap-4 text-body"
        >
          {label}
          <Input
            inputMode={inputMode}
            className="w-28"
            value={value}
            disabled={disabled}
            placeholder="None"
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      ))}
      <div className="flex items-center justify-between gap-4 text-body">
        Included rounds apply
        <RoundBasisSelect
          value={roundBasis}
          disabled={disabled}
          onChange={(value) => value !== "default" && setRoundBasis(value)}
        />
      </div>
      {templates.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-meta">
            Included rounds by template
          </legend>
          {templates.map((template) => (
            <label
              key={template.id}
              className="flex items-center justify-between gap-4 text-body"
            >
              {template.name}
              <Input
                inputMode="numeric"
                className="w-28"
                value={templateRounds[template.id] ?? ""}
                disabled={disabled}
                placeholder="Default"
                onChange={(event) =>
                  setTemplateRounds((current) => ({
                    ...current,
                    [template.id]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </fieldset>
      ) : null}
      <Button
        size="sm"
        variant="secondary"
        className="justify-self-start"
        disabled={disabled || invalid}
      >
        Save
      </Button>
      {!settings.canManage ? (
        <p className="text-meta">Only the Workspace Owner can change these.</p>
      ) : null}
    </form>
  );
}

/**
 * Workspace defaults for revision rounds and saved rates used in change
 * orders. Projects can override the included rounds.
 */
export function RevisionScopeSettings({
  workspaceId,
  templates,
  notify,
}: {
  workspaceId?: Id<"teamWorkspaces">;
  templates: ReadonlyArray<{ id: string; name: string }>;
  notify: (message: string, tone?: ToastState["tone"]) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const settings = useQuery(
    api.revisionRounds.getWorkspaceSettings,
    workspaceId && isAuthenticated ? { workspaceId } : "skip"
  );
  if (!workspaceId || !settings) return null;
  return (
    <SettingsPanel
      id="revision-scope"
      title="Revision rounds and rates"
      subtitle="Used to count extra rounds and price change orders."
    >
      <ScopeForm
        workspaceId={workspaceId}
        settings={settings}
        templates={templates}
        notify={notify}
      />
    </SettingsPanel>
  );
}

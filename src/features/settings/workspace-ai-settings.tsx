"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ToastState } from "@/features/routes/shared/route-types";
import { SettingsPanel } from "./settings-components";

export function WorkspaceAiSettings({
  workspaceId,
  notify,
}: {
  workspaceId?: Id<"teamWorkspaces">;
  notify: (message: string, tone?: ToastState["tone"]) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [saving, setSaving] = useState(false);
  const summary = useQuery(
    api.aiRuns.getSummary,
    workspaceId && isAuthenticated ? { workspaceId, month } : "skip"
  );
  const setEnabled = useMutation(api.aiRuns.setEnabled);

  useEffect(() => {
    const interval = setInterval(() => {
      setMonth(new Date().toISOString().slice(0, 7));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function changeEnabled(enabled: boolean) {
    if (!workspaceId || !summary?.canManage || saving) return;
    setSaving(true);
    try {
      await setEnabled({ workspaceId, enabled });
      notify(`Workspace AI ${enabled ? "enabled" : "disabled"}.`, "success");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "AI preference could not be saved.",
        "warning"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPanel
      id="workspace-ai"
      title="AI assistance"
      subtitle="Off by default. The Workspace Owner decides whether editors can use AI."
    >
      <Label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 text-sm font-normal">
        <span>
          <span className="block font-medium">Allow AI in this workspace</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Owners and Editors trigger each run. Clients and Viewers cannot run
            AI.
          </span>
        </span>
        <Switch
          aria-label="Allow AI in this workspace"
          checked={summary?.enabled ?? false}
          disabled={!summary?.canManage || saving}
          onCheckedChange={(enabled) => void changeEnabled(enabled)}
        />
      </Label>
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {summary
          ? `${summary.used} of ${summary.limit} runs used this month. ${summary.remaining} remaining. Resets ${new Date(summary.resetsAt).toLocaleDateString("en", { timeZone: "UTC", day: "numeric", month: "short" })} (UTC).`
          : workspaceId && isAuthenticated
            ? "Loading AI usage…"
            : "Connect an authenticated workspace to manage AI and its monthly allowance."}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        AI features send only the text, timestamps and titles needed for the
        request. Drafts are marked AI-drafted and linked to their sources.
        Nothing is sent to clients automatically. Reused drafts do not use
        another run; new attempts, including failed attempts and better-model
        retries, do.
      </p>
      {summary && !summary.canManage ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Only the Workspace Owner can change this setting.
        </p>
      ) : null}
    </SettingsPanel>
  );
}

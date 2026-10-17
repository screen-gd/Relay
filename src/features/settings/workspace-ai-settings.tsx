"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [keys, setKeys] = useState({ google: "", openai: "" });
  const [savingProvider, setSavingProvider] = useState<"google" | "openai">();
  const summary = useQuery(
    api.aiRuns.getSummary,
    workspaceId && isAuthenticated ? { workspaceId, month } : "skip"
  );
  const setEnabled = useMutation(api.aiRuns.setEnabled);
  const saveKey = useAction(api.aiCredentials.save);
  const removeKey = useMutation(api.aiCredentials.remove);

  useEffect(() => {
    setKeys({ google: "", openai: "" });
  }, [workspaceId, isAuthenticated, summary?.canManage]);

  async function changeKey(provider: "google" | "openai", remove = false) {
    if (!workspaceId || !summary?.canManage || savingProvider) return;
    setSavingProvider(provider);
    try {
      if (remove) await removeKey({ workspaceId, provider });
      else await saveKey({ workspaceId, provider, apiKey: keys[provider] });
      setKeys((current) => ({ ...current, [provider]: "" }));
      notify(`API key ${remove ? "removed" : "saved"}.`, "success");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "API key could not be updated.",
        "warning"
      );
    } finally {
      setSavingProvider(undefined);
    }
  }

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

  const connected = Boolean(workspaceId && isAuthenticated);
  /**
   * What keeps this switch from turning AI on, and the control that fixes it
   * where one exists here: the connect link, or the switch itself.
   */
  const gap: { text: string; control?: "workspace" } | null = summary
    ? !summary.canManage
      ? { text: "Only the Workspace Owner can change this setting." }
      : !summary.enabled
        ? { text: "AI is off, so no AI feature can run." }
        : !summary.googleConfigured
          ? {
              text: "No provider key saved. Add a Gemini key above to run AI.",
            }
          : null
    : connected
      ? null
      : { text: "No Workspace connected.", control: "workspace" };

  return (
    <SettingsPanel
      id="workspace-ai"
      title="AI assistance"
      subtitle="Bring your own API keys. Your provider bills your account for AI usage."
    >
      <div className="mb-5 space-y-4">
        {(
          [
            {
              provider: "google",
              label: "Gemini API key",
              configured: summary?.googleConfigured,
              hint: "Used for default AI runs.",
            },
            {
              provider: "openai",
              label: "OpenAI API key",
              configured: summary?.openaiConfigured,
              hint: "Optional. Used for better-model retries.",
            },
          ] as const
        ).map(({ provider, label, configured, hint }) => (
          <div key={provider}>
            <Label htmlFor={`ai-key-${provider}`}>{label}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {hint} {configured ? "Key saved." : "No key saved."}
            </p>
            {summary?.canManage ? (
              <form
                className="mt-2 flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void changeKey(provider);
                }}
              >
                <Input
                  id={`ai-key-${provider}`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={1024}
                  value={keys[provider]}
                  onChange={(event) =>
                    setKeys((current) => ({
                      ...current,
                      [provider]: event.target.value,
                    }))
                  }
                  placeholder={
                    configured
                      ? "Enter a replacement key"
                      : "Enter your API key"
                  }
                  disabled={savingProvider !== undefined}
                  className="min-w-48 flex-1"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    savingProvider !== undefined || !keys[provider].trim()
                  }
                >
                  Save key
                </Button>
                {configured ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={savingProvider !== undefined}
                    onClick={() => void changeKey(provider, true)}
                  >
                    Remove key
                  </Button>
                ) : null}
              </form>
            ) : null}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Keys are encrypted in storage and shared for AI runs in this
          workspace. Only the Workspace Owner can replace or remove them.
        </p>
      </div>
      <Label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 text-sm font-normal">
        <span>
          <span className="block font-medium">Allow AI in this workspace</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Owners and Editors trigger each run. Clients and Viewers cannot run
            AI.
          </span>
          {gap ? (
            <span
              id="workspace-ai-gap"
              className="mt-1 block text-xs text-muted-foreground"
            >
              {gap.text}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {gap?.control === "workspace" ? (
            <a
              href="/team"
              className="text-xs font-semibold text-text-1 hover:underline"
            >
              Connect a workspace
            </a>
          ) : null}
          <Switch
            aria-label="Allow AI in this workspace"
            aria-describedby={gap ? "workspace-ai-gap" : undefined}
            checked={summary?.enabled ?? false}
            disabled={!summary?.canManage || saving}
            onCheckedChange={(enabled) => void changeEnabled(enabled)}
          />
        </span>
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
    </SettingsPanel>
  );
}

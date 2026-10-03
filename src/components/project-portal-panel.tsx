"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { ContentSection } from "@/components/workspace-page";
import { useProjectOutputs } from "@/lib/project-output-data";
import type { WorkItem } from "@/lib/types";
import {
  draftFromPortal,
  useProjectPortal,
  type ProjectPortalDraft,
} from "@/features/client-portals/internal/project-portal-data";

/** Aligns each portal setting label and hint with its control. */
function PortalSettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 py-2 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:items-center sm:gap-6">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type ProjectPortalPanelProps = {
  project: WorkItem;
  canEdit: boolean;
  clientHubEnabled?: boolean;
  customPortalBrandingEnabled?: boolean;
};

export function ProjectPortalPanel({
  project,
  canEdit,
  clientHubEnabled = true,
  customPortalBrandingEnabled = true,
}: ProjectPortalPanelProps) {
  const outputData = useProjectOutputs(project, canEdit);
  const outputs = useMemo(
    () =>
      outputData.outputs.map((output) => ({
        id: output.id,
        title: output.title,
        reviewState: output.reviewState,
        hasCurrentVersion: Boolean(outputData.currentVersion(output)),
      })),
    [outputData]
  );
  const data = useProjectPortal(project.id, canEdit);
  const hubSettings = useQuery(api.clientHub.getOwnerSettings, {
    projectId: project.id,
  });
  const setHubPublished = useMutation(api.clientHub.setProjectPublished);
  const saveBranding = useMutation(api.clientHub.setBranding);
  const [brandName, setBrandName] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [draft, setDraft] = useState<ProjectPortalDraft>(() =>
    draftFromPortal(null)
  );
  const [busy, setBusy] = useState<
    "save" | "open" | "close" | "regenerate" | "" | "copy"
  >("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!data.loading) setDraft(data.initialDraft);
  }, [data.initialDraft, data.loading]);

  useEffect(() => {
    if (!hubSettings) return;
    setBrandName(hubSettings.brandName);
    setAccentColor(hubSettings.accentColor);
  }, [hubSettings?.accentColor, hubSettings?.brandName]);

  const selectedOutputs = useMemo(
    () => new Set(draft.selectedOutputIds),
    [draft.selectedOutputIds]
  );

  function updateDraft(changes: Partial<ProjectPortalDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setFormError("");
  }

  function toggleOutput(outputId: string) {
    const next = new Set(selectedOutputs);
    if (next.has(outputId)) next.delete(outputId);
    else next.add(outputId);
    updateDraft({ selectedOutputIds: [...next] });
  }

  async function savePortal() {
    if (draft.pinProtected && !data.portal?.hasPin && !draft.pin.trim()) {
      setFormError("Enter a PIN before protecting this portal.");
      return;
    }
    setBusy("save");
    setFormError("");
    try {
      await data.save(draft);
      setDraft((current) => ({ ...current, pin: "" }));
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not save the Client Portal."
      );
    } finally {
      setBusy("");
    }
  }

  async function changeOpen(open: boolean) {
    if (!data.portal) return;
    setBusy(open ? "open" : "close");
    setFormError("");
    try {
      await data.changeOpen(data.portal.id, open);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not update portal access."
      );
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    if (!data.portal) return;
    setBusy("regenerate");
    setFormError("");
    try {
      await data.regenerate(data.portal.id);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not regenerate the portal link."
      );
    } finally {
      setBusy("");
    }
  }

  async function copyPortalLink() {
    if (!data.portal || typeof window === "undefined" || !navigator.clipboard)
      return;
    setBusy("copy");
    setFormError("");
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/client-portal/${data.portal.token}`
      );
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not copy the portal link."
      );
    } finally {
      setBusy("");
    }
  }

  async function changeHubPublished(published: boolean) {
    setFormError("");
    try {
      await setHubPublished({ projectId: project.id, published });
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not update Client Hub access."
      );
    }
  }

  async function saveHubBranding() {
    setFormError("");
    try {
      await saveBranding({ brandName, accentColor });
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not save portal branding."
      );
    }
  }

  const portalUrl =
    data.portal?.token && typeof window !== "undefined"
      ? `${window.location.origin}/client-portal/${data.portal.token}`
      : "";

  if (!data.available && !data.loading) {
    return (
      <ContentSection
        titleId="project-portal-title"
        title="Client Portal"
        description="Requires a cloud account."
      />
    );
  }

  if (data.loading) {
    return (
      <p
        role="status"
        className="py-8 text-center text-sm text-muted-foreground"
      >
        Loading Client Portal settings...
      </p>
    );
  }

  const statusLabel = data.portal
    ? data.portal.status === "open"
      ? "Open"
      : data.portal.status === "draft"
        ? "Draft"
        : "Closed"
    : "Not published";

  return (
    <div data-testid="project-portal-panel" className="grid gap-4">
      {data.error || formError ? (
        <p
          role="alert"
          className="bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger)]"
        >
          {formError || data.error}
        </p>
      ) : null}

      <ContentSection
        titleId="project-portal-title"
        title="Client Portal"
        metadata={
          <Badge variant="secondary" className="rounded-sm">
            {statusLabel}
          </Badge>
        }
        footer={
          canEdit ? (
            <>
              <p className="text-xs text-muted-foreground">
                Client access stays scoped to this project.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void savePortal()}
                disabled={busy !== ""}
              >
                {busy === "save"
                  ? "Saving..."
                  : data.portal
                    ? "Save changes"
                    : "Publish portal"}
              </Button>
            </>
          ) : null
        }
      >
        <div className="grid gap-2">
          <PortalSettingRow
            label="Portal link"
            hint={
              data.portal
                ? "Regenerating invalidates the current link."
                : "Publish to create a private link."
            }
          >
            {data.portal ? (
              <div className="grid gap-2">
                {portalUrl ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      readOnly
                      value={portalUrl}
                      aria-label="Client Portal link"
                      className="min-w-0 flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copyPortalLink()}
                      disabled={busy !== ""}
                    >
                      {busy === "copy" ? "Copying..." : "Copy"}
                    </Button>
                    <Button asChild type="button" variant="outline">
                      <a href={portalUrl} target="_blank" rel="noreferrer">
                        Open <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Link unavailable in this browser.
                  </p>
                )}
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        data.portal.status === "open" ? "outline" : "default"
                      }
                      onClick={() =>
                        void changeOpen(data.portal?.status !== "open")
                      }
                      disabled={busy !== ""}
                    >
                      {busy === "open"
                        ? "Opening..."
                        : busy === "close"
                          ? "Closing..."
                          : data.portal.status === "open"
                            ? "Close portal"
                            : "Open portal"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void regenerate()}
                      disabled={busy !== ""}
                    >
                      <RefreshCw aria-hidden="true" />{" "}
                      {busy === "regenerate"
                        ? "Regenerating..."
                        : "Regenerate link"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set the options below, then publish.
              </p>
            )}
          </PortalSettingRow>
          <PortalSettingRow
            label="Public notes"
            hint={`${draft.publicNotes.length}/2000 characters`}
          >
            <Textarea
              value={draft.publicNotes}
              onChange={(event) =>
                updateDraft({ publicNotes: event.target.value })
              }
              maxLength={2000}
              disabled={!canEdit}
            />
          </PortalSettingRow>
          <PortalSettingRow
            label="Project dates"
            hint="Choose which dates clients can see."
          >
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Label className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={draft.showStartDate}
                  onCheckedChange={(checked) =>
                    updateDraft({ showStartDate: checked === true })
                  }
                  disabled={!canEdit}
                />
                Start date
              </Label>
              <Label className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={draft.showDueDate}
                  onCheckedChange={(checked) =>
                    updateDraft({ showDueDate: checked === true })
                  }
                  disabled={!canEdit}
                />
                Due date
              </Label>
            </div>
          </PortalSettingRow>
          <PortalSettingRow
            label="Shared outputs"
            hint="Only current versions are shared."
          >
            {outputs.length ? (
              <div className="grid gap-2">
                {outputs.map((output) => (
                  <Label
                    key={output.id}
                    className="flex items-center gap-2 text-sm font-normal"
                  >
                    <Checkbox
                      checked={selectedOutputs.has(output.id)}
                      onCheckedChange={() => toggleOutput(output.id)}
                      disabled={!canEdit}
                    />
                    <span className="min-w-0 truncate">{output.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {output.hasCurrentVersion ? "Ready" : "No version"}
                    </span>
                  </Label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No outputs to share.
              </p>
            )}
          </PortalSettingRow>
          <PortalSettingRow label="Expiry" hint="Optional. Uses local time.">
            <Input
              type="datetime-local"
              value={draft.expiresAt}
              onChange={(event) =>
                updateDraft({ expiresAt: event.target.value })
              }
              disabled={!canEdit}
            />
          </PortalSettingRow>
          <PortalSettingRow
            label="PIN"
            hint={
              draft.pinProtected
                ? "Leave blank to keep the current PIN."
                : "Optional. Four or more characters."
            }
          >
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <Input
                type="password"
                value={draft.pin}
                onChange={(event) => updateDraft({ pin: event.target.value })}
                minLength={4}
                maxLength={128}
                autoComplete="new-password"
                disabled={
                  !canEdit ||
                  (!draft.pinProtected && Boolean(data.portal?.hasPin))
                }
              />
              <Label className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={draft.pinProtected}
                  onCheckedChange={(checked) =>
                    updateDraft({ pinProtected: checked === true })
                  }
                  disabled={!canEdit}
                />
                Protect with PIN
              </Label>
            </div>
          </PortalSettingRow>
        </div>
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-[13px] text-muted-foreground hover:text-foreground">
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
            />
            Preview
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 rounded-lg bg-[var(--surface-inset)] p-4 text-sm">
            <p className="font-semibold">{project.title}</p>
            {draft.publicNotes ? (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {draft.publicNotes}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {[
                draft.showStartDate ? `Start ${project.startDate}` : "",
                draft.showDueDate ? `Due ${project.dueDate}` : "",
              ]
                .filter(Boolean)
                .join(" · ") || "No dates shared"}
            </p>
            <p>
              {draft.selectedOutputIds.length}{" "}
              {draft.selectedOutputIds.length === 1 ? "output" : "outputs"}{" "}
              selected
            </p>
          </CollapsibleContent>
        </Collapsible>
      </ContentSection>

      {canEdit &&
      (clientHubEnabled ? Boolean(hubSettings?.available) : true) ? (
        <ContentSection titleId="client-hub-title" title="Client Hub">
          {clientHubEnabled && hubSettings?.available ? (
            <div className="grid gap-4">
              <PortalSettingRow
                label="Publish"
                hint="Show this project to signed-in clients."
              >
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={hubSettings.published}
                    onCheckedChange={(checked) =>
                      void changeHubPublished(checked === true)
                    }
                  />
                  Publish to Client Hub
                </Label>
              </PortalSettingRow>
              <PortalSettingRow
                label="Branding"
                hint="Changes the client-facing presentation."
              >
                {customPortalBrandingEnabled ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_auto]">
                    <Input
                      value={brandName}
                      onChange={(event) => setBrandName(event.target.value)}
                      aria-label="Portal brand name"
                    />
                    <Input
                      type="color"
                      value={accentColor}
                      onChange={(event) => setAccentColor(event.target.value)}
                      aria-label="Portal accent color"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void saveHubBranding()}
                      disabled={!accentColor}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <CapabilityUpgradePrompt
                    capability="customPortalBranding"
                    inline
                  />
                )}
              </PortalSettingRow>
            </div>
          ) : (
            <div className="grid gap-2">
              <CapabilityUpgradePrompt capability="clientHub" inline />
              <CapabilityUpgradePrompt
                capability="customPortalBranding"
                inline
              />
            </div>
          )}
        </ContentSection>
      ) : null}
    </div>
  );
}

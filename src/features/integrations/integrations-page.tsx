"use client";

import { useState } from "react";
import type { IntegrationConfig, SettingsState, WorkItem } from "@/lib/types";
import type {
  IntegrationLink,
  IntegrationLinks,
  IntegrationServiceId,
} from "@/lib/integrations";
import {
  configuredIntegrationCount,
  emptyIntegrationLink,
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
  integrationStatusLabel,
  isValidIntegrationUrl,
  normalizeIntegrationLink,
} from "@/lib/integrations";
import {
  ContentSection,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";
import {
  AlertDialog as OwnedAlertDialog,
  AlertDialogAction as OwnedAlertDialogAction,
  AlertDialogCancel as OwnedAlertDialogCancel,
  AlertDialogContent as OwnedAlertDialogContent,
  AlertDialogDescription as OwnedAlertDialogDescription,
  AlertDialogFooter as OwnedAlertDialogFooter,
  AlertDialogHeader as OwnedAlertDialogHeader,
  AlertDialogTitle as OwnedAlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  Cloud,
  ExternalLink,
  Link2,
  Pencil,
  Plug,
  Plus,
  Trash2,
  Unplug,
} from "lucide-react";
import type { ToastState } from "@/features/routes/shared/route-types";
import { EmptyPanel } from "@/features/routes/shared/empty-panel";
import {
  emptyIntegrationConfig,
  integrationColors,
  integrationDescriptions,
  integrationIcons,
  integrationNames,
} from "./integration-constants";

export function IntegrationsDesignPage({
  projects,
  settings,
  setSettings,
  notify,
  onEditProject,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  onEditProject: (item: WorkItem) => void;
}) {
  const [integrationDialog, setIntegrationDialog] = useState<{
    name: string;
    config: IntegrationConfig;
  } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [configError, setConfigError] = useState("");
  const [integrationSearch, setIntegrationSearch] = useState("");
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const projectLinks = projects.filter(
    (project) => configuredIntegrationCount(project.integrationLinks) > 0
  );
  const connectedCount = integrationNames.filter((name) => {
    const config = settings.integrationConfigs[name];
    return Boolean(config?.connected);
  }).length;
  const visibleIntegrationNames = integrationNames.filter((name) => {
    const config = settings.integrationConfigs[name] ?? emptyIntegrationConfig;
    const connected = config.connected;
    const query = integrationSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [name, integrationDescriptions[name], config.account].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesFilter =
      integrationFilter === "all" ||
      (integrationFilter === "connected" ? connected : !connected);
    return matchesSearch && matchesFilter;
  });
  const visibleProjectLinks = projectLinks.filter((project) => {
    const query = integrationSearch.trim().toLowerCase();
    return (
      !query ||
      [project.title, project.client || ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  });

  function openIntegration(name: string) {
    const existing = settings.integrationConfigs[name] ?? {
      ...emptyIntegrationConfig,
    };
    setIntegrationDialog({
      name,
      config: {
        ...existing,
        connected: existing.connected,
        account: existing.account,
      },
    });
    setConfigError("");
  }

  function closeIntegrationDialog() {
    setIntegrationDialog(null);
    setConfigError("");
  }

  function updateIntegrationConfig(next: Partial<IntegrationConfig>) {
    setIntegrationDialog((current) =>
      current ? { ...current, config: { ...current.config, ...next } } : current
    );
    setConfigError("");
  }

  function saveIntegration() {
    if (!integrationDialog) return;
    const account = integrationDialog.config.account.trim();
    if (!account) {
      setConfigError("Enter an account email or name.");
      return;
    }
    const now = new Date().toISOString();
    const updatedConfig: IntegrationConfig = {
      ...integrationDialog.config,
      connected: true,
      account,
      connectedAt: integrationDialog.config.connectedAt || now,
      lastSyncAt: now,
    };
    setSettings({
      ...settings,
      integrationConfigs: {
        ...settings.integrationConfigs,
        [integrationDialog.name]: updatedConfig,
      },
    });
    notify(`${integrationDialog.name} connected successfully.`, "success");
    closeIntegrationDialog();
  }

  function confirmDisconnect() {
    if (!disconnectTarget) return;
    setSettings({
      ...settings,
      integrationConfigs: {
        ...settings.integrationConfigs,
        [disconnectTarget]: { ...emptyIntegrationConfig },
      },
    });
    notify(`${disconnectTarget} disconnected.`, "warning");
    setDisconnectTarget(null);
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        eyebrow="Workspace / Integrations"
        title="Integrations"
        description="Manage local service records and save external links for your workspace and individual projects."
      />
      <PageContent className="space-y-5">
        <PageToolbar
          data-family-toolbar="integrations"
          primary={
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Plug
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-muted)]"
              />
              <OwnedInput
                aria-label="Search integrations"
                value={integrationSearch}
                onChange={(event) => setIntegrationSearch(event.target.value)}
                placeholder="Search services and project links..."
                className="h-10 bg-[var(--app-control)] pl-9 shadow-none"
              />
            </div>
          }
          secondary={
            <OwnedSelect
              value={integrationFilter}
              onValueChange={setIntegrationFilter}
            >
              <OwnedSelectTrigger
                aria-label="Filter integrations"
                className="h-10 w-full sm:w-40"
              >
                <OwnedSelectValue />
              </OwnedSelectTrigger>
              <OwnedSelectContent position="popper">
                <OwnedSelectItem value="all">All services</OwnedSelectItem>
                <OwnedSelectItem value="connected">Connected</OwnedSelectItem>
                <OwnedSelectItem value="available">
                  Not connected
                </OwnedSelectItem>
              </OwnedSelectContent>
            </OwnedSelect>
          }
        />
        <ContentSection
          title="Connected Services"
          description="Save the account and workspace details your studio uses. These are local records and do not grant API access."
          actions={
            <OwnedBadge variant={connectedCount ? "default" : "secondary"}>
              <Plug aria-hidden="true" />
              {connectedCount} connected
            </OwnedBadge>
          }
        >
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border shadow-[var(--app-shadow-1)]">
            {visibleIntegrationNames.map((name) => {
              const config =
                settings.integrationConfigs[name] ?? emptyIntegrationConfig;
              const connected = Boolean(config.connected);
              const account = config.account;
              return (
                <li
                  key={name}
                  className="flex flex-col justify-between gap-3 bg-[var(--app-soft-panel)] p-4 transition-colors hover:bg-[var(--app-hover)] focus-within:bg-[var(--app-hover)] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white"
                      style={{ backgroundColor: integrationColors[name] }}
                    >
                      {integrationIcons[name]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{name}</h3>
                        <OwnedBadge variant={connected ? "default" : "outline"}>
                          {connected ? "Connected" : "Not connected"}
                        </OwnedBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {connected
                          ? account || "Connected locally"
                          : integrationDescriptions[name]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {connected ? (
                      <OwnedButton
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Disconnect ${name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDisconnectTarget(name)}
                      >
                        <Unplug aria-hidden="true" />
                        Disconnect
                      </OwnedButton>
                    ) : null}
                    <OwnedButton
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`${connected ? "Manage" : "Connect"} ${name}`}
                      onClick={() => openIntegration(name)}
                    >
                      <Plug aria-hidden="true" />
                      {connected ? "Manage" : "Connect"}
                    </OwnedButton>
                  </div>
                </li>
              );
            })}
          </ul>
          {!visibleIntegrationNames.length ? (
            <PageEmptyState
              title="No matching services"
              description="Try a different search or connection filter."
            />
          ) : null}
        </ContentSection>

        <IntegrationLinkManager
          title="Global Integrations"
          subtitle="Workspace-level service links used across your editing workflow."
          links={settings.integrationLinks}
          emptyTitle="No global integration links"
          emptyBody="Add links to shared folders, calendars, channels, and review spaces your studio uses often."
          onChange={(integrationLinks) => {
            setSettings({ ...settings, integrationLinks });
            notify("Global integration links updated.", "success");
          }}
        />

        <ContentSection
          title="Cloudflare R2 Storage"
          description="Upcoming. Large-file storage through Cloudflare R2 is being prepared for a future release. Project uploads currently use Relay's Convex Storage."
          metadata={
            <Cloud
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          }
          actions={<OwnedBadge variant="secondary">Upcoming</OwnedBadge>}
          bodyMode="flush"
        />

        <ContentSection
          title="Project Integrations"
          description="Project-specific links stay attached to each project record."
          actions={
            <OwnedBadge
              variant={visibleProjectLinks.length ? "default" : "secondary"}
            >
              <Link2 aria-hidden="true" />
              {visibleProjectLinks.length} projects linked
            </OwnedBadge>
          }
        >
          {visibleProjectLinks.length ? (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border shadow-[var(--app-shadow-1)]">
              {visibleProjectLinks.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-col justify-between gap-3 bg-[var(--app-soft-panel)] p-4 transition-colors hover:bg-[var(--app-hover)] focus-within:bg-[var(--app-hover)] md:flex-row md:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {configuredIntegrationCount(project.integrationLinks)}{" "}
                      saved{" "}
                      {configuredIntegrationCount(project.integrationLinks) ===
                      1
                        ? "link"
                        : "links"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {integrationServices.map((service) =>
                        hasIntegrationLink(
                          project.integrationLinks?.[service.id]
                        ) ? (
                          <OwnedBadge key={service.id} variant="secondary">
                            {service.shortName}
                          </OwnedBadge>
                        ) : null
                      )}
                    </div>
                  </div>
                  <OwnedButton
                    type="button"
                    variant="outline"
                    aria-label={`Manage integration links for ${project.title}`}
                    onClick={() => onEditProject(project)}
                  >
                    <Pencil aria-hidden="true" />
                    Manage Project Links
                  </OwnedButton>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border">
              <EmptyPanel
                title={
                  projectLinks.length
                    ? "No matching project links"
                    : "No project integration links"
                }
                body={
                  projectLinks.length
                    ? "Try a different search term."
                    : "Open a project and add service links for folders, review pages, channels, or calendar events."
                }
              />
            </div>
          )}
        </ContentSection>
      </PageContent>

      <OwnedDialog
        open={Boolean(integrationDialog)}
        onOpenChange={(open) => {
          if (!open) closeIntegrationDialog();
        }}
      >
        <OwnedDialogContent className="sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {integrationDialog
                ? `${integrationDialog.config.connected ? "Manage" : "Connect"} ${integrationDialog.name}`
                : "Connect integration"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              {integrationDialog
                ? integrationDescriptions[integrationDialog.name]
                : "Configure your locally saved integration details."}
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveIntegration();
            }}
          >
            <FieldLayout
              label="Account email or name"
              required
              error={configError || undefined}
            >
              <OwnedInput
                value={integrationDialog?.config.account ?? ""}
                onChange={(event) =>
                  updateIntegrationConfig({ account: event.target.value })
                }
                autoFocus
                placeholder="you@example.com"
              />
            </FieldLayout>
            {integrationDialog?.name === "Google Drive" ||
            integrationDialog?.name === "Dropbox" ||
            integrationDialog?.name === "Frame.io" ? (
              <FieldLayout
                label={
                  integrationDialog.name === "Frame.io"
                    ? "Project folder"
                    : "Folder path"
                }
              >
                <OwnedInput
                  value={integrationDialog.config.folder}
                  onChange={(event) =>
                    updateIntegrationConfig({ folder: event.target.value })
                  }
                  placeholder={
                    integrationDialog.name === "Google Drive"
                      ? "/Projects/Video Edits"
                      : "/Deliverables"
                  }
                />
              </FieldLayout>
            ) : null}
            {integrationDialog?.name === "Slack" ||
            integrationDialog?.name === "Frame.io" ? (
              <FieldLayout label="Workspace name">
                <OwnedInput
                  value={integrationDialog.config.workspace}
                  onChange={(event) =>
                    updateIntegrationConfig({ workspace: event.target.value })
                  }
                  placeholder="Relay Workspace"
                />
              </FieldLayout>
            ) : null}
            {integrationDialog?.name === "Slack" ? (
              <>
                <FieldLayout label="Channel">
                  <OwnedInput
                    value={integrationDialog.config.channel}
                    onChange={(event) =>
                      updateIntegrationConfig({ channel: event.target.value })
                    }
                    placeholder="#project-updates"
                  />
                </FieldLayout>
                <FieldLayout
                  label="Webhook URL"
                  description="Optional. Stored locally and never called by Relay."
                >
                  <OwnedInput
                    type="url"
                    value={integrationDialog.config.webhookUrl}
                    onChange={(event) =>
                      updateIntegrationConfig({
                        webhookUrl: event.target.value,
                      })
                    }
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </FieldLayout>
              </>
            ) : null}
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={closeIntegrationDialog}
              >
                Cancel
              </OwnedButton>
              <OwnedButton
                type="submit"
                disabled={!integrationDialog?.config.account.trim()}
              >
                <Plug aria-hidden="true" />
                Save Connection
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>

      <OwnedAlertDialog
        open={Boolean(disconnectTarget)}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <OwnedAlertDialogContent>
          <OwnedAlertDialogHeader>
            <OwnedAlertDialogTitle>
              Disconnect {disconnectTarget}?
            </OwnedAlertDialogTitle>
            <OwnedAlertDialogDescription>
              This removes all saved account and configuration details for{" "}
              {disconnectTarget}. You can reconnect it at any time.
            </OwnedAlertDialogDescription>
          </OwnedAlertDialogHeader>
          <OwnedAlertDialogFooter>
            <OwnedAlertDialogCancel>Cancel</OwnedAlertDialogCancel>
            <OwnedAlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDisconnect}
            >
              Disconnect
            </OwnedAlertDialogAction>
          </OwnedAlertDialogFooter>
        </OwnedAlertDialogContent>
      </OwnedAlertDialog>
    </WorkspacePage>
  );
}

export function IntegrationLinkManager({
  title,
  subtitle,
  links,
  emptyTitle,
  emptyBody,
  onChange,
}: {
  title: string;
  subtitle: string;
  links: IntegrationLinks | undefined;
  emptyTitle: string;
  emptyBody: string;
  onChange: (links: IntegrationLinks) => void;
}) {
  const [editing, setEditing] = useState<{
    serviceId: IntegrationServiceId;
    link: IntegrationLink;
  } | null>(null);
  const [error, setError] = useState("");
  const configuredCount = configuredIntegrationCount(links);

  function openEditor(serviceId: IntegrationServiceId) {
    setEditing({
      serviceId,
      link: {
        ...emptyIntegrationLink,
        ...normalizeIntegrationLink(links?.[serviceId]),
      },
    });
    setError("");
  }

  function saveLink() {
    if (!editing) return;
    const link = normalizeIntegrationLink(editing.link);
    if (!isValidIntegrationUrl(link.url)) {
      setError("Enter a valid http or https URL.");
      return;
    }
    onChange({
      ...(links ?? {}),
      [editing.serviceId]: {
        ...link,
        updatedAt: new Date().toISOString(),
      },
    });
    setEditing(null);
    setError("");
  }

  function removeLink(serviceId: IntegrationServiceId) {
    const next: IntegrationLinks = { ...(links ?? {}) };
    delete next[serviceId];
    onChange(next);
  }

  function openLink(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <ContentSection
      title={title}
      description={subtitle}
      actions={
        <OwnedBadge variant={configuredCount ? "default" : "secondary"}>
          <Link2 aria-hidden="true" />
          {configuredCount} configured
        </OwnedBadge>
      }
    >
      {!configuredCount ? (
        <div className="mt-4 rounded-lg border border-dashed border-border">
          <EmptyPanel title={emptyTitle} body={emptyBody} />
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {integrationServices.map((service) => {
          const link = links?.[service.id];
          const linked = hasIntegrationLink(link);
          return (
            <li
              key={service.id}
              className="flex flex-col justify-between gap-3 bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white"
                  style={{ backgroundColor: service.color }}
                >
                  {service.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{service.name}</h3>
                    <OwnedBadge variant={linked ? "default" : "outline"}>
                      {integrationStatusLabel(link)}
                    </OwnedBadge>
                  </div>
                  <p className="mt-1 max-w-xl truncate text-xs text-muted-foreground">
                    {integrationDisplayText(link, service.description)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {linked && link ? (
                  <OwnedButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Open ${service.name} link in a new tab`}
                    onClick={() => openLink(link.url)}
                  >
                    <ExternalLink aria-hidden="true" />
                    Open
                  </OwnedButton>
                ) : null}
                {linked ? (
                  <OwnedButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${service.name} link`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeLink(service.id)}
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </OwnedButton>
                ) : null}
                <OwnedButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${linked ? "Edit" : "Add"} ${service.name} link`}
                  onClick={() => openEditor(service.id)}
                >
                  {linked ? (
                    <Pencil aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {linked ? "Edit" : "Add Link"}
                </OwnedButton>
              </div>
            </li>
          );
        })}
      </ul>

      <OwnedDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setError("");
          }
        }}
      >
        <OwnedDialogContent className="sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {editing
                ? `${hasIntegrationLink(links?.[editing.serviceId]) ? "Edit" : "Add"} ${integrationServices.find((service) => service.id === editing.serviceId)?.name} Link`
                : "Integration Link"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Store a direct link and optional context. Relay will not
              authenticate, browse files, sync data, or call this service.
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveLink();
            }}
          >
            <FieldLayout label="URL" required error={error || undefined}>
              <OwnedInput
                type="url"
                value={editing?.link.url ?? ""}
                onChange={(event) => {
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, url: event.target.value },
                        }
                      : current
                  );
                  setError("");
                }}
                autoFocus
                placeholder="https://..."
              />
            </FieldLayout>
            <FieldLayout label="Label">
              <OwnedInput
                value={editing?.link.label ?? ""}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, label: event.target.value },
                        }
                      : current
                  )
                }
                placeholder="Client review folder"
              />
            </FieldLayout>
            <FieldLayout label="Notes">
              <OwnedTextarea
                value={editing?.link.notes ?? ""}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, notes: event.target.value },
                        }
                      : current
                  )
                }
                placeholder="Optional context for this link"
              />
            </FieldLayout>
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              >
                Cancel
              </OwnedButton>
              <OwnedButton type="submit">
                <Link2 aria-hidden="true" />
                Save Link
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </ContentSection>
  );
}

"use client";

import { useState } from "react";
import type { ResourceLink, WorkItem } from "@/lib/types";
import { isValidIntegrationUrl } from "@/lib/integrations";
import {
  ContentSection,
  MetricItem,
  MetricStrip,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";
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
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { createId, formatDate } from "@/features/routes/utils/date-utils";
import type { ToastState } from "@/features/routes/shared/route-types";

const resourceCategories = [
  "Asset Folder",
  "Raw Footage",
  "Music / SFX",
  "Brand Assets",
  "Review Link",
  "Reference",
  "Other",
];

export function ResourcesDesignPage({
  resources,
  projects,
  setResources,
  notify,
}: {
  resources: ResourceLink[];
  projects: WorkItem[];
  setResources: React.Dispatch<React.SetStateAction<ResourceLink[]>>;
  notify: (message: string, tone?: ToastState["tone"]) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ResourceLink>(() => emptyResourceForm());
  const [error, setError] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const sortedResources = [...resources].sort(
    (a, b) =>
      Date.parse(b.updatedAt || b.createdAt) -
      Date.parse(a.updatedAt || a.createdAt)
  );
  const visibleResources = sortedResources.filter((resource) => {
    const query = resourceSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        resource.title,
        resource.url,
        resource.notes,
        resource.category,
        projectName(resource.projectId),
      ].some((value) => value.toLowerCase().includes(query));
    const matchesCategory =
      resourceCategory === "all" || resource.category === resourceCategory;
    return matchesSearch && matchesCategory;
  });
  const linkedToProjects = resources.filter(
    (resource) => resource.projectId
  ).length;
  const projectOptions = ["General", ...projects.map((project) => project.id)];
  const projectLabels = Object.fromEntries(
    projects.map((project) => [project.id, project.title])
  );
  const projectSelectValue = form.projectId || "General";
  const safeProjectOptions =
    projectSelectValue && !projectOptions.includes(projectSelectValue)
      ? [projectSelectValue, ...projectOptions]
      : projectOptions;
  const safeProjectLabels =
    projectSelectValue &&
    !projectLabels[projectSelectValue] &&
    projectSelectValue !== "General"
      ? { ...projectLabels, [projectSelectValue]: "Deleted project" }
      : projectLabels;

  function emptyResourceForm(): ResourceLink {
    const now = new Date().toISOString();
    return {
      id: "",
      title: "",
      url: "",
      category: "Asset Folder",
      projectId: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  function openNewResource() {
    setEditingId("");
    setForm(emptyResourceForm());
    setError("");
    setDialogOpen(true);
  }

  function openEditResource(resource: ResourceLink) {
    setEditingId(resource.id);
    setForm(resource);
    setError("");
    setDialogOpen(true);
  }

  function saveResource() {
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) {
      setError("Resource title is required.");
      return;
    }
    if (!isValidIntegrationUrl(url)) {
      setError("Enter a valid http or https URL.");
      return;
    }

    const now = new Date().toISOString();
    const payload: ResourceLink = {
      ...form,
      id: editingId || createId(),
      title,
      url,
      category: form.category.trim() || "Other",
      projectId: form.projectId,
      notes: form.notes.trim(),
      createdAt: form.createdAt || now,
      updatedAt: now,
    };
    setResources((current) =>
      editingId
        ? current.map((resource) =>
            resource.id === editingId ? payload : resource
          )
        : [payload, ...current]
    );
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyResourceForm());
    notify(editingId ? "Resource updated." : "Resource added.");
  }

  function removeResource(id: string) {
    setResources((current) => current.filter((resource) => resource.id !== id));
    notify("Resource removed.", "warning");
  }

  function openResource(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function projectName(projectId: string) {
    return projects.find((project) => project.id === projectId)?.title ?? "";
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        eyebrow="Workspace / Resources"
        title="Resources"
        description="Store asset folders, reference links, review pages, and handoff resources."
        actions={
          <OwnedButton
            type="button"
            variant="outline"
            onClick={openNewResource}
          >
            <Plus aria-hidden="true" />
            New Resource
          </OwnedButton>
        }
      />

      <PageContent className="space-y-5">
        <MetricStrip columns={3}>
          <MetricItem
            label="Resources"
            value={resources.length}
            supporting="Saved asset and reference links"
          />
          <MetricItem
            label="Project Linked"
            value={linkedToProjects}
            supporting="Attached to tracked projects"
          />
          <MetricItem
            label="Categories"
            value={new Set(resources.map((resource) => resource.category)).size}
            supporting="Resource groups in use"
          />
        </MetricStrip>

        <PageToolbar
          data-family-toolbar="resources"
          primary={
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Link2
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-muted)]"
              />
              <OwnedInput
                aria-label="Search resources"
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder="Search resources, links, or projects..."
                className="h-10 bg-[var(--app-control)] pl-9 shadow-none"
              />
            </div>
          }
          secondary={
            <OwnedSelect
              value={resourceCategory}
              onValueChange={setResourceCategory}
            >
              <OwnedSelectTrigger
                aria-label="Filter resources by category"
                className="h-10 w-full sm:w-44"
              >
                <OwnedSelectValue placeholder="All categories" />
              </OwnedSelectTrigger>
              <OwnedSelectContent position="popper">
                <OwnedSelectItem value="all">All categories</OwnedSelectItem>
                {resourceCategories.map((category) => (
                  <OwnedSelectItem key={category} value={category}>
                    {category}
                  </OwnedSelectItem>
                ))}
              </OwnedSelectContent>
            </OwnedSelect>
          }
        />

        <ContentSection
          title="Resource Library"
          description={
            resourceSearch || resourceCategory !== "all"
              ? `${visibleResources.length} matching resources`
              : "Manual links for now; this can later map to cloud storage APIs or OAuth providers."
          }
          metadata={
            <OwnedBadge
              variant="secondary"
              className="self-start rounded-md bg-primary/15 text-primary sm:self-auto"
            >
              {resources.length} saved
            </OwnedBadge>
          }
          bodyMode="flush"
        >
          <div className="divide-y divide-border">
            {visibleResources.length ? (
              visibleResources.map((resource) => (
                <article
                  key={resource.id}
                  className="grid items-start gap-4 px-4 py-4 transition-colors hover:bg-[var(--app-soft-panel)] focus-within:bg-[var(--app-soft-panel)] lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_140px]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-accent)]"
                      aria-hidden="true"
                    >
                      <Link2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {resource.title}
                        </h3>
                        <OwnedBadge
                          variant="secondary"
                          className="rounded-md text-[11px] font-medium"
                        >
                          {resource.category}
                        </OwnedBadge>
                      </div>
                      <p className="truncate text-xs text-[var(--app-muted)]">
                        {resource.url}
                      </p>
                      {resource.notes ? (
                        <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">
                          {resource.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground lg:text-foreground">
                    {resource.projectId
                      ? projectName(resource.projectId) || "Linked project"
                      : "General"}
                  </p>
                  <time
                    className="truncate text-xs text-[var(--app-muted)]"
                    dateTime={resource.updatedAt || resource.createdAt}
                  >
                    Updated{" "}
                    {formatDate(
                      (resource.updatedAt || resource.createdAt).slice(0, 10)
                    )}
                  </time>
                  <div
                    className="flex gap-1 lg:justify-end"
                    aria-label={`${resource.title} actions`}
                  >
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${resource.title}`}
                      title="Open resource"
                      onClick={() => openResource(resource.url)}
                      className="text-primary"
                    >
                      <ExternalLink aria-hidden="true" />
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${resource.title}`}
                      title="Edit resource"
                      onClick={() => openEditResource(resource)}
                    >
                      <Pencil aria-hidden="true" />
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${resource.title}`}
                      title="Delete resource"
                      onClick={() => removeResource(resource.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" />
                    </OwnedButton>
                  </div>
                </article>
              ))
            ) : (
              <PageEmptyState
                title={
                  resources.length
                    ? "No matching resources"
                    : "No resources yet"
                }
                description={
                  resources.length
                    ? "Try a different search or category filter."
                    : "Add asset folders, reference docs, cloud links, review URLs, or handoff resources."
                }
              />
            )}
          </div>
        </ContentSection>
      </PageContent>

      <OwnedDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <OwnedDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {editingId ? "Edit Resource" : "New Resource"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Save a labeled link and optionally attach it to a project.
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveResource();
            }}
          >
            <FieldLayout
              label="Resource title"
              required
              error={
                error === "Resource title is required." ? error : undefined
              }
            >
              <OwnedInput
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value });
                  setError("");
                }}
              />
            </FieldLayout>
            <FieldLayout
              label="URL"
              required
              error={
                error === "Enter a valid http or https URL." ? error : undefined
              }
            >
              <OwnedInput
                type="url"
                inputMode="url"
                value={form.url}
                placeholder="https://..."
                onChange={(event) => {
                  setForm({ ...form, url: event.target.value });
                  setError("");
                }}
              />
            </FieldLayout>
            <div className="grid gap-4 sm:grid-cols-2">
              <OwnedSelect
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <FieldLayout label="Category">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue />
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  {resourceCategories.map((category) => (
                    <OwnedSelectItem key={category} value={category}>
                      {category}
                    </OwnedSelectItem>
                  ))}
                </OwnedSelectContent>
              </OwnedSelect>
              <OwnedSelect
                value={projectSelectValue}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    projectId: value === "General" ? "" : value,
                  })
                }
              >
                <FieldLayout label="Project">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue>
                      {safeProjectLabels[projectSelectValue] ??
                        projectSelectValue}
                    </OwnedSelectValue>
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  {safeProjectOptions.map((projectId) => (
                    <OwnedSelectItem key={projectId} value={projectId}>
                      {safeProjectLabels[projectId] ?? projectId}
                    </OwnedSelectItem>
                  ))}
                </OwnedSelectContent>
              </OwnedSelect>
            </div>
            <FieldLayout label="Notes">
              <OwnedTextarea
                value={form.notes}
                rows={3}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </FieldLayout>
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </OwnedButton>
              <OwnedButton type="submit">Save Resource</OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </WorkspacePage>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { SavedProjectTemplate } from "@/lib/types";
import {
  validateWorkflowStages,
  workflowStagesFromLabels,
} from "@/lib/workflow-templates";
import type { FileCategory, FileStatus } from "@/lib/domain-values";
import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/lib/project-templates";
import {
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { useData } from "@/lib/data-context";
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
  Building2,
  Copy,
  FerrisWheel,
  Film,
  Megaphone,
  Microphone,
  Pencil,
  Plus,
  Repeat,
  ShoppingBag,
  Trash2,
  Video,
  Wedding,
} from "@/components/icons";
import { InstagramMark, YoutubeMark } from "@/components/brand-marks";

/**
 * The mark shown on a template card: the platform's own colour mark when the
 * template is for one (YouTube, Instagram), otherwise a line icon for the
 * kind of work, read from its name and project type.
 */
function templateMark(template: { name: string; projectType: string }) {
  const text = `${template.name} ${template.projectType}`.toLowerCase();
  if (text.includes("youtube") || text.includes("long-form"))
    return YoutubeMark;
  if (text.includes("instagram") || text.includes("reel")) return InstagramMark;
  if (text.includes("wedding")) return Wedding;
  if (text.includes("podcast")) return Microphone;
  if (text.includes("corporate") || text.includes("event")) return Building2;
  if (text.includes("product") || text.includes("commercial"))
    return ShoppingBag;
  if (text.includes("theme park")) return FerrisWheel;
  if (text.includes("campaign") || text.includes("social")) return Megaphone;
  if (text.includes("retainer")) return Repeat;
  if (text.includes("film")) return Film;
  return Video;
}

type TemplateFormState = {
  id: string;
  name: string;
  description: string;
  projectType: string;
  workType: "channel" | "freelance";
  durationDays: number;
  workflowStagesText: string;
  deliverablesText: string;
  checklistText: string;
};

const emptyTemplateForm: TemplateFormState = {
  id: "",
  name: "",
  description: "",
  projectType: "",
  workType: "freelance",
  durationDays: 7,
  workflowStagesText:
    "Planned\nEditing\nClient Review\nRevisions\nApproved\nDelivered",
  deliverablesText: "Final master",
  checklistText: "Confirm brief\nCheck export settings",
};

function templateToForm(template: ProjectTemplate): TemplateFormState {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    projectType: template.projectType,
    workType: template.workType,
    durationDays: template.durationDays,
    workflowStagesText: template.workflowStages
      .map((stage) => stage.label)
      .join("\n"),
    deliverablesText: template.deliverables
      .map((item) => item.title)
      .join("\n"),
    checklistText: template.checklistItems.join("\n"),
  };
}

function linesFromText(value: string, limit: number) {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function customTemplateFromForm(
  form: TemplateFormState,
  existing?: SavedProjectTemplate
): SavedProjectTemplate {
  const name = form.name.trim().slice(0, 80) || "Custom template";
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "template";
  const id = form.id || `custom-${slug}-${Date.now().toString(36)}`;
  const deliverableTitles = linesFromText(form.deliverablesText, 12);
  return {
    id,
    name,
    description:
      form.description.trim().slice(0, 220) ||
      "Reusable workflow for recurring client work.",
    projectType: form.projectType.trim().slice(0, 80) || "Custom project",
    workType: form.workType,
    durationDays: Math.max(
      1,
      Math.min(120, Math.floor(Number(form.durationDays) || 7))
    ),
    workflowStages: workflowStagesFromLabels(
      linesFromText(form.workflowStagesText, 12),
      existing?.workflowStages
    ),
    deliverables: (deliverableTitles.length
      ? deliverableTitles
      : ["Final master"]
    ).map((title) => ({
      title: title.slice(0, 120),
      category: "Deliverable" satisfies FileCategory,
      initialStatus: "draft" satisfies FileStatus,
    })),
    checklistItems: linesFromText(form.checklistText, 20),
    custom: true,
    updatedAt: new Date().toISOString(),
  };
}

export function TemplatesDesignPage({
  onUseBlank,
  onUseTemplate,
  canManageTemplates,
  customTemplatesLocked = false,
}: {
  onUseBlank: () => void;
  onUseTemplate: (template: ProjectTemplate) => void;
  canManageTemplates: boolean;
  customTemplatesLocked?: boolean;
}) {
  const { items, settings, setSettings } = useData();
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(emptyTemplateForm);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const customTemplates = settings.customProjectTemplates ?? [];
  const templates = useMemo(
    () => [...PROJECT_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  function openBuilder(template?: ProjectTemplate) {
    if (customTemplatesLocked) return;
    setTemplateError("");
    setTemplateForm(
      template ? templateToForm(template) : { ...emptyTemplateForm, id: "" }
    );
    setBuilderOpen(true);
  }

  function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customTemplatesLocked) return;
    if (!templateForm.name.trim()) return;
    const previousTemplate = customTemplates.find(
      (template) => template.id === templateForm.id
    );
    const nextStages = workflowStagesFromLabels(
      linesFromText(templateForm.workflowStagesText, 12),
      previousTemplate?.workflowStages
    );
    const stageError = validateWorkflowStages(nextStages);
    if (stageError) {
      setTemplateError(stageError);
      return;
    }

    const nextTemplate = customTemplateFromForm(templateForm, previousTemplate);
    nextTemplate.archived = previousTemplate?.archived ?? false;
    if (
      previousTemplate &&
      items.some((item) => item.templateId === previousTemplate.id)
    ) {
      const nextStageIds = new Set(
        nextTemplate.workflowStages.map((stage) => stage.id)
      );
      const removedStage = previousTemplate.workflowStages.find(
        (stage) => !nextStageIds.has(stage.id)
      );
      if (removedStage) {
        setTemplateError(
          `Reassign Projects before removing the ${removedStage.label} stage.`
        );
        return;
      }
    }
    setSettings((current) => {
      const currentTemplates = current.customProjectTemplates ?? [];
      const exists = currentTemplates.some(
        (template) => template.id === nextTemplate.id
      );
      return {
        ...current,
        customProjectTemplates: exists
          ? currentTemplates.map((template) =>
              template.id === nextTemplate.id ? nextTemplate : template
            )
          : [nextTemplate, ...currentTemplates].slice(0, 24),
      };
    });
    setBuilderOpen(false);
  }

  function deleteTemplate(templateId: string) {
    if (customTemplatesLocked) return;
    if (items.some((item) => item.templateId === templateId)) {
      setTemplateError(
        "This template is in use. Reassign its Projects before deleting it."
      );
      return;
    }
    setSettings((current) => ({
      ...current,
      customProjectTemplates: (current.customProjectTemplates ?? []).filter(
        (template) => template.id !== templateId
      ),
    }));
  }

  function copyTemplate(template: ProjectTemplate) {
    if (customTemplatesLocked) return;
    const copy = {
      ...template,
      id: `custom-copy-${Date.now().toString(36)}`,
      name: `${template.name} Copy`,
      workflowStages: template.workflowStages.map((stage) => ({ ...stage })),
      deliverables: template.deliverables.map((item) => ({ ...item })),
      checklistItems: [...template.checklistItems],
      custom: true,
      updatedAt: new Date().toISOString(),
    };
    setSettings((current) => ({
      ...current,
      customProjectTemplates: [copy, ...current.customProjectTemplates].slice(
        0,
        24
      ),
    }));
  }

  function archiveTemplate(template: SavedProjectTemplate) {
    if (customTemplatesLocked) return;
    setSettings((current) => ({
      ...current,
      customProjectTemplates: current.customProjectTemplates.map((item) =>
        item.id === template.id ? { ...item, archived: !item.archived } : item
      ),
    }));
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        title="Templates"
        description="Start with a practical editing workflow, or save your own recurring setup for the next project."
        actions={
          <div className="flex items-center gap-2">
            <OwnedButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openBuilder()}
              disabled={!canManageTemplates || customTemplatesLocked}
            >
              <Plus aria-hidden="true" />
              New template
            </OwnedButton>
            <OwnedButton type="button" size="sm" onClick={onUseBlank}>
              Blank project
            </OwnedButton>
          </div>
        }
      />
      <PageContent>
        {templateError && !builderOpen ? (
          <p
            role="alert"
            className="rounded-frame px-3 py-2 text-fail-text shadow-[0_0_0_1px_var(--fail-line)] type-body-sm"
          >
            {templateError}
          </p>
        ) : null}
        {customTemplatesLocked ? (
          <CapabilityUpgradePrompt capability="customWorkflowTemplates" />
        ) : null}
        <section aria-label="Project templates" className="grid gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-text-1 type-label">Template library</h2>
            <span className="text-text-3 type-label-sm data">
              {templates.length}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {templates.map((template) => {
              const Mark = templateMark(template);
              return (
                <article
                  key={template.id}
                  data-slot="template-card"
                  className="group flex min-w-0 flex-col gap-4 rounded-frame bg-well p-4 text-text-1 transition-colors duration-(--dur-fast) ease-(--ease-step) hover:bg-[color-mix(in_oklch,var(--surface-card),var(--ink)_4%)]"
                >
                  <div className="min-w-0">
                    <header className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-10 shrink-0 place-items-center rounded-soft bg-page text-text-1 shadow-[0_0_0_1px_var(--line-frame)] [&_svg]:size-5 [&_svg[data-brand-mark]]:size-6"
                      >
                        <Mark />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 truncate type-heading-xs">
                            {template.name}
                          </h3>
                          <OwnedBadge variant="secondary">
                            {template.archived
                              ? "Archived"
                              : template.custom
                                ? "Custom"
                                : "Built-in"}
                          </OwnedBadge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-text-2 type-body-sm">
                          {template.description}
                        </p>
                      </div>
                    </header>

                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 type-label-sm">
                      <div>
                        <dt className="text-text-2 type-label-sm">
                          Project type
                        </dt>
                        <dd className="mt-0.5 text-text-1">
                          {template.projectType}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-text-2 type-label-sm">
                          Setup time
                        </dt>
                        <dd className="mt-0.5 text-text-1 data">
                          {template.durationDays} days
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-muted-foreground type-label-sm">
                          Workflow preview
                        </h3>
                        <span className="font-mono text-text-2 type-label-sm">
                          {template.workflowStages.length} stages
                        </span>
                      </div>
                      <div
                        className="mt-2 flex flex-wrap items-center gap-1.5"
                        aria-label={`${template.name} workflow stages`}
                        role="list"
                      >
                        {(template.workflowStages.length
                          ? template.workflowStages
                          : [
                              {
                                id: "empty",
                                label: "Add stages after creating the project",
                                purpose: "planned" as const,
                              },
                            ]
                        )
                          .slice(0, 4)
                          .map((stage, index) => (
                            <span
                              key={`${template.id}-${stage.id}-${index}`}
                              className="inline-flex items-center gap-1.5"
                            >
                              <span
                                role="listitem"
                                className="rounded-inner bg-tile px-1.5 py-0.5 text-text-1 type-label-sm"
                              >
                                {stage.label}
                              </span>
                              {index <
                              Math.min(template.workflowStages.length, 4) -
                                1 ? (
                                <span
                                  aria-hidden="true"
                                  className="text-text-2"
                                >
                                  →
                                </span>
                              ) : null}
                            </span>
                          ))}
                        {template.workflowStages.length > 4 ? (
                          <span className="text-text-2 type-label-sm">
                            +{template.workflowStages.length - 4}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 flex gap-3 text-text-3 type-label-sm">
                        <span>{template.deliverables.length} deliverables</span>
                        <span>
                          {template.checklistItems.length} checklist items
                        </span>
                      </p>
                    </div>
                  </div>

                  <footer className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <OwnedButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onUseTemplate(template)}
                      disabled={
                        template.archived ||
                        (customTemplatesLocked && template.custom)
                      }
                    >
                      Use template
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Copy ${template.name} template`}
                      onClick={() => copyTemplate(template)}
                      disabled={!canManageTemplates || customTemplatesLocked}
                    >
                      <Copy aria-hidden="true" />
                      Copy
                    </OwnedButton>
                    {template.custom && canManageTemplates ? (
                      <div className="flex items-center gap-1">
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${template.name} template`}
                          onClick={() => openBuilder(template)}
                          disabled={customTemplatesLocked}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </OwnedButton>
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => archiveTemplate(template)}
                          disabled={customTemplatesLocked}
                        >
                          {template.archived ? "Restore" : "Archive"}
                        </OwnedButton>
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${template.name} template`}
                          onClick={() => deleteTemplate(template.id)}
                          disabled={customTemplatesLocked}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </OwnedButton>
                      </div>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      </PageContent>

      <OwnedDialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <OwnedDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-3xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {templateForm.id ? "Edit template" : "New template"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Save a reusable project setup. Enter one workflow stage,
              deliverable, or checklist item per line.
            </OwnedDialogDescription>
          </OwnedDialogHeader>

          <form className="grid gap-5" onSubmit={saveTemplate}>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLayout label="Template name" required>
                <OwnedInput
                  value={templateForm.name}
                  maxLength={80}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      name: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Project type">
                <OwnedInput
                  value={templateForm.projectType}
                  maxLength={80}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      projectType: event.target.value,
                    })
                  }
                />
              </FieldLayout>
            </div>

            <FieldLayout label="Description">
              <OwnedInput
                value={templateForm.description}
                maxLength={220}
                onChange={(event) =>
                  setTemplateForm({
                    ...templateForm,
                    description: event.target.value,
                  })
                }
              />
            </FieldLayout>

            <div className="grid gap-4 md:grid-cols-2">
              <OwnedSelect
                value={templateForm.workType}
                onValueChange={(value) =>
                  setTemplateForm({
                    ...templateForm,
                    workType: value === "channel" ? "channel" : "freelance",
                  })
                }
              >
                <FieldLayout label="Work type">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue />
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  <OwnedSelectItem value="freelance">Freelance</OwnedSelectItem>
                  <OwnedSelectItem value="channel">Channel</OwnedSelectItem>
                </OwnedSelectContent>
              </OwnedSelect>

              <FieldLayout label="Duration days">
                <OwnedInput
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={templateForm.durationDays}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      durationDays: Number(event.target.value),
                    })
                  }
                />
              </FieldLayout>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FieldLayout label="Workflow stages" description="One per line">
                <OwnedTextarea
                  value={templateForm.workflowStagesText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      workflowStagesText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Deliverables" description="One per line">
                <OwnedTextarea
                  value={templateForm.deliverablesText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      deliverablesText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Checklist" description="One per line">
                <OwnedTextarea
                  value={templateForm.checklistText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      checklistText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
            </div>

            {templateError ? (
              <p role="alert" className="text-destructive type-body">
                {templateError}
              </p>
            ) : null}
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => setBuilderOpen(false)}
              >
                Cancel
              </OwnedButton>
              <OwnedButton
                type="submit"
                disabled={customTemplatesLocked || !templateForm.name.trim()}
              >
                Save template
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </WorkspacePage>
  );
}

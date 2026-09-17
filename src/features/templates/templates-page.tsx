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
  ContentSection,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { CapabilityUpgradePrompt } from "@/components/subscription-plans";
import { useTemplateController } from "./template-controller";
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
import { Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";

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
      category: "Deliverable" as FileCategory,
      initialStatus: "draft" as FileStatus,
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
  const { items, settings, setSettings } = useTemplateController();
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
        eyebrow="Workspace / Templates"
        title="Templates"
        description="Start with a practical editing workflow, or save your own recurring setup for the next project."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <OwnedButton
              type="button"
              variant="outline"
              onClick={() => openBuilder()}
              disabled={!canManageTemplates || customTemplatesLocked}
            >
              <Plus aria-hidden="true" />
              Custom Template
            </OwnedButton>
            <OwnedButton type="button" variant="outline" onClick={onUseBlank}>
              <Plus aria-hidden="true" />
              Blank Project
            </OwnedButton>
          </div>
        }
      />
      <PageContent className="space-y-5">
        {templateError && !builderOpen ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {templateError}
          </p>
        ) : null}
        {customTemplatesLocked ? (
          <CapabilityUpgradePrompt capability="customWorkflowTemplates" />
        ) : null}
        <ContentSection
          title="Template library"
          metadata={
            <OwnedBadge variant="secondary">
              {templates.length} templates
            </OwnedBadge>
          }
          aria-label="Project templates"
          bodyClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {templates.map((template) => (
            <article
              key={template.id}
              data-slot="template-card"
              className="group flex min-h-[250px] flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-4 text-foreground shadow-[var(--app-shadow-1)] transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--app-strong-border)] hover:bg-[var(--app-hover)] hover:shadow-[var(--app-shadow-2)] focus-within:border-[var(--app-accent)]"
            >
              <div>
                <header className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">
                        {template.name}
                      </h2>
                      <OwnedBadge
                        variant="secondary"
                        className="rounded-md text-[10px] uppercase tracking-wide"
                      >
                        {template.archived
                          ? "Archived"
                          : template.custom
                            ? "Custom"
                            : "Built-in"}
                      </OwnedBadge>
                    </div>
                    <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-accent)]">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                </header>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--app-border)] py-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Project type
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--app-highlight)]">
                      {template.projectType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Setup time
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {template.durationDays} days
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      Workflow preview
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--app-muted)]">
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
                            className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1 text-[11px] text-foreground"
                          >
                            {stage.label}
                          </span>
                          {index <
                          Math.min(template.workflowStages.length, 4) - 1 ? (
                            <span
                              aria-hidden="true"
                              className="text-[var(--app-muted)]"
                            >
                              →
                            </span>
                          ) : null}
                        </span>
                      ))}
                    {template.workflowStages.length > 4 ? (
                      <span className="text-[11px] text-[var(--app-muted)]">
                        +{template.workflowStages.length - 4}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {template.deliverables.length} deliverables ·{" "}
                    {template.checklistItems.length} checklist items
                  </p>
                </div>
              </div>

              <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <OwnedButton
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => onUseTemplate(template)}
                  disabled={
                    template.archived ||
                    (customTemplatesLocked && template.custom)
                  }
                >
                  Use template
                  <Plus aria-hidden="true" />
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
          ))}
        </ContentSection>
      </PageContent>

      <OwnedDialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <OwnedDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-3xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {templateForm.id ? "Edit Custom Template" : "New Custom Template"}
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
                    workType: value as "channel" | "freelance",
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
              <p role="alert" className="text-sm text-destructive">
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
                Save Template
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </WorkspacePage>
  );
}

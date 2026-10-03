"use client";

import { useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  History,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { WorkItem } from "@/lib/types";
import type { FileCategory } from "@/lib/domain-values";
import { useProjectOutputs } from "@/lib/project-output-data";
import { useInternalMediaVersionComments } from "@/features/media-version-comments/media-version-comments-data";
import { MediaVersionComments } from "./media-version-comments";
import type {
  ProjectOutput,
  ProjectOutputReviewState,
} from "@/features/project-outputs/project-output-domain";
import { ContentSection, PageEmptyState } from "./workspace-page";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { FieldLayout } from "./ui/field-layout";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const reviewStates: Array<{ value: ProjectOutputReviewState; label: string }> =
  [
    { value: "draft", label: "Draft" },
    { value: "sent_to_client", label: "Sent to Client" },
    { value: "changes_requested", label: "Changes Requested" },
    { value: "approved", label: "Approved" },
    { value: "final_delivered", label: "Final Delivered" },
  ];
const categories: FileCategory[] = ["Deliverable", "Reference", "Asset"];
const nextAction: Record<ProjectOutputReviewState, string> = {
  draft: "Add or send a Media Version",
  sent_to_client: "Await Client review",
  changes_requested: "Upload the requested revision",
  approved: "Deliver the approved version",
  final_delivered: "No action needed",
};

type OutputForm = { title: string; category: FileCategory; dueDate: string };
const blankOutput = (): OutputForm => ({
  title: "",
  category: "Deliverable",
  dueDate: "",
});

export function ProjectOutputsPanel({
  project,
  canEdit,
  canResolveComments,
}: {
  project: WorkItem;
  canEdit: boolean;
  canResolveComments: boolean;
}) {
  const data = useProjectOutputs(project, canEdit);
  const reviews = useInternalMediaVersionComments(project.id, true);
  const [outputDialog, setOutputDialog] = useState(false);
  const [editing, setEditing] = useState<ProjectOutput | null>(null);
  const [outputForm, setOutputForm] = useState<OutputForm>(blankOutput);
  const [versionOutput, setVersionOutput] = useState<ProjectOutput | null>(
    null
  );
  const [versionUrl, setVersionUrl] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  function openOutput(output?: ProjectOutput) {
    setEditing(output ?? null);
    setOutputForm(
      output
        ? {
            title: output.title,
            category: output.category,
            dueDate: output.dueDate ?? "",
          }
        : blankOutput()
    );
    setFormError("");
    setOutputDialog(true);
  }

  async function saveOutput() {
    if (!outputForm.title.trim()) {
      setFormError("Project Output title is required.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (editing) {
        await data.updateOutput({
          outputId: editing.id,
          title: outputForm.title,
          category: outputForm.category,
          dueDate: outputForm.dueDate || null,
        });
      } else {
        await data.createOutput({
          id: crypto.randomUUID(),
          projectId: project.id,
          title: outputForm.title,
          category: outputForm.category,
          dueDate: outputForm.dueDate || undefined,
        });
      }
      setOutputDialog(false);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not save the Project Output."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveVersion() {
    if (!versionOutput) return;
    setBusy(true);
    setFormError("");
    try {
      await data.addMediaVersion({
        id: crypto.randomUUID(),
        outputId: versionOutput.id,
        url: versionUrl,
        label: versionLabel,
        notes: versionNotes,
      });
      setVersionOutput(null);
      setVersionUrl("");
      setVersionLabel("");
      setVersionNotes("");
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not add the Media Version."
      );
    } finally {
      setBusy(false);
    }
  }

  async function runOutputAction(action: () => Promise<unknown>) {
    setFormError("");
    try {
      await action();
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not update the Project Output."
      );
    }
  }

  if (data.loading)
    return (
      <p
        role="status"
        className="py-8 text-center text-sm text-muted-foreground"
      >
        Loading Project Outputs...
      </p>
    );

  return (
    <>
      <ContentSection
        titleId="project-outputs-title"
        title="Project Outputs"
        actions={
          canEdit ? (
            <Button
              id="add-project-output"
              type="button"
              size="sm"
              onClick={() => openOutput()}
            >
              <Plus aria-hidden="true" />
              Add Output
            </Button>
          ) : null
        }
      >
        {data.error ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {data.error}
          </p>
        ) : null}

        {data.outputs.length ? (
          <div className="grid gap-8">
            {data.outputs.map((output) => {
              const versions = data.versions
                .filter((version) => version.projectOutputId === output.id)
                .sort(
                  (left, right) => right.versionNumber - left.versionNumber
                );
              const current = data.currentVersion(output);
              const unresolvedOld = data.unresolvedOldComments(output);
              return (
                <article key={output.id}>
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {output.title}
                        </h3>
                        <Badge variant="secondary" className="rounded-sm">
                          {output.category}
                        </Badge>
                        {canEdit ? null : (
                          <Badge variant="secondary" className="rounded-sm">
                            {reviewStates.find(
                              ({ value }) => value === output.reviewState
                            )?.label ?? output.reviewState}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {output.dueDate
                          ? `Due ${output.dueDate}`
                          : "No output due date"}
                        {" · "}Next: {nextAction[output.reviewState]}
                      </p>
                      {unresolvedOld ? (
                        <p className="mt-2 text-[13px] font-medium text-[var(--status-warning)]">
                          {unresolvedOld} unresolved{" "}
                          {unresolvedOld === 1 ? "Comment" : "Comments"} on
                          older versions
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Select
                          value={output.reviewState}
                          onValueChange={(value) => {
                            const state = reviewStates.find(
                              ({ value: stateValue }) => stateValue === value
                            );
                            if (state)
                              void runOutputAction(() =>
                                data.setReviewState(output.id, state.value)
                              );
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`Review state for ${output.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {reviewStates.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setVersionOutput(output);
                            setVersionLabel(`Version ${versions.length + 1}`);
                            setFormError("");
                          }}
                        >
                          <Plus aria-hidden="true" />
                          Media Version
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`More actions for ${output.title}`}
                            >
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => openOutput(output)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                void runOutputAction(() =>
                                  data.archiveOutput(output.id)
                                )
                              }
                            >
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4">
                    {current ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--surface-inset)] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            Current: {current.label}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Version {current.versionNumber} ·{" "}
                            {current.source.provider === "external"
                              ? "External link"
                              : current.source.provider === "youtube"
                                ? "YouTube"
                                : "Vimeo"}
                          </p>
                        </div>
                        <Button asChild type="button" size="sm" variant="ghost">
                          <a
                            href={current.source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open <ExternalLink aria-hidden="true" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-[var(--surface-inset)] px-4 py-3 text-sm text-muted-foreground">
                        No Media Version yet.
                      </p>
                    )}
                    {versions.length > 1 ? (
                      <Collapsible>
                        <CollapsibleTrigger className="group inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-[13px] font-medium text-muted-foreground hover:text-foreground">
                          <ChevronRight
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
                          />
                          <History aria-hidden="true" className="size-4" />
                          Version history ({versions.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <ol className="mt-2 grid gap-0.5">
                            {versions.map((version) => (
                              <li
                                key={version.id}
                                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-[var(--app-hover)]"
                              >
                                <span>
                                  v{version.versionNumber} · {version.label}
                                  {version.id === current?.id
                                    ? " · Current"
                                    : " · Internal"}
                                </span>
                                <a
                                  href={version.source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium hover:underline"
                                >
                                  Open
                                </a>
                              </li>
                            ))}
                          </ol>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : null}
                    <MediaVersionComments
                      versions={versions.map((version) => ({
                        id: version.id,
                        outputId: output.id,
                        versionNumber: version.versionNumber,
                        label: version.label,
                        current: version.id === current?.id,
                      }))}
                      comments={reviews.comments.filter(
                        (comment) => comment.outputId === output.id
                      )}
                      loading={reviews.loading}
                      onResolve={
                        canResolveComments
                          ? async (commentId, resolved) => {
                              await reviews.adapter.setResolved(
                                commentId,
                                resolved
                              );
                            }
                          : undefined
                      }
                      readOnly={!canResolveComments}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <PageEmptyState
            compact
            title="No Project Outputs yet."
            description="Add the first promised result for this Project."
          />
        )}
      </ContentSection>

      <Dialog open={outputDialog} onOpenChange={setOutputDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Project Output" : "Add Project Output"}
            </DialogTitle>
            <DialogDescription>
              One promised result inside this Project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldLayout label="Title" error={formError || undefined}>
              <Input
                value={outputForm.title}
                onChange={(event) =>
                  setOutputForm({ ...outputForm, title: event.target.value })
                }
                autoFocus
              />
            </FieldLayout>
            <FieldLayout label="Category" controlId="project-output-category">
              <Select
                value={outputForm.category}
                onValueChange={(value) => {
                  const category = categories.find(
                    (candidate) => candidate === value
                  );
                  if (category) setOutputForm({ ...outputForm, category });
                }}
              >
                <SelectTrigger id="project-output-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLayout>
            <FieldLayout label="Due date">
              <Input
                type="date"
                value={outputForm.dueDate}
                onChange={(event) =>
                  setOutputForm({ ...outputForm, dueDate: event.target.value })
                }
              />
            </FieldLayout>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOutputDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveOutput()}
            >
              {busy ? "Saving..." : "Save Output"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(versionOutput)}
        onOpenChange={(open) => {
          if (!open) setVersionOutput(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Media Version</DialogTitle>
            <DialogDescription>
              {versionOutput
                ? `Add the next linked version for ${versionOutput.title}.`
                : "Add a linked version."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldLayout
              label="YouTube, Vimeo, or link"
              error={formError || undefined}
            >
              <Input
                type="url"
                value={versionUrl}
                onChange={(event) => setVersionUrl(event.target.value)}
                placeholder="https://"
                autoFocus
              />
            </FieldLayout>
            <FieldLayout label="Version label">
              <Input
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
              />
            </FieldLayout>
            <FieldLayout label="Internal notes">
              <Textarea
                value={versionNotes}
                onChange={(event) => setVersionNotes(event.target.value)}
              />
            </FieldLayout>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVersionOutput(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveVersion()}
            >
              {busy ? "Adding..." : "Add Media Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

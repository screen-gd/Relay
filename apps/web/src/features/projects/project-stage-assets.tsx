"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { Button as OwnedButton } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import { Label as OwnedLabel } from "@/components/ui/label";
import { Skeleton as OwnedSkeleton } from "@/components/ui/skeleton";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import {
  ContentSection,
  PageEmptyState,
  sectionListClassName,
  sectionRowClassName,
} from "@/components/workspace-page";
import { Trash2 } from "@/components/icons";
import { useConfirm } from "@/components/confirm-dialog";
import type { WorkItem } from "@/lib/types";
import { api } from "../../../convex/_generated/api";
import { ProjectSelect } from "./project-select";
import {
  STAGE_ASSET_KINDS,
  useProjectStageAssets,
  type StageAssetKind,
} from "./project-stage-asset-data";

const MAX_STAGE_ASSET_BYTES = 20_000_000;

const STAGE_ASSET_KIND_LABELS: Record<StageAssetKind, string> = {
  brief: "Brief",
  raw_footage: "Raw footage",
  script: "Script",
  brand: "Brand",
  other: "Other",
};

type StageAsset = NonNullable<
  ReturnType<typeof useProjectStageAssets>["assets"]
>[number];

/**
 * The Project's assets grouped by workflow stage, in stage order, with a count
 * per stage. Stage scope is by id, so a renamed stage keeps its assets; a
 * deleted stage leaves its assets under "No stage" instead of removing files.
 */
export function ProjectStageAssets({
  project,
  canEdit,
}: {
  project: WorkItem;
  canEdit: boolean;
}) {
  const confirm = useConfirm();
  const [showArchived, setShowArchived] = useState(false);
  const {
    isAuthenticated,
    isLoading,
    assets,
    addLinkAsset,
    generateUploadUrl,
    addUploadedAsset,
    removeAsset,
    permanentlyDeleteAsset,
    releaseUploadReservation,
    parseStorageId,
  } = useProjectStageAssets(project.id, showArchived);
  const subscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    isAuthenticated ? {} : "skip"
  );
  const canUploadFiles = subscription?.capabilities.fileUploads ?? false;
  const stages = project.workflowStages ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [kind, setKind] = useState<StageAssetKind>("brief");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [clientVisible, setClientVisible] = useState(false);
  const [browserFile, setBrowserFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const groups = [
    ...stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      assets: (assets ?? []).filter(
        (asset) => asset.workflowStageId === stage.id
      ),
    })),
    ...(() => {
      const unassigned = (assets ?? []).filter(
        (asset) =>
          !asset.workflowStageId ||
          !stages.some((stage) => stage.id === asset.workflowStageId)
      );
      return unassigned.length
        ? [{ id: "no-stage", label: "No stage", assets: unassigned }]
        : [];
    })(),
  ];

  function resetForm() {
    setStageId(stages[0]?.id ?? "");
    setKind("brief");
    setTitle("");
    setLinkUrl("");
    setClientVisible(false);
    setBrowserFile(null);
    setError("");
  }

  function openDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function saveAsset() {
    if (!canEdit || !title.trim()) {
      setError("Asset title is required.");
      return;
    }
    let reservationId:
      | Awaited<ReturnType<typeof generateUploadUrl>>["reservationId"]
      | undefined;
    setBusy(true);
    setError("");
    try {
      if (browserFile) {
        if (!canUploadFiles) {
          throw new Error(
            "File uploads require a Creator or Team plan. Links work on every plan."
          );
        }
        if (browserFile.size > MAX_STAGE_ASSET_BYTES) {
          throw new Error("Files must be 20 MB or smaller.");
        }
        const mimeType = browserFile.type || "application/octet-stream";
        const upload = await generateUploadUrl({
          projectId: project.id,
          size: browserFile.size,
        });
        reservationId = upload.reservationId;
        const response = await fetch(upload.url, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: browserFile,
        });
        if (!response.ok) throw new Error("File upload failed.");
        const storageId = parseStorageId(await response.json());
        await addUploadedAsset({
          projectId: project.id,
          workflowStageId: stageId || undefined,
          kind,
          title,
          clientVisible,
          storageId,
          reservationId: upload.reservationId,
          fileName: browserFile.name,
          mimeType,
        });
        reservationId = undefined;
      } else {
        if (!linkUrl.trim()) {
          throw new Error("Enter a link or choose a file.");
        }
        await addLinkAsset({
          projectId: project.id,
          workflowStageId: stageId || undefined,
          kind,
          title,
          clientVisible,
          externalUrl: linkUrl.trim(),
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (caught) {
      if (reservationId) {
        await releaseUploadReservation({ reservationId }).catch(() => null);
      }
      setError(
        caught instanceof Error ? caught.message : "Could not save this asset."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(asset: StageAsset) {
    if (
      !(await confirm({
        title: asset.archived
          ? "Permanently delete this asset?"
          : "Archive this asset?",
        description: asset.archived
          ? asset.provider === "external"
            ? "The asset link is removed permanently. Project Activity is kept. The file stays with its provider."
            : "The uploaded file is deleted and its storage is freed. This cannot be undone. Project Activity is kept."
          : "It is hidden from the stage and client portal. Hosted files still use storage until you delete them permanently.",
        confirmLabel: asset.archived ? "Delete permanently" : "Archive",
        destructive: true,
      }))
    )
      return;
    try {
      setBusy(true);
      setError("");
      if (asset.archived) await permanentlyDeleteAsset({ assetId: asset._id });
      else await removeAsset({ assetId: asset._id });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove this asset."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ContentSection
        titleId="project-stage-assets-title"
        title="Stage assets"
        metadata={
          <span className="text-text-3 type-label-sm data">
            {assets?.length ?? 0}
          </span>
        }
        actions={
          canEdit && isAuthenticated ? (
            <OwnedButton type="button" size="sm" onClick={openDialog}>
              Add asset
            </OwnedButton>
          ) : null
        }
        bodyMode="flush"
      >
        {canEdit && isAuthenticated ? (
          <OwnedLabel className="flex items-center gap-2 px-4 py-3 text-text-2 type-label-sm">
            <OwnedSwitch
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            Show archived assets
          </OwnedLabel>
        ) : null}
        {isLoading ? (
          <div className="grid gap-2 p-4">
            <OwnedSkeleton className="h-10" />
            <OwnedSkeleton className="h-10" />
          </div>
        ) : !isAuthenticated ? (
          <p className="p-4 text-text-2 type-body">
            Sign in to attach assets to stages.
          </p>
        ) : !groups.length ? (
          <PageEmptyState
            compact
            title="No stages yet"
            description="Add workflow stages to this Project before attaching assets."
          />
        ) : (
          <ul className={sectionListClassName}>
            {groups.map((group) => (
              <li key={group.id} className={sectionRowClassName}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-1 type-label">{group.label}</span>
                  <span className="text-text-3 type-label-sm data">
                    {group.assets.length}
                  </span>
                </div>
                {group.assets.length ? (
                  <ul className="mt-2 grid gap-1.5">
                    {group.assets.map((asset) => (
                      <li
                        key={asset._id}
                        className="flex min-w-0 items-center gap-2"
                      >
                        {asset.url ? (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 flex-1 truncate text-text-2 type-label-sm underline-offset-2 hover:text-text-1 hover:underline focus-visible:focus-ring"
                          >
                            {asset.title}
                          </a>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-text-2 type-label-sm">
                            {asset.title}
                          </span>
                        )}
                        <span className="shrink-0 text-text-3 type-label-sm">
                          {STAGE_ASSET_KIND_LABELS[asset.kind]}
                        </span>
                        {asset.archived ? (
                          <span className="text-text-3 type-label-sm">
                            Archived
                          </span>
                        ) : null}
                        {canEdit ? (
                          <OwnedButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${asset.archived ? "Permanently delete" : "Archive"} ${asset.title}`}
                            disabled={busy}
                            onClick={() => void remove(asset)}
                          >
                            <Trash2 aria-hidden="true" />
                          </OwnedButton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {error && !dialogOpen ? (
          <p role="alert" className="px-4 py-3 text-destructive type-body">
            {error}
          </p>
        ) : null}
      </ContentSection>

      <OwnedDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <OwnedDialogContent className="sm:max-w-lg">
          <OwnedDialogHeader>
            <OwnedDialogTitle>Add stage asset</OwnedDialogTitle>
            <OwnedDialogDescription>
              Upload a file or paste a link, then attach it to the stage that
              needs it.
            </OwnedDialogDescription>
          </OwnedDialogHeader>

          <div className="grid gap-4">
            {stages.length ? (
              <ProjectSelect
                label="Stage"
                value={stageId}
                options={stages.map((stage) => stage.id)}
                labels={Object.fromEntries(
                  stages.map((stage) => [stage.id, stage.label])
                )}
                onChange={setStageId}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <ProjectSelect
                label="Kind"
                value={kind}
                options={STAGE_ASSET_KINDS}
                labels={STAGE_ASSET_KIND_LABELS}
                onChange={setKind}
              />
              <FieldLayout label="Title" required>
                <OwnedInput
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </FieldLayout>
            </div>
            {canUploadFiles ? (
              <OwnedButton asChild variant="outline" className="justify-start">
                <OwnedLabel>
                  {browserFile ? browserFile.name : "Choose file"}
                  <OwnedInput
                    className="sr-only"
                    type="file"
                    accept=".pdf,.txt,.md,.markdown,.jpg,.jpeg,.png,.webp"
                    onChange={(event) =>
                      setBrowserFile(event.target.files?.[0] ?? null)
                    }
                  />
                </OwnedLabel>
              </OwnedButton>
            ) : null}
            <FieldLayout label={browserFile ? "Link (optional)" : "Link"}>
              <OwnedInput
                value={linkUrl}
                inputMode="url"
                placeholder="https://"
                onChange={(event) => setLinkUrl(event.target.value)}
              />
            </FieldLayout>
            <div className="grid gap-1">
              <OwnedLabel className="flex items-center gap-2 text-text-2 type-body">
                <OwnedSwitch
                  checked={clientVisible}
                  onCheckedChange={setClientVisible}
                  aria-label="Client visible"
                />
                Client visible
              </OwnedLabel>
              <p className="text-text-3 type-label-sm">
                Visible assets show in the client portal.
              </p>
            </div>
            {!canUploadFiles ? (
              <p className="text-text-2 type-label-sm">
                File uploads need a Creator or Team plan. Links work on every
                plan.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive type-body">
                {error}
              </p>
            ) : null}
          </div>

          <OwnedDialogFooter>
            <OwnedButton
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </OwnedButton>
            <OwnedButton type="button" onClick={saveAsset} disabled={busy}>
              {busy ? "Saving..." : "Save asset"}
            </OwnedButton>
          </OwnedDialogFooter>
        </OwnedDialogContent>
      </OwnedDialog>
    </>
  );
}

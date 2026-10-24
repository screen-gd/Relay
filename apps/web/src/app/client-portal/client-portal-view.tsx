import {
  ReviewVideoPlayer,
  type ReviewPlayer,
} from "@/components/review-video-player";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  FileText,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
} from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicMediaVersionComments } from "@/components/media-version-comments";
import { normalizeMediaUrl } from "@/features/project-outputs/project-output-domain";
import {
  RevisionAllowance,
  readRevisionAllowance,
  type PortalRevisionAllowance,
} from "@/features/client-portals/internal/revision-allowance";
import type { MediaVersionComment } from "@/features/media-version-comments/media-version-comments";
import { parseMediaVersionComments } from "@/features/media-version-comments/media-version-comments-data";
import type { AnnotationShape } from "@/features/media-version-comments/media-version-annotations";
import { FrameAnnotationEditor } from "@/features/media-version-comments/annotation-overlay";
import { trackOptionalEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { RelayBrand } from "@/app/relay-brand";

type PublicSource = {
  provider: "YouTube" | "Vimeo" | "Drive" | "Dropbox" | "Link";
  url: string;
};
type PublicVersion = {
  changelog?: string;
  id: string;
  versionNumber: number;
  label: string;
  createdAt?: string;
  source: PublicSource;
  isCurrent: boolean;
  isLocked: boolean;
  approved: boolean;
  approvedAt: string | null;
  approvedByName: string | null;
};
type PublicApproval = { approvedAt: string; approvedByName: string };
type PublicOutput = {
  id: string;
  title: string;
  reviewState?: string;
  dueDate?: string;
  currentVersion?: PublicVersion;
  versions: PublicVersion[];
};
type PublicFile = {
  id: string;
  title: string;
  description?: string;
  url: string;
  downloadable: boolean;
  fileName: string;
  mimeType: string;
  updatedAt?: string;
};
type PublicStageAssetKind =
  "brief" | "raw_footage" | "script" | "brand" | "other";
type PublicStageAsset = {
  id: string;
  kind: PublicStageAssetKind;
  title: string;
  stageLabel: string;
  url: string;
};
type PublicStageAssetGroup = {
  stageLabel: string;
  assets: PublicStageAsset[];
};
type PublicPortal = {
  title: string;
  clientName?: string;
  editorDisplayName?: string;
  summary?: string;
  notes?: string;
  startDate?: string;
  dueDate?: string;
  stage: string;
  progress: number;
  outputs: PublicOutput[];
  stageAssets: PublicStageAssetGroup[];
  revisions: PortalRevisionAllowance | null;
  branding?: { name: string; accentColor: string };
};
type PublicAccess =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "unpublished" }
  | { kind: "closed" }
  | { kind: "expired" }
  | { kind: "pin-required"; wrongPin: boolean }
  | { kind: "active"; portal: PublicPortal };

const DISPLAY_NAME_KEY = "relay:client-portal-display-name:v1";
const VIEWED_SESSION_KEY = "relay:client-portal-viewed";
const PUBLIC_STAGES = [
  "Planning",
  "In Progress",
  "Review",
  "Approved",
  "Delivered",
];
const reviewLabels: Record<string, string> = {
  draft: "In progress",
  sent_to_client: "Ready for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  final_delivered: "Delivered",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
function safeUrl(value: unknown) {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function readPublicFiles(value: unknown): PublicFile[] {
  if (!isRecord(value) || !Array.isArray(value.files)) return [];
  return value.files.flatMap((item) => {
    if (!isRecord(item)) return [];
    const title = text(item.title);
    const fileName = text(item.fileName);
    const url = safeUrl(item.url);
    if (!title || !fileName || !url) return [];
    return [
      {
        id: text(item.id) ?? fileName,
        title,
        description: text(item.description),
        url,
        downloadable: item.downloadable === true,
        fileName,
        mimeType: text(item.mimeType) ?? "application/octet-stream",
        updatedAt: text(item.updatedAt),
      },
    ];
  });
}

const STAGE_ASSET_KIND_LABELS: Record<PublicStageAssetKind, string> = {
  brief: "Brief",
  raw_footage: "Raw footage",
  script: "Script",
  brand: "Brand",
  other: "Other",
};

function stageAssetKind(value: unknown): PublicStageAssetKind | undefined {
  return value === "brief" ||
    value === "raw_footage" ||
    value === "script" ||
    value === "brand" ||
    value === "other"
    ? value
    : undefined;
}

/** Reads the portal's client-visible stage assets, grouped in workflow order. */
function readStageAssets(value: unknown): PublicStageAssetGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => {
    if (!isRecord(group)) return [];
    const entries: unknown[] = Array.isArray(group.assets) ? group.assets : [];
    const groupLabel = text(group.stageLabel);
    const assets = entries.flatMap((item) => {
      if (!isRecord(item)) return [];
      const title = text(item.title);
      const url = safeUrl(item.url);
      const kind = stageAssetKind(item.kind);
      const stageLabel = text(item.stageLabel) ?? groupLabel;
      if (!title || !url || !kind || !stageLabel) return [];
      return [
        {
          id: text(item.id) ?? `${stageLabel}-${title}`,
          kind,
          title,
          stageLabel,
          url,
        },
      ];
    });
    const stageLabel = groupLabel ?? assets[0]?.stageLabel;
    return stageLabel && assets.length ? [{ stageLabel, assets }] : [];
  });
}

function fileKind(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "text/x-markdown"
  )
    return "Text";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Image";
  return "File";
}

export function readPublicPortalAccess(value: unknown): PublicAccess {
  if (!isRecord(value)) return { kind: "invalid" };
  const access = text(value.access) ?? text(value.status);
  if (access === "unpublished") return { kind: "unpublished" };
  if (access === "closed" || access === "unavailable" || access === "denied")
    return { kind: "closed" };
  if (access === "expired") return { kind: "expired" };
  if (access === "invalid_pin") return { kind: "pin-required", wrongPin: true };
  if (
    access === "locked" ||
    access === "pin_required" ||
    access === "pin-required"
  )
    return { kind: "pin-required", wrongPin: false };
  const source = isRecord(value.portal) ? value.portal : value;
  const project = isRecord(source.project) ? source.project : source;
  const branding = isRecord(source.branding) ? source.branding : undefined;
  const brandingName = text(branding?.name);
  const brandingAccentColor = text(branding?.accentColor);
  const title = text(project.title) ?? text(project.name);
  const stage = normalizePublicStage(
    text(project.stage) ?? text(project.publicStage) ?? text(project.status)
  );
  if (!title) return { kind: "invalid" };
  return {
    kind: "active",
    portal: {
      title,
      clientName: text(project.clientName) ?? text(project.client),
      editorDisplayName:
        text(source.editorDisplayName) ?? text(project.editorDisplayName),
      summary: text(project.summary) ?? text(project.clientSummary),
      notes: text(project.publicNotes) ?? text(project.clientNotes),
      startDate: text(project.startDate),
      dueDate: text(project.dueDate),
      stage,
      progress: Math.max(
        0,
        Math.min(100, number(project.progress) ?? progressForStage(stage))
      ),
      outputs: readOutputs(project.outputs ?? source.outputs),
      stageAssets: readStageAssets(project.stageAssets ?? source.stageAssets),
      revisions: readRevisionAllowance(source.revisions),
      branding:
        brandingName &&
        brandingAccentColor &&
        /^#[0-9a-fA-F]{6}$/.test(brandingAccentColor)
          ? {
              name: brandingName,
              accentColor: brandingAccentColor,
            }
          : undefined,
    },
  };
}

function readOutputs(value: unknown): PublicOutput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = text(item.title) ?? text(item.name);
    if (!title) return [];
    const versions = Array.isArray(item.versions)
      ? item.versions.flatMap((entry) => {
          const version = isRecord(entry)
            ? readVersion(entry, `${index + 1}`)
            : undefined;
          return version ? [version] : [];
        })
      : [];
    const currentValue = isRecord(item.currentVersion)
      ? item.currentVersion
      : isRecord(item.currentMediaVersion)
        ? item.currentMediaVersion
        : undefined;
    // The current cut is flagged `isCurrent` in the projection or arrives as
    // its own record on legacy hosts; both resolve to the same PublicVersion.
    const current =
      versions.find((version) => version.isCurrent) ??
      (currentValue ? readVersion(currentValue, `${index + 1}`) : undefined);
    if (current) {
      current.isCurrent = true;
      if (!versions.some((version) => version.id === current.id))
        versions.unshift(current);
    }
    return [
      {
        id: text(item.id) ?? `output-${index + 1}`,
        title,
        reviewState: safeReviewState(
          text(item.reviewState) ?? text(item.status)
        ),
        dueDate: text(item.dueDate),
        ...(current ? { currentVersion: current } : {}),
        versions,
      },
    ];
  });
}

function readVersion(
  value: Record<string, unknown>,
  fallbackId: string
): PublicVersion | undefined {
  const source = isRecord(value.source) ? value.source : value;
  const url = safeUrl(source.url);
  if (!url) return undefined;
  const media = normalizeMediaUrl(url);
  const host = new URL(url).hostname.toLowerCase();
  const provider =
    media.ok && media.value.provider === "youtube"
      ? "YouTube"
      : media.ok && media.value.provider === "vimeo"
        ? "Vimeo"
        : ["drive.google.com", "docs.google.com"].includes(host)
          ? "Drive"
          : [
                "dropbox.com",
                "www.dropbox.com",
                "dl.dropboxusercontent.com",
              ].includes(host)
            ? "Dropbox"
            : "Link";
  const approvedAt = text(value.approvedAt) ?? null;
  return {
    id: text(value.id) ?? fallbackId,
    versionNumber: number(value.versionNumber) ?? 1,
    changelog: text(value.changelog),
    label: text(value.label) ?? text(value.title) ?? "Current version",
    createdAt: text(value.createdAt),
    source: { provider, url },
    isCurrent: value.isCurrent === true,
    isLocked: value.isLocked === true,
    approved: value.approved === true || approvedAt !== null,
    approvedAt,
    approvedByName: text(value.approvedByName) ?? null,
  };
}

function safeReviewState(value: string | undefined) {
  return value && value in reviewLabels ? value : undefined;
}

function normalizePublicStage(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().replaceAll("_", " ");
  if (
    normalized === "in progress" ||
    normalized === "editing" ||
    normalized === "active"
  )
    return "In Progress";
  if (
    normalized === "review" ||
    normalized === "client review" ||
    normalized === "feedback"
  )
    return "Review";
  if (normalized === "approved") return "Approved";
  if (
    normalized === "delivered" ||
    normalized === "complete" ||
    normalized === "completed"
  )
    return "Delivered";
  return "Planning";
}

function progressForStage(stage: string) {
  const index = PUBLIC_STAGES.findIndex(
    (item) => item.toLowerCase() === stage.toLowerCase()
  );
  return index < 0 ? 0 : Math.round((index / (PUBLIC_STAGES.length - 1)) * 100);
}
function displayStage(stage: string) {
  return (
    PUBLIC_STAGES.find((item) => item.toLowerCase() === stage.toLowerCase()) ??
    "Planning"
  );
}
function formatDate(value: string | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : "Not scheduled";
}

/**
 * One view row per browser session, but only for a display name the client
 * actually committed: the portal calls commit() on the field's blur or on a
 * first comment/approve submit — never while the name is still being typed.
 */
export function createCommittedViewRecorder({
  token,
  record,
}: {
  token: string;
  record: (displayName: string) => Promise<unknown> | void;
}) {
  let committed = false;
  return {
    commit(displayName: string) {
      const name = displayName.trim();
      if (!name || committed) return;
      const key = `${VIEWED_SESSION_KEY}:${token}`;
      committed = true;
      try {
        if (window.sessionStorage.getItem(key)) return;
      } catch {
        // Session storage may be unavailable; the ref still limits this to one call.
      }
      const done = record(name);
      if (!(done instanceof Promise)) return;
      void done
        .then(() => {
          try {
            window.sessionStorage.setItem(key, "1");
          } catch {
            // Storage is an enhancement; the visit is already recorded.
          }
        })
        .catch(() => {
          committed = false;
        });
    },
  };
}

export function ClientPortalView({ token }: { token: string }) {
  const [pinInput, setPinInput] = useState("");
  const [pin, setPin] = useState<string | undefined>();
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const publicResult = useQuery(
    api.projectPortals.getByToken,
    token ? { token, ...(pin ? { pin } : {}) } : "skip"
  );

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousScheme = root.style.colorScheme;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyDeviceTheme = () => {
      root.classList.toggle("dark", media.matches);
      root.style.colorScheme = media.matches ? "dark" : "light";
    };
    applyDeviceTheme();
    media.addEventListener("change", applyDeviceTheme);
    return () => {
      media.removeEventListener("change", applyDeviceTheme);
      root.classList.toggle("dark", wasDark);
      root.style.colorScheme = previousScheme;
    };
  }, []);

  const access = useMemo<PublicAccess>(
    () =>
      publicResult === undefined
        ? { kind: "loading" }
        : readPublicPortalAccess(publicResult),
    [publicResult]
  );
  const publicCommentsResult = useQuery(
    api.mediaVersionComments.listForPortal,
    access.kind === "active" ? { token, ...(pin ? { pin } : {}) } : "skip"
  );
  const publicFilesResult = useQuery(
    api.projectFiles.listForPortal,
    access.kind === "active" ? { token, ...(pin ? { pin } : {}) } : "skip"
  );
  const addPublicComment = useMutation(
    api.mediaVersionComments.addPublicComment
  );
  const reopenPublicComment = useMutation(
    api.mediaVersionComments.reopenPublicComment
  );
  const approveVersion = useMutation(api.projectPortals.approve);
  const recordPortalView = useMutation(api.projectPortals.recordView);
  const [displayName, setDisplayName] = useState("");
  const [commentBusyOutputId, setCommentBusyOutputId] = useState("");
  const [busyCommentId, setBusyCommentId] = useState("");
  const [approvals, setApprovals] = useState<Record<string, PublicApproval>>(
    {}
  );
  const trackedPortalOpen = useRef(false);

  const publicComments = parseMediaVersionComments(publicCommentsResult);
  const publicFiles = readPublicFiles(publicFilesResult);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DISPLAY_NAME_KEY);
      if (saved) setDisplayName(saved.slice(0, 120));
    } catch {
      // Local storage may be disabled. Comments still work for this visit.
    }
  }, []);

  useEffect(() => {
    if (publicResult !== undefined) setPinBusy(false);
  }, [publicResult]);

  useEffect(() => {
    if (access.kind !== "active" || trackedPortalOpen.current) return;
    trackedPortalOpen.current = true;
    trackOptionalEvent("client_portal_opened", { result: "active" });
  }, [access.kind]);

  // A browser session counts as one visit, recorded against the committed
  // display name rather than every keystroke.
  const recordSessionView = useMemo(
    () =>
      createCommittedViewRecorder({
        token,
        record: (name) =>
          recordPortalView({
            token,
            ...(pin ? { pin } : {}),
            displayName: name,
          }),
      }),
    [token, pin, recordPortalView]
  );

  function commitDisplayName() {
    recordSessionView.commit(displayName);
  }

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pinInput.trim();
    if (value.length < 4) {
      setPinError("Enter the PIN provided by your editor.");
      return;
    }
    setPinError("");
    setPinBusy(true);
    setPin(value);
  }

  function changeDisplayName(value: string) {
    const next = value.slice(0, 120);
    setDisplayName(next);
    try {
      if (next.trim()) window.localStorage.setItem(DISPLAY_NAME_KEY, next);
      else window.localStorage.removeItem(DISPLAY_NAME_KEY);
    } catch {
      // Local storage is an enhancement, not an access requirement.
    }
  }

  function clearDisplayName() {
    changeDisplayName("");
  }

  async function addComment(
    outputId: string,
    mediaVersionId: string,
    body: string,
    timestampSeconds?: number,
    annotations?: readonly AnnotationShape[]
  ) {
    commitDisplayName();
    setCommentBusyOutputId(outputId);
    try {
      await addPublicComment({
        token,
        ...(pin ? { pin } : {}),
        outputId,
        mediaVersionId,
        authorName: displayName.trim(),
        body,
        ...(timestampSeconds !== undefined ? { timestampSeconds } : {}),
        ...(annotations?.length ? { annotations: [...annotations] } : {}),
      });
      trackOptionalEvent("comment_added", { surface: "portal" });
    } finally {
      setCommentBusyOutputId("");
    }
  }

  async function reopenComment(commentId: string) {
    setBusyCommentId(commentId);
    try {
      await reopenPublicComment({
        token,
        ...(pin ? { pin } : {}),
        commentId: commentId as Id<"mediaVersionComments">,
      });
    } finally {
      setBusyCommentId("");
    }
  }

  // Signs off the current shared cut with the portal display name; the row is
  // shown immediately while the reactive projection catches up.
  async function approveCurrentVersion(data: {
    outputId: string;
    mediaVersionId: string;
  }) {
    commitDisplayName();
    const result = await approveVersion({
      token,
      ...(pin ? { pin } : {}),
      outputId: data.outputId,
      mediaVersionId: data.mediaVersionId,
      displayName: displayName.trim(),
    });
    setApprovals((current) => ({
      ...current,
      [result.mediaVersionId]: {
        approvedAt: result.approvedAt,
        approvedByName: result.approvedByName,
      },
    }));
    return result;
  }

  if (access.kind === "loading")
    return (
      <AccessState
        title="Loading your project"
        body="Checking the shared portal link."
      >
        <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
      </AccessState>
    );
  if (access.kind === "invalid")
    return (
      <AccessState
        title="Portal link unavailable"
        body="This link is invalid or no longer available. Ask your editor for a new link."
      />
    );
  if (access.kind === "unpublished")
    return (
      <AccessState
        title="This portal is not open yet"
        body="Ask your editor to publish the project portal before using this link."
      />
    );
  if (access.kind === "closed")
    return (
      <AccessState
        title="This portal is closed"
        body="The editor closed access to this project. Ask them to reopen it or send a new link."
      />
    );
  if (access.kind === "expired")
    return (
      <AccessState
        title="This portal has expired"
        body="Ask your editor to extend access or send a new project link."
      />
    );
  if (access.kind === "pin-required")
    return (
      <AccessState
        title="This portal is protected"
        body={
          access.wrongPin
            ? "That PIN did not unlock this portal. Try again."
            : "Enter the PIN shared by your editor to view this project."
        }
      >
        <form
          onSubmit={(event) => void unlock(event)}
          className="w-full max-w-sm space-y-3 text-left"
        >
          <Label htmlFor="portal-pin" className="type-label">
            Portal PIN
          </Label>
          <Input
            id="portal-pin"
            type="password"
            value={pinInput}
            onChange={(event) => {
              setPinInput(event.target.value);
              setPin(undefined);
              setPinError("");
            }}
            minLength={4}
            maxLength={128}
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(pinError)}
          />
          <p
            className={cn(
              "text-muted-foreground type-label-sm",
              (pinError || access.wrongPin) && "text-destructive"
            )}
            role={pinError || access.wrongPin ? "alert" : undefined}
          >
            {pinError ||
              (access.wrongPin ? "Check the PIN and try again." : null) ||
              "Your PIN is checked securely and is never shown here."}
          </p>
          <Button
            type="submit"
            disabled={pinInput.trim().length < 4 || pinBusy}
            className="w-full"
          >
            {pinBusy ? "Checking..." : "Unlock portal"}
          </Button>
        </form>
      </AccessState>
    );
  return (
    <ActivePortal
      portal={access.portal}
      token={token}
      pin={pin}
      comments={publicComments}
      commentsLoading={publicCommentsResult === undefined}
      files={publicFiles}
      filesLoading={publicFilesResult === undefined}
      displayName={displayName}
      onDisplayNameChange={changeDisplayName}
      onClearDisplayName={clearDisplayName}
      onDisplayNameCommit={commitDisplayName}
      onAddComment={addComment}
      onReopenComment={reopenComment}
      onApprove={approveCurrentVersion}
      approvals={approvals}
      busyOutputId={commentBusyOutputId}
      busyCommentId={busyCommentId}
    />
  );
}

function AccessState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-lg p-6 sm:p-10 bg-well rounded-frame">
        <RelayBrand compact />
        <div className="mt-14 flex flex-col items-center text-center">
          <span
            className="grid size-14 place-items-center border border-border text-muted-foreground"
            aria-hidden="true"
          >
            {children ? (
              <LockKeyhole className="size-6" />
            ) : (
              <ShieldCheck className="size-6" />
            )}
          </span>
          <h1 className="mt-6 type-heading-lg">{title}</h1>
          <p className="mt-2 max-w-sm text-muted-foreground type-body">
            {body}
          </p>
          {children ? <div className="mt-8 w-full">{children}</div> : null}
        </div>
        <p className="mt-14 text-muted-foreground type-label-sm">
          Private project view · No account required
        </p>
      </section>
    </main>
  );
}

function ActivePortal({
  portal,
  token,
  pin,
  comments,
  commentsLoading,
  files,
  filesLoading,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onDisplayNameCommit,
  onAddComment,
  onReopenComment,
  onApprove,
  approvals,
  busyOutputId,
  busyCommentId,
}: {
  portal: PublicPortal;
  token: string;
  pin: string | undefined;
  comments: readonly MediaVersionComment[];
  commentsLoading: boolean;
  files: readonly PublicFile[];
  filesLoading: boolean;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onDisplayNameCommit: () => void;
  onAddComment: (
    outputId: string,
    mediaVersionId: string,
    body: string,
    timestampSeconds?: number,
    annotations?: readonly AnnotationShape[]
  ) => Promise<void>;
  onReopenComment: (commentId: string) => Promise<void>;
  onApprove: (data: {
    outputId: string;
    mediaVersionId: string;
  }) => Promise<{ approvedAt: string; approvedByName: string }>;
  approvals: Record<string, PublicApproval>;
  busyOutputId: string;
  busyCommentId: string;
}) {
  const currentStage = displayStage(portal.stage);
  const currentIndex = PUBLIC_STAGES.findIndex((item) => item === currentStage);
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          {portal.branding ? (
            <span
              className="type-heading-xs"
              style={{ color: portal.branding.accentColor }}
            >
              {portal.branding.name}
            </span>
          ) : (
            <RelayBrand compact />
          )}
          <span className="text-muted-foreground type-label-sm">
            Client portal
          </span>
        </header>
        <section className="border-b border-border py-12">
          <p className="text-muted-foreground type-label-sm">Shared project</p>
          <h1 className="mt-3 max-w-2xl sm:text-5xl type-display">
            {portal.title}
          </h1>
          {portal.clientName ? (
            <p className="mt-3 text-muted-foreground type-body">
              For {portal.clientName}
            </p>
          ) : null}
          {portal.editorDisplayName ? (
            <p
              className={
                portal.clientName
                  ? "mt-1 text-muted-foreground type-body"
                  : "mt-3 text-muted-foreground type-body"
              }
            >
              Shared by {portal.editorDisplayName}
            </p>
          ) : null}
          {portal.summary ? (
            <p className="mt-7 max-w-2xl text-muted-foreground type-body-lg">
              {portal.summary}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 type-body">
            {portal.startDate ? (
              <span className="inline-flex items-center gap-2">
                <CalendarDays
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Started {formatDate(portal.startDate)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              Due {formatDate(portal.dueDate)}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="size-2 rounded-full bg-foreground"
                aria-hidden="true"
              />
              {currentStage}
            </span>
          </div>
        </section>
        <section
          aria-labelledby="progress-title"
          className="border-b border-border py-10"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="progress-title" className="type-heading-sm">
                Project progress
              </h2>
              <p className="mt-1 text-muted-foreground type-body">
                A client-safe view of the current stage.
              </p>
            </div>
            <span className="tabular-nums type-heading-lg">
              {portal.progress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Project progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={portal.progress}
            className="mt-6 h-1.5 bg-muted"
          >
            <span
              className="block h-full bg-foreground"
              style={{ width: `${portal.progress}%` }}
            />
          </div>
          <ol className="mt-7 grid grid-cols-2 gap-y-5 sm:grid-cols-5 sm:gap-x-4">
            {PUBLIC_STAGES.map((stage, index) => {
              const complete = currentIndex >= 0 && index < currentIndex;
              const current = stage === currentStage;
              return (
                <li
                  key={stage}
                  aria-current={current ? "step" : undefined}
                  className="flex items-center gap-2 type-body"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center border type-label-sm",
                      complete || current
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {complete ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      current ? "font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {stage}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <section aria-labelledby="outputs-title" className="py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="outputs-title" className="type-heading-sm">
                Shared outputs
              </h2>
              <p className="mt-1 text-muted-foreground type-body">
                Every version your editor has shared appears here.
              </p>
              <RevisionAllowance allowance={portal.revisions} />
            </div>
            <Badge variant="outline">{portal.outputs.length}</Badge>
          </div>
          {portal.outputs.length ? (
            <div className="mt-6 divide-y divide-border border-y border-border">
              {portal.outputs.map((output) => (
                <PublicOutputRow
                  key={output.id}
                  output={output}
                  token={token}
                  pin={pin}
                  comments={comments}
                  commentsLoading={commentsLoading}
                  displayName={displayName}
                  onDisplayNameChange={onDisplayNameChange}
                  onClearDisplayName={onClearDisplayName}
                  onDisplayNameCommit={onDisplayNameCommit}
                  onAddComment={onAddComment}
                  onReopenComment={onReopenComment}
                  onApprove={onApprove}
                  approvals={approvals}
                  busy={busyOutputId === output.id}
                  busyCommentId={busyCommentId}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 p-8 text-center text-muted-foreground type-body bg-well rounded-frame">
              No outputs have been shared yet.
            </div>
          )}
        </section>
        <PublicStageAssetsSection groups={portal.stageAssets} />
        <PublicFilesSection files={files} loading={filesLoading} />
        {portal.notes ? (
          <section
            aria-labelledby="notes-title"
            className="border-t border-border py-10"
          >
            <h2 id="notes-title" className="type-heading-sm">
              Notes from your editor
            </h2>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-muted-foreground type-body">
              {portal.notes}
            </p>
          </section>
        ) : null}
        <footer className="border-t border-border pt-5 text-muted-foreground type-label-sm">
          Shared securely through Relay.
        </footer>
      </div>
    </main>
  );
}

export function PublicStageAssetsSection({
  groups,
}: {
  groups: readonly PublicStageAssetGroup[];
}) {
  if (!groups.length) return null;
  const count = groups.reduce((total, group) => total + group.assets.length, 0);
  return (
    <section
      aria-labelledby="stage-files-title"
      className="border-t border-border py-10"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 id="stage-files-title" className="type-heading-sm">
          Files
        </h2>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="mt-6 grid gap-6">
        {groups.map((group) => (
          <div key={group.stageLabel}>
            <h3 className="text-muted-foreground type-label-sm">
              {group.stageLabel}
            </h3>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {group.assets.map((asset) => (
                <li key={asset.id}>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 outline-none hover:underline focus-visible:focus-ring"
                  >
                    <span className="font-semibold">{asset.title}</span>
                    <span className="text-muted-foreground type-label-sm">
                      {STAGE_ASSET_KIND_LABELS[asset.kind]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicFilesSection({
  files,
  loading,
}: {
  files: readonly PublicFile[];
  loading: boolean;
}) {
  return (
    <section
      aria-labelledby="files-title"
      className="border-t border-border py-10"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="files-title" className="type-heading-sm">
            Downloads
          </h2>
          <p className="mt-1 text-muted-foreground type-body">
            Files you can open or download.
          </p>
        </div>
        <Badge variant="outline">{loading ? "…" : files.length}</Badge>
      </div>
      {loading ? (
        <p className="mt-6 text-muted-foreground type-body">
          Loading shared files…
        </p>
      ) : files.length ? (
        <div className="mt-6 divide-y divide-border border-y border-border">
          {files.map((file) => (
            <article
              key={file.id}
              className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex min-w-0 gap-3">
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{file.title}</h3>
                  <p className="mt-1 truncate text-muted-foreground type-label-sm">
                    {fileKind(file.mimeType)} · {file.fileName}
                  </p>
                  {file.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground type-body">
                      {file.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none type-label"
                >
                  Open <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
                {file.downloadable ? (
                  <a
                    href={file.url}
                    download={file.fileName}
                    className="inline-flex items-center gap-2 underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none type-label"
                  >
                    Download <Download className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 p-8 text-center text-muted-foreground type-body bg-well rounded-frame">
          No files have been shared yet.
        </p>
      )}
    </section>
  );
}

/** Loads the comments stored on a superseded or locked shared version. */
function PortalHistoricalVersionComments({
  token,
  pin,
  outputId,
  versionId,
  player,
  supportsPlayerTimestamps,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onReopen,
  notice,
  onCommentSelect,
}: {
  token: string;
  pin: string | undefined;
  outputId: string;
  versionId: string;
  player?: ReviewPlayer;
  supportsPlayerTimestamps: boolean;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onReopen: (commentId: string) => Promise<void>;
  notice: string;
  onCommentSelect?: (comment: MediaVersionComment) => void;
}) {
  const result = useQuery(
    api.mediaVersionComments.listForPortal,
    token && outputId && versionId
      ? {
          token,
          ...(pin ? { pin } : {}),
          outputId,
          mediaVersionId: versionId,
        }
      : "skip"
  );
  const comments = parseMediaVersionComments(result);
  return (
    <PublicVersionReview
      versionId={versionId}
      player={player}
      supportsPlayerTimestamps={supportsPlayerTimestamps}
      comments={comments}
      loading={result === undefined}
      readOnly
      notice={notice}
      displayName={displayName}
      onDisplayNameChange={onDisplayNameChange}
      onClearDisplayName={onClearDisplayName}
      onSubmit={async () => {}}
      onReopen={onReopen}
      onCommentSelect={onCommentSelect}
    />
  );
}

/**
 * The comment block for one shared version: normal, read-only for
 * earlier versions, or form-less once the version is approved and locked.
 */
export function PublicVersionReview({
  versionId,
  player,
  supportsPlayerTimestamps,
  comments,
  loading = false,
  readOnly = false,
  notice,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onDisplayNameCommit,
  onSubmit,
  onReopen,
  onCommentSelect,
  busy = false,
  busyCommentId,
}: {
  versionId: string;
  player?: ReviewPlayer;
  supportsPlayerTimestamps?: boolean;
  comments: readonly MediaVersionComment[];
  loading?: boolean;
  readOnly?: boolean;
  notice?: string;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onDisplayNameCommit?: () => void;
  onSubmit: (body: string, timestampSeconds?: number) => Promise<void>;
  onReopen: (commentId: string) => Promise<void>;
  onCommentSelect?: (comment: MediaVersionComment) => void;
  busy?: boolean;
  busyCommentId?: string;
}) {
  return (
    <section aria-label="Version comments">
      {notice ? (
        <p className="px-5 pt-4 text-muted-foreground type-label-sm">
          {notice}
        </p>
      ) : null}
      <PublicMediaVersionComments
        versionId={versionId}
        player={player}
        supportsPlayerTimestamps={supportsPlayerTimestamps}
        comments={comments}
        loading={loading}
        disabled={readOnly}
        displayName={displayName}
        onDisplayNameChange={onDisplayNameChange}
        onClearDisplayName={onClearDisplayName}
        onDisplayNameCommit={onDisplayNameCommit}
        onSubmit={onSubmit}
        onReopen={onReopen}
        onCommentSelect={onCommentSelect}
        busy={busy}
        busyCommentId={busyCommentId}
      />
    </section>
  );
}

export function PublicOutputRow({
  output,
  token,
  pin,
  comments,
  commentsLoading,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onDisplayNameCommit,
  onAddComment,
  onReopenComment,
  onApprove,
  approvals,
  selectedVersionId,
  busy,
  busyCommentId,
}: {
  output: PublicOutput;
  token: string;
  pin: string | undefined;
  comments: readonly MediaVersionComment[];
  commentsLoading: boolean;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onDisplayNameCommit?: () => void;
  onAddComment: (
    outputId: string,
    mediaVersionId: string,
    body: string,
    timestampSeconds?: number,
    annotations?: readonly AnnotationShape[]
  ) => Promise<void>;
  onReopenComment: (commentId: string) => Promise<void>;
  onApprove: (data: {
    outputId: string;
    mediaVersionId: string;
  }) => Promise<{ approvedAt: string; approvedByName: string }>;
  approvals: Record<string, PublicApproval>;
  selectedVersionId?: string;
  busy: boolean;
  busyCommentId: string;
}) {
  const [player, setPlayer] = useState<ReviewPlayer>();
  const [requestedId, setRequestedId] = useState(output.currentVersion?.id);
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([]);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  // A clicked comment's stored marks preview over the player until another
  // comment is clicked, the frame is clicked again to dismiss, or the version
  // changes.
  const [previewComment, setPreviewComment] = useState<
    MediaVersionComment | undefined
  >();
  const state = output.reviewState
    ? (reviewLabels[output.reviewState] ?? output.reviewState)
    : undefined;
  const versions = output.versions;
  const selected =
    versions.find((version) => version.id === selectedVersionId) ??
    versions.find((version) => version.id === requestedId) ??
    versions.find((version) => version.isCurrent) ??
    output.currentVersion;
  const isCurrent = Boolean(selected?.isCurrent);
  // Server state wins once the projection catches up; the keyed transient
  // pending-approval map keeps the line up for the approved version only.
  const approval =
    (selected?.approved
      ? {
          approvedAt: selected.approvedAt ?? "",
          approvedByName: selected.approvedByName ?? "Client",
        }
      : undefined) ?? (selected ? approvals[selected.id] : undefined);
  const canApprove = Boolean(
    selected &&
    isCurrent &&
    output.reviewState === "sent_to_client" &&
    !selected.isLocked &&
    !selected.approved &&
    !approval
  );
  const canComment = Boolean(
    selected &&
    isCurrent &&
    !selected.isLocked &&
    !selected.approved &&
    !approval
  );
  const media = selected ? normalizeMediaUrl(selected.source.url) : undefined;
  const embedUrl =
    media?.ok && media.value.provider !== "external"
      ? media.value.embedUrl
      : undefined;

  // A different cut is a different frame; in-progress marks go with it.
  useEffect(() => {
    setAnnotations([]);
    setPreviewComment(undefined);
  }, [selected?.id]);

  function selectPreviewComment(comment: MediaVersionComment) {
    setPreviewComment((current) =>
      current?.id === comment.id ? undefined : comment
    );
  }

  async function confirmApproval() {
    if (!selected) return;
    if (!displayName.trim()) {
      setApprovalError("Enter your display name before approving.");
      return;
    }
    setApproving(true);
    setApprovalError("");
    try {
      await onApprove({
        outputId: output.id,
        mediaVersionId: selected.id,
      });
      // The projection updates shortly after; the keyed approvals map above
      // keeps the line up for this version until the server state lands.
      setConfirmApprove(false);
    } catch (caught) {
      setApprovalError(
        caught instanceof Error
          ? caught.message
          : "Could not approve this version."
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <article className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h3 className="font-semibold">{output.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground type-label-sm">
          {state ? <span>{state}</span> : null}
          {output.dueDate ? (
            <span>Due {formatDate(output.dueDate)}</span>
          ) : null}
          {selected ? (
            <span>
              {selected.source.provider} · {selected.label}
            </span>
          ) : null}
        </div>
      </div>
      {selected ? (
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          <a
            href={selected.source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none type-label"
          >
            {isCurrent ? (
              <>
                Open current version{" "}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </>
            ) : (
              <>
                Open this version{" "}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </>
            )}
          </a>
          {canApprove ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setConfirmApprove(true);
                setApprovalError("");
              }}
              disabled={busy || approving}
            >
              Approve version
            </Button>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground type-body">
          No version shared yet
        </span>
      )}
      {canApprove && confirmApprove ? (
        <div className="sm:col-span-2">
          <p className="type-body">
            Approve {selected?.label}? This locks the version against further
            comments and uploads.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void confirmApproval()}
              disabled={approving}
            >
              {approving ? "Approving..." : "Confirm approval"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirmApprove(false);
                setApprovalError("");
              }}
              disabled={approving}
            >
              Cancel
            </Button>
          </div>
          {approvalError ? (
            <p role="alert" className="mt-2 text-destructive type-label-sm">
              {approvalError}
            </p>
          ) : null}
        </div>
      ) : null}
      {versions.length > 1 ? (
        <div
          role="group"
          aria-label="Versions"
          className="sm:col-span-2 flex flex-wrap items-center gap-1"
        >
          {versions.map((version) => (
            <Button
              key={version.id}
              type="button"
              size="sm"
              variant={version.id === selected?.id ? "outline" : "ghost"}
              aria-pressed={version.id === selected?.id}
              onClick={() => {
                setRequestedId(version.id);
                setApprovalError("");
              }}
            >
              v{version.versionNumber}
              {version.isCurrent ? " · Current" : ""}
            </Button>
          ))}
        </div>
      ) : null}
      {approval ? (
        <div className="sm:col-span-2 flex items-center gap-2 type-label">
          <LockKeyhole
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          Approved by {approval.approvedByName || "Client"} ·{" "}
          {formatDate(approval.approvedAt)}
        </div>
      ) : null}
      {selected?.changelog ? (
        <section aria-label="What changed" className="sm:col-span-2">
          <h4 className="type-label">What changed</h4>
          <p className="mt-2 whitespace-pre-wrap type-body">
            {selected.changelog}
          </p>
        </section>
      ) : null}
      {selected ? (
        <div
          className={`sm:col-span-2 grid min-w-0 overflow-hidden rounded-soft border border-hair ${embedUrl ? "lg:grid-cols-[minmax(0,1fr)_21rem]" : ""}`}
        >
          {embedUrl || canComment || previewComment ? (
            <div
              className="min-w-0 p-5"
              onPointerDown={() => setPreviewComment(undefined)}
            >
              <FrameAnnotationEditor
                shapes={annotations}
                onChange={setAnnotations}
                label={`Frame notes for ${output.title}`}
                disabled={!canComment}
                preview={
                  previewComment?.annotations?.length
                    ? {
                        shapes: previewComment.annotations,
                        label: `Frame marks from ${previewComment.authorName}'s comment`,
                      }
                    : undefined
                }
              >
                {embedUrl ? (
                  <ReviewVideoPlayer
                    key={selected.id}
                    url={embedUrl}
                    title={`${output.title} — ${selected.label}`}
                    onReady={setPlayer}
                  />
                ) : undefined}
              </FrameAnnotationEditor>
            </div>
          ) : null}
          <div
            className={`min-w-0 ${embedUrl ? "border-t border-hair lg:border-t-0 lg:border-l" : ""}`}
          >
            {canComment ? (
              <PublicVersionReview
                key={selected.id}
                player={player}
                supportsPlayerTimestamps={!!embedUrl}
                versionId={selected.id}
                comments={comments}
                loading={commentsLoading}
                displayName={displayName}
                onDisplayNameChange={onDisplayNameChange}
                onClearDisplayName={onClearDisplayName}
                onDisplayNameCommit={onDisplayNameCommit}
                onSubmit={async (body, timestampSeconds) => {
                  await onAddComment(
                    output.id,
                    selected.id,
                    body,
                    timestampSeconds,
                    annotations
                  );
                  setAnnotations([]);
                }}
                onReopen={onReopenComment}
                onCommentSelect={selectPreviewComment}
                busy={busy}
                busyCommentId={busyCommentId}
              />
            ) : (
              // Locked and earlier versions read their own comments, form-less.
              <PortalHistoricalVersionComments
                key={selected.id}
                token={token}
                pin={pin}
                outputId={output.id}
                versionId={selected.id}
                player={player}
                supportsPlayerTimestamps={!!embedUrl}
                displayName={displayName}
                onDisplayNameChange={onDisplayNameChange}
                onClearDisplayName={onClearDisplayName}
                onReopen={onReopenComment}
                notice={
                  selected.isCurrent
                    ? "Approved version — read only"
                    : "Earlier version — read only"
                }
                onCommentSelect={selectPreviewComment}
              />
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

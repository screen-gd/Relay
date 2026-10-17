import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ContentSection } from "@/components/workspace-page";
import { AiLockedNotice } from "@/features/ai/ai-availability";
import { projectLink } from "@/features/projects/project-view";
import { cn } from "@/lib/utils";

type Finding = FunctionReturnType<
  typeof api.deadlineRisk.listFindings
>["findings"][number];
type Digest = NonNullable<FunctionReturnType<typeof api.riskDigest.latest>>;
type Source = Pick<Finding, "projectId" | "outputId">;

function sourceLink({ projectId, outputId }: Source) {
  return projectLink({ projectId, view: outputId ? "outputs" : undefined });
}

function dueLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

const kindLabel: Record<Finding["kind"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  awaiting_client: "Waiting on client",
};

function runStatus(digest: Digest) {
  switch (digest.status) {
    case "queued":
      return "Queued";
    case "running":
      return "Drafting digest...";
    case "failed":
      return "Digest failed. Check AI settings or retry.";
    case "succeeded":
      return null;
  }
}

/**
 * Rule-based deadline risks for Owners and Editors, with an optional
 * AI-phrased digest of the same findings. The findings never need AI.
 */
export function DeadlineRiskRadar({
  workspaceId,
}: {
  workspaceId: Id<"teamWorkspaces">;
}) {
  const { isAuthenticated } = useConvexAuth();
  const [month] = useState(() => new Date().toISOString().slice(0, 7));
  const radar = useQuery(api.deadlineRisk.listFindings, { workspaceId });
  const digest = useQuery(api.riskDigest.latest, { workspaceId });
  const ai = useQuery(api.aiRuns.getSummary, { workspaceId, month });
  const generate = useMutation(api.riskDigest.generate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(modelTier: "default" | "better") {
    setBusy(true);
    setError("");
    try {
      await generate({ workspaceId, modelTier });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not draft a digest."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!radar) return null;
  const running =
    busy || digest?.status === "queued" || digest?.status === "running";
  const status = digest ? runStatus(digest) : null;
  const lines = digest?.items.filter((item) => item.line !== null) ?? [];

  return (
    <ContentSection
      title="Deadline risk"
      metadata={
        radar.evaluatedOn ? (
          <span className="text-foreground type-label-sm">
            Checked {radar.evaluatedOn}
          </span>
        ) : null
      }
      actions={
        ai && radar.findings.length ? (
          ai.enabled ? (
            <div className="flex gap-2 [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button]:dark:text-white">
              <Button
                size="sm"
                variant="outline"
                disabled={running}
                onClick={() => void request("default")}
              >
                Flag deadline risk
              </Button>
              {digest ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={running}
                  onClick={() => void request("better")}
                >
                  Retry with better model
                </Button>
              ) : null}
            </div>
          ) : (
            <AiLockedNotice
              feature="Flag deadline risk"
              access={isAuthenticated ? "settings" : "signIn"}
            />
          )
        ) : null
      }
    >
      {radar.findings.length ? (
        <ul className="grid gap-2">
          {radar.findings.map((finding) => (
            <li
              key={finding._id}
              className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-3 type-label-sm"
            >
              <Link
                {...sourceLink(finding)}
                className="truncate font-medium text-foreground underline-offset-4 hover:underline"
              >
                {finding.outputTitle
                  ? `${finding.projectTitle} · ${finding.outputTitle}`
                  : finding.projectTitle}
              </Link>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  finding.kind === "overdue"
                    ? "text-fail-text"
                    : "text-foreground"
                )}
              >
                {kindLabel[finding.kind]} · {dueLabel(finding.daysUntilDue)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-foreground type-label-sm">No deadlines at risk.</p>
      )}
      {radar.truncated ? (
        <p className="mt-2 text-foreground type-label-sm">
          Showing the first findings only.
        </p>
      ) : null}
      {status ? (
        <p role="status" className="mt-3 text-foreground type-label-sm">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-destructive type-label-sm">
          {error}
        </p>
      ) : null}
      {digest?.status === "succeeded" && lines.length ? (
        <div className="mt-4 grid gap-2">
          <p className="text-foreground type-label-sm">
            AI-drafted · {digest.evaluatedOn}
            {digest.totalFindings > digest.items.length
              ? ` · first ${digest.items.length} of ${digest.totalFindings}`
              : ""}
          </p>
          <ul className="grid gap-1.5">
            {lines.map((item) => (
              <li
                key={`${item.projectId}:${item.outputId ?? ""}`}
                className="text-foreground type-body"
              >
                {item.line}{" "}
                <Link
                  {...sourceLink(item)}
                  className="underline underline-offset-4 type-label-sm"
                >
                  Source
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ContentSection>
  );
}

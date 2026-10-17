"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  briefDraftSchema,
  MAX_BRIEF_CHARACTERS,
  MAX_BRIEF_PDF_BYTES,
} from "../../../convex/briefImportPrompt";
import type { z } from "zod";
import type { Client } from "@/lib/types";
import { AiLockedNotice, type AiAccess } from "@/features/ai/ai-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sectionClassName =
  "grid gap-3 dark:bg-black dark:text-white [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_input]:bg-transparent [&_textarea]:bg-transparent";

export function BriefImport({
  teamId,
  clients,
  onCreated,
  open,
  onOpenChange,
}: {
  teamId?: Id<"teamWorkspaces">;
  clients: readonly Client[];
  onCreated: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const workspace = useQuery(
    api.briefImport.workspace,
    isAuthenticated ? { teamId } : "skip"
  );
  const generate = useAction(api.briefImport.generate);
  const uploadPdf = useAction(api.briefImportUploads.generateUploadUrl);
  const confirm = useMutation(api.briefImport.confirm);
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [runId, setRunId] = useState<Id<"aiRuns">>();
  const run = useQuery(api.aiRuns.getRun, runId ? { runId } : "skip");
  const [edited, setEdited] = useState<z.output<typeof briefDraftSchema>>();
  const [questionText, setQuestionText] = useState<string>();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parsed =
    run?.status === "succeeded" && run.outputJson
      ? briefDraftSchema.safeParse(JSON.parse(run.outputJson))
      : undefined;
  const draft = edited ?? (parsed?.success ? parsed.data : undefined);
  const running = busy || run?.status === "queued" || run?.status === "running";
  useEffect(() => {
    if (!pdf) {
      setPdfUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(pdf);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);
  async function request(modelTier: "default" | "better") {
    if (!workspace) return;
    setError("");
    setBusy(true);
    try {
      if (pdf && pdf.size > MAX_BRIEF_PDF_BYTES)
        throw new Error(
          "PDF must be 10 MB or smaller. Paste text for a larger brief."
        );
      let input:
        | { kind: "text"; text: string }
        | { kind: "pdf"; uploadId: Id<"briefUploads"> } = {
        kind: "text",
        text,
      };
      if (pdf) {
        const upload = await uploadPdf({ workspaceId: workspace._id });
        const response = await fetch(upload.url, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: pdf,
        });
        if (!response.ok) throw new Error("Could not upload PDF. Try again.");
        input = { kind: "pdf", uploadId: upload.uploadId };
      }
      const result = await generate({
        workspaceId: workspace._id,
        inputJson: JSON.stringify(input),
        modelTier,
      });
      setRunId(result.runId);
      setEdited(undefined);
      setQuestionText(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not draft project."
      );
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!runId || !draft) return;
    setError("");
    setBusy(true);
    try {
      onCreated(
        await confirm({
          runId,
          draftJson: JSON.stringify({
            ...draft,
            questions: (questionText ?? draft.questions.join("\n"))
              .split("\n")
              .map((question) => question.trim())
              .filter(Boolean),
          }),
          clientId,
          personal: !teamId,
        })
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create project."
      );
    } finally {
      setBusy(false);
    }
  }
  /**
   * A visit that cannot run AI keeps the notice where the import sits, so the
   * feature is visible before it is unlocked and nobody fills the form for a
   * run that would fail. Sign-in resolves first, then the Workspace, which is
   * why a local visit never waits on a query that will not run.
   */
  const locked: AiAccess | null = !isAuthenticated
    ? "signIn"
    : workspace === null || (workspace && !workspace.aiEnabled)
      ? "settings"
      : null;
  if (!isLoading && locked)
    return (
      <section className={sectionClassName}>
        <AiLockedNotice feature="Import a brief" access={locked} />
      </section>
    );
  if (!workspace) return null;
  return (
    <section className={sectionClassName}>
      <Button type="button" variant="ghost" onClick={() => onOpenChange(!open)}>
        {open ? "Back to manual" : "Import brief"}
      </Button>
      {open ? (
        <>
          <Textarea
            id="brief-source"
            aria-label="Brief text"
            value={text}
            maxLength={MAX_BRIEF_CHARACTERS}
            disabled={running}
            onChange={(event) => {
              setText(event.target.value);
              setPdf(null);
              setRunId(undefined);
              setEdited(undefined);
              setQuestionText(undefined);
            }}
            placeholder="Paste your brief"
          />
          <Input
            aria-label="PDF brief (up to 10 MB)"
            type="file"
            accept=".pdf,application/pdf"
            disabled={running}
            onChange={(event) => {
              setPdf(event.target.files?.[0] ?? null);
              setRunId(undefined);
              setEdited(undefined);
              setQuestionText(undefined);
            }}
          />
          <p className="type-label-sm">
            PDF up to 10 MB, or 12,000 characters. Nothing is created until you
            confirm.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={running || (!pdf && !text.trim())}
              onClick={() => void request("default")}
            >
              Draft project
            </Button>
            {run ? (
              <Button
                type="button"
                variant="ghost"
                disabled={running}
                onClick={() => void request("better")}
              >
                Retry with better model
              </Button>
            ) : null}
          </div>
          {run ? (
            <p role="status" className="type-label-sm">
              {running
                ? "Drafting..."
                : run.status === "failed"
                  ? "Draft failed. Check AI settings or retry."
                  : ""}
            </p>
          ) : null}
          {draft ? (
            <div className="grid gap-3">
              <p className="type-label-sm">
                AI-drafted ·{" "}
                <a
                  href={pdfUrl ?? "#brief-source"}
                  target={pdfUrl ? "_blank" : undefined}
                  rel={pdfUrl ? "noreferrer" : undefined}
                  className="underline"
                >
                  Source brief{pdf ? " (uploaded PDF)" : ""}
                </a>
              </p>
              <Input
                aria-label="Project title"
                maxLength={160}
                value={draft.title}
                onChange={(event) =>
                  setEdited({ ...draft, title: event.target.value })
                }
              />
              <Input
                aria-label="Project deadline"
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(event) =>
                  setEdited({ ...draft, dueDate: event.target.value || null })
                }
              />
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger aria-label="Client">
                  <SelectValue placeholder="Choose client" />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter((client) => !client.archived)
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {draft.outputs.map((output, index) => (
                <div
                  key={index}
                  className="grid gap-2 border-b border-border py-2"
                >
                  <Input
                    aria-label={`Output ${index + 1} title`}
                    maxLength={160}
                    value={output.title}
                    onChange={(event) =>
                      setEdited({
                        ...draft,
                        outputs: draft.outputs.map((row, i) =>
                          i === index
                            ? { ...row, title: event.target.value }
                            : row
                        ),
                      })
                    }
                  />
                  <Textarea
                    aria-label={`Output ${index + 1} format and specification`}
                    maxLength={1000}
                    value={output.specification}
                    onChange={(event) =>
                      setEdited({
                        ...draft,
                        outputs: draft.outputs.map((row, i) =>
                          i === index
                            ? { ...row, specification: event.target.value }
                            : row
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={`Output ${index + 1} deadline`}
                    type="date"
                    value={output.dueDate ?? ""}
                    onChange={(event) =>
                      setEdited({
                        ...draft,
                        outputs: draft.outputs.map((row, i) =>
                          i === index
                            ? { ...row, dueDate: event.target.value || null }
                            : row
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setEdited({
                        ...draft,
                        outputs: draft.outputs.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove output
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                disabled={draft.outputs.length >= 20}
                onClick={() =>
                  setEdited({
                    ...draft,
                    outputs: [
                      ...draft.outputs,
                      { title: "", specification: "", dueDate: null },
                    ],
                  })
                }
              >
                Add output
              </Button>
              <Textarea
                aria-label="Open questions (one per line)"
                value={questionText ?? draft.questions.join("\n")}
                onChange={(event) => setQuestionText(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={running || !clientId || !draft.dueDate}
                onClick={() => void create()}
              >
                Confirm and create project
              </Button>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive type-body">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentSection } from "@/components/workspace-page";
import { projectHref } from "@/features/projects/project-view";

type Question = FunctionReturnType<typeof api.earningsQa.recent>[number];

function runStatus(question: Question) {
  switch (question.status) {
    case "queued":
      return "Queued";
    case "running":
      return "Looking up figures...";
    case "failed":
      return question.failureCode === "verification_failed"
        ? "The AI's numbers couldn't be verified against your records, so no answer was shown. Retry or rephrase."
        : "No verified answer. Retry or rephrase.";
    case "succeeded":
      return null;
  }
}

function AnswerRow({
  question,
  disabled,
  onRetry,
}: {
  question: Question;
  disabled: boolean;
  onRetry: () => void;
}) {
  const status = runStatus(question);
  return (
    <li className="grid gap-2 py-3">
      <p className="text-sm font-medium text-foreground">{question.question}</p>
      {status ? (
        <p role="status" className="text-xs text-foreground">
          {status}
        </p>
      ) : null}
      {question.answer ? (
        <>
          <p className="text-xs text-foreground">AI-drafted</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {question.answer.text}
          </p>
          {question.answer.citations.length ? (
            <ul className="grid gap-1 text-xs text-foreground">
              {question.answer.citations.map((citation, index) => (
                <li
                  key={`${citation.label}:${index}`}
                  className="flex flex-wrap gap-x-3 gap-y-1"
                >
                  <span>
                    {citation.label}:{" "}
                    <span className="font-mono tabular-nums">
                      {citation.value.toLocaleString("en")}
                    </span>
                  </span>
                  {citation.projectIds.map((projectId, sourceIndex) => (
                    <Link
                      key={projectId}
                      href={projectHref({ projectId })}
                      className="underline underline-offset-4"
                    >
                      Project {sourceIndex + 1}
                    </Link>
                  ))}
                  {citation.salaryBatchIds.length ? (
                    <span>
                      {citation.salaryBatchIds.length} salary batch
                      {citation.salaryBatchIds.length === 1 ? "" : "es"}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {question.status === "failed" || question.status === "succeeded" ? (
        <div>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onRetry}
          >
            Retry with better model
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Earnings questions for Owners and Editors with Finance access. Figures
 * come from typed earnings tools and are checked before an answer is shown.
 */
export function EarningsQa({
  workspaceId,
}: {
  workspaceId: Id<"teamWorkspaces">;
}) {
  const [month] = useState(() => new Date().toISOString().slice(0, 7));
  const ai = useQuery(api.aiRuns.getSummary, { workspaceId, month });
  const questions = useQuery(
    api.earningsQa.recent,
    ai?.enabled ? { workspaceId } : "skip"
  );
  const ask = useMutation(api.earningsQa.ask);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(text: string, modelTier: "default" | "better") {
    setBusy(true);
    setError("");
    try {
      await ask({ workspaceId, question: text, modelTier });
      if (modelTier === "default") setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not ask.");
    } finally {
      setBusy(false);
    }
  }

  if (!ai?.enabled) return null;
  const running =
    busy ||
    (questions ?? []).some(
      (row) => row.status === "queued" || row.status === "running"
    );

  return (
    <ContentSection title="Ask about earnings">
      <div className="[&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button]:dark:text-white [&_input]:dark:bg-black">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim()) void submit(question.trim(), "default");
          }}
        >
          <Input
            aria-label="Earnings question"
            placeholder="Which client paid most this quarter?"
            value={question}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={running || question.trim().length < 3}
          >
            Ask
          </Button>
        </form>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {questions?.length ? (
          <ul className="mt-2 grid">
            {questions.map((row) => (
              <AnswerRow
                key={row._id}
                question={row}
                disabled={running}
                onRetry={() => void submit(row.question, "better")}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </ContentSection>
  );
}

"use client";

import { ExternalLink, FileText, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageContent,
  PageEmptyState,
  PageFilters,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import type { WorkspaceFile } from "@/features/workspace-discovery/workspace-discovery";
import { filterWorkspaceFiles } from "@/features/workspace-discovery/workspace-discovery";
import { useMemo, useState } from "react";

export type PrecisionFilesProps = {
  files: readonly WorkspaceFile[];
  projectTitles?: Readonly<Record<string, string>>;
  loading?: boolean;
  onOpenProject?: (projectId: string) => void;
};

function fileSizeLabel(file: WorkspaceFile) {
  return [file.category, file.status].filter(Boolean).join(" · ");
}

/** Workspace-wide read-only file index. File writes stay in Project Workspace. */
export function PrecisionFiles({
  files,
  projectTitles = {},
  loading = false,
  onOpenProject,
}: PrecisionFilesProps) {
  const [query, setQuery] = useState("");
  const visibleFiles = useMemo(
    () => filterWorkspaceFiles(files, query),
    [files, query]
  );

  return (
    <WorkspacePage family="data-index">
      <PageContent>
        <PageHeader
          title="Files"
          description="Every project file in your workspace. Manage a file from its project."
        />
        <PageFilters>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-meta)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files, names, or categories"
              aria-label="Search workspace files"
              className="pl-8"
            />
          </div>
          <p
            className="shrink-0 text-meta text-[var(--text-meta)]"
            aria-live="polite"
          >
            {visibleFiles.length} active{" "}
            {visibleFiles.length === 1 ? "file" : "files"}
          </p>
        </PageFilters>
        {loading ? (
          <p className="py-12 text-center text-body text-[var(--text-meta)]">
            Loading workspace files…
          </p>
        ) : visibleFiles.length ? (
          <div
            className="rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-1"
            role="list"
            aria-label="Workspace files"
          >
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                role="listitem"
                className="flex min-h-10 flex-col gap-3 rounded-md px-3 py-2 hover:bg-[var(--surface-active)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText
                    className="mt-1 size-4 shrink-0 text-[var(--text-meta)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium">
                      {file.title}
                    </p>
                    <p className="truncate text-meta text-[var(--text-meta)]">
                      {file.fileName || "No filename"} · {fileSizeLabel(file)}
                    </p>
                    <p className="truncate text-meta text-[var(--text-meta)]">
                      {projectTitles[file.projectId] || "Project"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {onOpenProject ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenProject(file.projectId)}
                    >
                      Open project
                    </Button>
                  ) : null}
                  {file.url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${file.title}`}
                      onClick={() =>
                        window.open(file.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PageEmptyState
            icon={<FileText />}
            title={query.trim() ? "No matches" : "No files yet"}
            description={
              query.trim()
                ? "Clear the search to see every file."
                : "Add a file inside a project to index it here."
            }
            action={
              query.trim() ? (
                <Button variant="ghost" onClick={() => setQuery("")}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </PageContent>
    </WorkspacePage>
  );
}

"use client";

import { ExternalLink, FileText, Search } from "@/components/icons";
import { useMemo, useState } from "react";
import type { WorkspaceFile } from "@/features/workspace-discovery/workspace-discovery";
import { filterWorkspaceFiles } from "@/features/workspace-discovery/workspace-discovery";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { PageContent, PageHeader } from "@/components/workspace-page";

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
    <PageContent className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Files"
        description="Every project file in your workspace. Manage a file from its project."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files, names, or categories"
            aria-label="Search workspace files"
            className="pl-9"
          />
        </div>
        <p
          className="shrink-0 text-muted-foreground type-label-sm"
          aria-live="polite"
        >
          {visibleFiles.length} active{" "}
          {visibleFiles.length === 1 ? "file" : "files"}
        </p>
      </div>
      {loading ? (
        <p className="py-12 text-center text-muted-foreground type-body">
          Loading workspace files…
        </p>
      ) : visibleFiles.length ? (
        <div
          className="divide-y rounded-md border"
          role="list"
          aria-label="Workspace files"
        >
          {visibleFiles.map((file) => (
            <div
              key={file.id}
              role="listitem"
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate type-label">{file.title}</p>
                  <p className="truncate text-muted-foreground type-label-sm">
                    {file.fileName || "No filename"} · {fileSizeLabel(file)}
                  </p>
                  <p className="truncate text-muted-foreground type-label-sm">
                    {projectTitles[file.projectId] || "Project"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onOpenProject ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenProject(file.projectId)}
                  >
                    Open Project
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
        <Empty className="flex-none gap-0 rounded-none border-y border-dashed p-0 py-12 text-center [text-wrap:wrap] md:px-0 md:py-12">
          <p className="type-label">
            {query.trim() ? `No files match "${query.trim()}"` : "No files yet"}
          </p>
          <p className="mt-1 text-muted-foreground type-label-sm">
            {query.trim()
              ? "Clear the search to see every file in your workspace."
              : "Add a file inside a project to index it here."}
          </p>
          {query.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          ) : null}
        </Empty>
      )}
    </PageContent>
  );
}

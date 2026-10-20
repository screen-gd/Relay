"use client";

import { ExternalLink, Search } from "@/components/icons";
import { useMemo, useState } from "react";
import type { WorkspaceFile } from "@/features/workspace-discovery/workspace-discovery";
import { filterWorkspaceFiles } from "@/features/workspace-discovery/workspace-discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageEmptyState,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";

export type PrecisionFilesProps = {
  files: readonly WorkspaceFile[];
  projectTitles?: Readonly<Record<string, string>>;
  loading?: boolean;
  onOpenProject?: (projectId: string) => void;
};

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
    <WorkspacePage family="library">
      <PageHeader
        title="Files"
        description="Every project file in your workspace. Manage a file from its project."
      />
      <PageToolbar
        primary={
          <div className="relative min-w-0 flex-1 sm:max-w-80">
            <Search
              className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-3"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files, names or categories"
              aria-label="Search workspace files"
              className="ps-8"
            />
          </div>
        }
        secondary={
          <p className="text-text-3 type-label-sm data" aria-live="polite">
            {visibleFiles.length} {visibleFiles.length === 1 ? "file" : "files"}
          </p>
        }
      />
      {loading ? (
        <p role="status" className="text-text-2 type-body-sm">
          Loading workspace files…
        </p>
      ) : visibleFiles.length ? (
        <ul
          className="overflow-hidden rounded-frame shadow-[0_0_0_1px_var(--line-row)]"
          aria-label="Workspace files"
        >
          {visibleFiles.map((file) => (
            <li
              key={file.id}
              className="grid gap-x-4 gap-y-2 rule-row px-4 py-3 transition-colors duration-(--dur-fast) hover:bg-hover sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-text-1 type-label">{file.title}</p>
                <p className="mt-0.5 flex gap-3 truncate text-text-3 type-label-sm">
                  <span className="truncate">
                    {file.fileName || "No filename"}
                  </span>
                  {[file.category, file.status].filter(Boolean).map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </p>
              </div>
              <p className="truncate text-text-2 type-label-sm">
                {projectTitles[file.projectId] || "Project"}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {onOpenProject ? (
                  <Button
                    type="button"
                    variant="ghost"
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
                    size="icon-sm"
                    aria-label={`Open ${file.title}`}
                    onClick={() =>
                      window.open(file.url, "_blank", "noopener,noreferrer")
                    }
                  >
                    <ExternalLink />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <PageEmptyState
          className="px-0"
          title={
            query.trim() ? `No files match "${query.trim()}"` : "No files yet"
          }
          description={
            query.trim()
              ? "Clear the search to see every file in your workspace."
              : "Add a file inside a project to list it here."
          }
          action={
            query.trim() ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            ) : null
          }
        />
      )}
    </WorkspacePage>
  );
}

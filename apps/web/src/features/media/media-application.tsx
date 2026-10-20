"use client";

import { PrecisionMedia } from "@/components/precision-media";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { useProjectHistory } from "@/lib/project-history";
import { useProjectAccess } from "@/features/projects/project-access";
import { useProjectActions } from "@/features/projects/project-actions-provider";

export function MediaApplication() {
  const { personalProjects } = useProjectAccess();
  const { openProjectDetails } = useProjectActions();
  // The Delivered collection includes settled deliveries, which are history.
  const { loading } = useProjectHistory();
  if (loading) return <MediaLoading />;
  return (
    <PrecisionMedia
      projects={personalProjects}
      onViewProject={openProjectDetails}
    />
  );
}

/** Holds Media until completed history lands, so its counts are whole. */
function MediaLoading() {
  return (
    <WorkspacePage family="master-detail" mode="fill">
      <PageHeader
        title="Media"
        description="Browse project files, work-in-progress exports, and final deliveries."
      />
      <PageContent>
        <div aria-label="Loading media" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex h-(--row) items-center gap-4 rule-row px-3"
            >
              <Skeleton className="h-2.5 w-48 rounded-inner" />
              <Skeleton className="h-2.5 w-20 rounded-inner" />
            </div>
          ))}
        </div>
      </PageContent>
    </WorkspacePage>
  );
}

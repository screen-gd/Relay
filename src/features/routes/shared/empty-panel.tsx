"use client";

import type { emptyStateAssets } from "@/app/brand-assets";
import { FolderOpen } from "@/components/icons";
import { PageEmptyState } from "@/components/workspace-page";

export function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  assetKey?: keyof typeof emptyStateAssets;
  action?: React.ReactNode;
}) {
  return (
    <PageEmptyState
      icon={<FolderOpen />}
      title={title}
      description={body}
      action={action}
    />
  );
}

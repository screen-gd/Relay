"use client";

import type { emptyStateAssets } from "@/app/brand-assets";

/**
 * An empty region: a title, one line on why, and the action that fills it,
 * at the top-left where content would start. Quartz empty states carry no
 * art, so `assetKey` is accepted for callers and not drawn.
 */
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
    <div className="grid justify-items-start gap-1 px-4 py-5 text-start">
      <h3 className="text-text-1 type-label">{title}</h3>
      <p className="max-w-(--measure-short) text-text-2 type-body-sm">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

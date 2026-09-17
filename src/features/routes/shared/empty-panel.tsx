"use client";

import { emptyStateAssetFor, emptyStateAssets } from "@/app/brand-assets";
import { headingFont } from "./route-theme";

export function EmptyPanel({
  title,
  body,
  assetKey,
  action,
}: {
  title: string;
  body: string;
  assetKey?: keyof typeof emptyStateAssets;
  action?: React.ReactNode;
}) {
  const inferredAsset = emptyStateAssets[emptyStateAssetFor(title)];
  const asset = assetKey ? emptyStateAssets[assetKey] : inferredAsset;
  return (
    <div className="grid justify-items-center px-4 py-8 text-center md:py-10">
      <img
        src={asset}
        alt=""
        aria-hidden="true"
        className="mb-4 h-36 w-44 object-contain drop-shadow-[0_12px_24px_rgba(0,8,12,0.16)] sm:w-[216px]"
      />
      <h3
        className="text-base font-semibold text-[var(--app-ink)]"
        style={{ fontFamily: headingFont }}
      >
        {title}
      </h3>
      <p className="mt-2 max-w-[440px] text-[13px] leading-relaxed text-[var(--app-muted)]">
        {body}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

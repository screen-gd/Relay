import type { Metadata } from "next";
import { Suspense } from "react";
import Home from "../components/Home";
import RoadmapPreview, {
  RoadmapPreviewFallback,
} from "../components/roadmap/RoadmapPreview";
import { siteOpenGraph } from "../lib/site-metadata";

// The roadmap preview reads GitHub per request; lib/roadmap.ts handles caching.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...siteOpenGraph, url: "/" },
};

export default function Page() {
  return (
    <Home
      roadmap={
        <Suspense fallback={<RoadmapPreviewFallback />}>
          <RoadmapPreview />
        </Suspense>
      }
    />
  );
}

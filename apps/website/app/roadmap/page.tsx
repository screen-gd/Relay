import type { Metadata } from "next";
import RoadmapGroups, {
  RoadmapIdea,
} from "../../components/roadmap/RoadmapGroups";
import PageHeader from "../../components/site/PageHeader";
import Reveal from "../../components/site/Reveal";
import { getRoadmap } from "../../lib/roadmap";
import { siteOpenGraph } from "../../lib/site-metadata";

// Read GitHub per request; lib/roadmap.ts handles caching.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Upcoming Relay features and what shipped recently.",
  alternates: { canonical: "/roadmap" },
  openGraph: { ...siteOpenGraph, url: "/roadmap" },
};

/** Full roadmap page grouped by in progress, planned, and recently shipped. */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();

  return (
    <>
      <PageHeader
        title="Roadmap"
        description="What we're building next, and what shipped recently."
      />
      <div className="section">
        <Reveal className="container">
          <RoadmapGroups roadmap={roadmap} />
          <RoadmapIdea />
        </Reveal>
      </div>
    </>
  );
}

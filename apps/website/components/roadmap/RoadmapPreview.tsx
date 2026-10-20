import { connection } from "next/server";
import type { ReactNode } from "react";
import { getRoadmap } from "../../lib/roadmap";
import Reveal from "../site/Reveal";
import SectionHeading from "../site/SectionHeading";
import RoadmapList from "./RoadmapList";
import styles from "./RoadmapPreview.module.css";

const PREVIEW_LIMIT = 6;

function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <section className="section" aria-labelledby="roadmap-preview-title">
      <div className="container">
        <SectionHeading
          id="roadmap-preview-title"
          title="What's next."
          description="Upcoming features we're working on."
          action={{ href: "/roadmap", label: "Full roadmap" }}
        />
        {children}
      </div>
    </section>
  );
}

/** Static placeholder for the home page Suspense boundary while GitHub loads. */
export function RoadmapPreviewFallback() {
  return (
    <PreviewShell>
      <p className={styles.loading}>Loading roadmap…</p>
    </PreviewShell>
  );
}

/**
 * Home page roadmap section: up to six in-progress and planned items from
 * GitHub. Renders nothing when GitHub is unreachable or nothing is upcoming;
 * /roadmap shows those states instead. Render inside
 * `<Suspense fallback={<RoadmapPreviewFallback />}>`.
 */
export default async function RoadmapPreview() {
  // Always render per request so the list never freezes at build time.
  await connection();
  const roadmap = await getRoadmap();
  if (!roadmap.ok) return null;

  const upcoming = roadmap.items
    .filter((item) => item.status !== "shipped")
    .slice(0, PREVIEW_LIMIT);
  if (upcoming.length === 0) return null;

  return (
    <PreviewShell>
      <Reveal delay={0.1}>
        <RoadmapList items={upcoming} />
      </Reveal>
    </PreviewShell>
  );
}

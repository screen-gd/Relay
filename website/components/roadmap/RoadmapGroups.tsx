import { ArrowUpRight } from "lucide-react";
import { CONTACT_EMAIL_URL } from "../../lib/links";
import type { RoadmapResult, RoadmapStatus } from "../../lib/roadmap";
import RoadmapList from "./RoadmapList";
import { RoadmapEmpty, RoadmapError } from "./RoadmapMessage";
import styles from "./RoadmapGroups.module.css";

const GROUPS = [
  { status: "in-progress", heading: "In progress" },
  { status: "planned", heading: "Planned" },
  { status: "shipped", heading: "Recently shipped" },
] as const satisfies readonly { status: RoadmapStatus; heading: string }[];

/** Full roadmap grouped by status. Empty groups are omitted. */
export default function RoadmapGroups({ roadmap }: { roadmap: RoadmapResult }) {
  if (!roadmap.ok) return <RoadmapError />;

  const groups = GROUPS.map((group) => ({
    ...group,
    items: roadmap.items.filter((item) => item.status === group.status),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) return <RoadmapEmpty />;

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section
          key={group.status}
          className={styles.group}
          aria-labelledby={`roadmap-${group.status}`}
        >
          <h2 id={`roadmap-${group.status}`} className={styles.heading}>
            {group.heading}
          </h2>
          <RoadmapList items={group.items} />
        </section>
      ))}
    </div>
  );
}

/** Invitation to suggest a feature by email. */
export function RoadmapIdea() {
  return (
    <section className={styles.idea} aria-labelledby="roadmap-idea">
      <h2 id="roadmap-idea" className={styles.heading}>
        Have an idea?
      </h2>
      <a className={styles.link} href={CONTACT_EMAIL_URL}>
        Email us a feature request
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </section>
  );
}

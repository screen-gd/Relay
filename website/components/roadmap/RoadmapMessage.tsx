import styles from "./RoadmapMessage.module.css";

/** Shown when the roadmap could not be loaded. */
export function RoadmapError() {
  return (
    <div className={styles.message}>
      <p>We couldn&apos;t load the roadmap right now. Try again later.</p>
    </div>
  );
}

/** Shown when the roadmap loaded but has no items to list. */
export function RoadmapEmpty() {
  return (
    <div className={styles.message}>
      <p>No upcoming features are listed yet.</p>
    </div>
  );
}

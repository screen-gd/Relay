import type { RoadmapItem } from "../../lib/roadmap";
import styles from "./RoadmapList.module.css";

/** Plain list of roadmap items separated by hairlines. */
export default function RoadmapList({
  items,
}: {
  items: readonly RoadmapItem[];
}) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.number} className={styles.item}>
          {item.category ? (
            <p className={styles.category}>{item.category}</p>
          ) : null}
          <h3 className={styles.title}>{item.title}</h3>
          {item.summary ? (
            <p className={styles.summary}>{item.summary}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

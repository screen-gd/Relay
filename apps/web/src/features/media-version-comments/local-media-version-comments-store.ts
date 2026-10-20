import {
  readLocalMediaVersionComments,
  writeLocalMediaVersionComments,
} from "./local-media-version-comments";
import type { MediaVersionComment } from "./media-version-comments";

/**
 * One Output's review notes are not the whole story: every panel open on the
 * Project reads and writes the same browser list, so a panel that kept its own
 * copy would write the other panels' notes away. The store below is that one
 * list, shared by every panel on the page.
 */
const NO_COMMENTS: readonly MediaVersionComment[] = [];
let snapshot: readonly MediaVersionComment[] = NO_COMMENTS;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * The notes the browser holds right now. The same reference comes back until a
 * write changes them, so React can compare snapshots cheaply.
 */
export function localMediaVersionCommentsSnapshot(): readonly MediaVersionComment[] {
  if (!loaded && typeof window !== "undefined") {
    snapshot = readLocalMediaVersionComments();
    loaded = true;
  }
  return snapshot;
}

export function subscribeToLocalMediaVersionComments(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reads the shared list, changes it, stores it, and tells every panel. Reading
 * at write time is what keeps a second panel's notes.
 */
export function updateLocalMediaVersionComments(
  updater: (
    current: readonly MediaVersionComment[]
  ) => readonly MediaVersionComment[]
) {
  const current = localMediaVersionCommentsSnapshot();
  const next = updater(current);
  if (sameComments(current, next)) return;
  writeLocalMediaVersionComments(next);
  snapshot = next;
  for (const listener of listeners) listener();
}

function sameComments(
  left: readonly MediaVersionComment[],
  right: readonly MediaVersionComment[]
) {
  return (
    left.length === right.length &&
    left.every((comment, index) => comment === right[index])
  );
}

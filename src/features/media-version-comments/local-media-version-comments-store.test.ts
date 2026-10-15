import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaVersionComment } from "./media-version-comments";
import {
  LOCAL_MEDIA_VERSION_COMMENTS_KEY,
  addLocalMediaVersionComment,
  newLocalMediaVersionCommentId,
  readLocalMediaVersionComments,
  resolveLocalMediaVersionComment,
} from "./local-media-version-comments";

function stubStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
    },
  });
  return entries;
}

/** A fresh store per test: the shared list is module state. */
async function loadStore() {
  const entries = stubStorage();
  vi.resetModules();
  const store = await import("./local-media-version-comments-store");
  return { store, entries };
}

function note(
  outputId: string,
  overrides: Partial<MediaVersionComment> = {}
): MediaVersionComment {
  return {
    id: newLocalMediaVersionCommentId(),
    outputId,
    mediaVersionId: `${outputId}-version`,
    authorName: "Client note",
    body: "Trim the logo at 0:12",
    resolved: false,
    createdAt: "2026-10-15T09:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("shared local review notes", () => {
  it("keeps a note each of two Outputs adds", async () => {
    const { store, entries } = await loadStore();
    // Two panels mount, each reading the list the browser holds.
    expect(store.localMediaVersionCommentsSnapshot()).toEqual([]);
    const first = note("output-a");
    const second = note("output-b");

    store.updateLocalMediaVersionComments((current) =>
      addLocalMediaVersionComment(current, first)
    );
    store.updateLocalMediaVersionComments((current) =>
      addLocalMediaVersionComment(current, second)
    );

    expect(store.localMediaVersionCommentsSnapshot().map((c) => c.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(
      JSON.parse(entries.get(LOCAL_MEDIA_VERSION_COMMENTS_KEY) ?? "[]").length
    ).toBe(2);
  });

  it("writes what the other panel added, not the copy it read first", async () => {
    const { store } = await loadStore();
    // What a panel holds from its first read.
    const capturedOnMount = store.localMediaVersionCommentsSnapshot();
    const first = note("output-a");
    store.updateLocalMediaVersionComments((current) =>
      addLocalMediaVersionComment(current, first)
    );

    // The second panel writes the note it was asked for.
    const second = note("output-b");
    store.updateLocalMediaVersionComments((current) =>
      addLocalMediaVersionComment(current, second)
    );

    expect(capturedOnMount).toEqual([]);
    expect(store.localMediaVersionCommentsSnapshot().map((c) => c.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(readLocalMediaVersionComments().map((c) => c.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it("resolves a note without dropping the other Output's notes", async () => {
    const { store } = await loadStore();
    const kept = note("output-b");
    const resolved = note("output-a");
    store.updateLocalMediaVersionComments(() => [resolved, kept]);

    store.updateLocalMediaVersionComments((current) =>
      resolveLocalMediaVersionComment(
        current,
        resolved.id,
        true,
        "2026-10-15T10:00:00.000Z"
      )
    );

    const stored = store.localMediaVersionCommentsSnapshot();
    expect(stored.map((c) => c.id)).toEqual([resolved.id, kept.id]);
    expect(stored[0].resolved).toBe(true);
    expect(stored[1]).toEqual(kept);
  });

  it("notifies every mounted panel, and only when the notes change", async () => {
    const { store } = await loadStore();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = store.subscribeToLocalMediaVersionComments(first);
    store.subscribeToLocalMediaVersionComments(second);

    const added = note("output-a");
    store.updateLocalMediaVersionComments((current) =>
      addLocalMediaVersionComment(current, added)
    );
    // Pruning notes that are all still there changes nothing.
    store.updateLocalMediaVersionComments((current) => [...current]);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(store.localMediaVersionCommentsSnapshot()).toHaveLength(1);
  });

  it("hands back one reference until a write changes the notes", async () => {
    const { store } = await loadStore();
    const before = store.localMediaVersionCommentsSnapshot();

    expect(store.localMediaVersionCommentsSnapshot()).toBe(before);
    expect(store.localMediaVersionCommentsSnapshot()).toHaveLength(0);

    store.updateLocalMediaVersionComments((current) => [
      ...current,
      note("output-a"),
    ]);

    expect(store.localMediaVersionCommentsSnapshot()).not.toBe(before);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaVersionComment } from "./media-version-comments";
import {
  LOCAL_MEDIA_VERSION_COMMENTS_KEY,
  addLocalMediaVersionComment,
  localCommentsForOutput,
  newLocalMediaVersionCommentId,
  pruneLocalMediaVersionComments,
  readLocalMediaVersionComments,
  resolveLocalMediaVersionComment,
  writeLocalMediaVersionComments,
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

function note(
  overrides: Partial<MediaVersionComment> = {}
): MediaVersionComment {
  return {
    id: newLocalMediaVersionCommentId(),
    outputId: "output-a",
    mediaVersionId: "version-1",
    authorName: "Client note",
    body: "Trim the logo at 0:12",
    timestampSeconds: 12,
    resolved: false,
    createdAt: "2026-10-15T09:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("local review notes", () => {
  it("round-trips a note through browser storage", () => {
    const entries = stubStorage();
    const comment = note();
    writeLocalMediaVersionComments(
      addLocalMediaVersionComment(readLocalMediaVersionComments(), comment)
    );

    expect(entries.get(LOCAL_MEDIA_VERSION_COMMENTS_KEY)).toBeDefined();
    expect(readLocalMediaVersionComments()).toEqual([comment]);
    expect(readLocalMediaVersionComments()[0].timestampSeconds).toBe(12);
  });

  it("ignores stored rows that carry no Media Version", () => {
    const entries = stubStorage();
    entries.set(
      LOCAL_MEDIA_VERSION_COMMENTS_KEY,
      JSON.stringify([{ body: "cannot be attached" }, note()])
    );

    expect(readLocalMediaVersionComments()).toHaveLength(1);
  });

  it("drops the notes of a Media Version that is no longer on the Output", () => {
    const entries = stubStorage();
    const kept = note({ mediaVersionId: "version-2", body: "Add captions" });
    const removed = note({ body: "Trim the logo" });
    writeLocalMediaVersionComments([removed, kept]);

    const survivors = pruneLocalMediaVersionComments(
      readLocalMediaVersionComments(),
      "output-a",
      ["version-2"]
    );
    writeLocalMediaVersionComments(survivors);

    expect(survivors).toEqual([kept]);
    expect(entries.get(LOCAL_MEDIA_VERSION_COMMENTS_KEY)).not.toContain(
      removed.id
    );
  });

  it("keeps the notes of another Output", () => {
    const other = note({ outputId: "output-b" });
    const survivors = pruneLocalMediaVersionComments(
      [other, note()],
      "output-a",
      []
    );

    expect(survivors).toEqual([other]);
  });

  it("reads a resolved note back", () => {
    const open = note();
    const resolved = resolveLocalMediaVersionComment(
      [open],
      open.id,
      true,
      "2026-10-15T10:00:00.000Z"
    )[0];

    expect(resolved.resolved).toBe(true);
    expect(resolved.resolvedAt).toBe("2026-10-15T10:00:00.000Z");
    expect(
      localCommentsForOutput([resolved], "output-a", ["version-1"])
    ).toEqual([resolved]);
  });

  it("lists only the notes an Output still holds, newest first", () => {
    const older = note({ createdAt: "2026-10-14T09:00:00.000Z" });
    const newer = note({ createdAt: "2026-10-15T09:00:00.000Z" });

    expect(
      localCommentsForOutput(
        [older, newer, note({ mediaVersionId: "version-9" })],
        "output-a",
        ["version-1"]
      ).map((comment) => comment.id)
    ).toEqual([newer.id, older.id]);
  });
});

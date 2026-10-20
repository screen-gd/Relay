import { describe, expect, it } from "vitest";
import {
  addMediaVersion,
  createProjectOutput,
  normalizeMediaUrl,
  parseProjectOutputSnapshot,
  unresolvedOldVersionComments,
} from "./project-output-domain";

const output = createProjectOutput({
  id: "output-1",
  projectId: "project-1",
  title: "Main video",
  createdAt: "2026-08-24T10:00:00.000Z",
});

/** Every shape below is the same YouTube video as this link. */
const YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** Every shape below is the same Vimeo video as this link. */
const VIMEO_VIDEO_URL = "https://vimeo.com/123456789";

const YOUTUBE_SHAPES = [
  YOUTUBE_VIDEO_URL,
  "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1234567890",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://www.youtu.be/dQw4w9WgXcQ?si=AbCdEf12",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share",
  "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  "https://www.youtube.com/live/dQw4w9WgXcQ",
];

const VIMEO_VIDEO_SHAPES = [
  VIMEO_VIDEO_URL,
  "https://vimeo.com/123456789/",
  "https://www.vimeo.com/123456789",
  "https://vimeo.com/123456789?share=copy",
  "https://player.vimeo.com/video/123456789",
];

const REJECTED_MEDIA_URLS = [
  "https://www.youtube.com/playlist?list=PL1234567890",
  "https://www.youtube.com/@somechannel",
  "https://www.youtube.com/watch?v=too-short",
  "https://youtu.be/dQw4w9WgXcQ/extra",
  "https://vimeo.com/channels/staffpicks/123456789",
  "https://vimeo.com/abcdef",
  "https://vimeo.com/",
];

describe("Project Output domain", () => {
  it("treats every YouTube and Vimeo link shape as the video it points at", () => {
    const canonicalYoutube = normalizeMediaUrl(YOUTUBE_VIDEO_URL);
    const canonicalVimeo = normalizeMediaUrl(VIMEO_VIDEO_URL);
    expect(canonicalYoutube.ok).toBe(true);
    expect(canonicalVimeo.ok).toBe(true);
    for (const shape of YOUTUBE_SHAPES)
      expect(normalizeMediaUrl(shape), shape).toEqual(canonicalYoutube);
    for (const shape of VIMEO_VIDEO_SHAPES)
      expect(normalizeMediaUrl(shape), shape).toEqual(canonicalVimeo);
  });

  it("keeps the privacy hash that makes an unlisted Vimeo video playable", () => {
    expect(normalizeMediaUrl("https://vimeo.com/123456789/1a2b3c4d5e")).toEqual(
      {
        ok: true,
        value: {
          provider: "vimeo",
          videoId: "123456789",
          url: "https://vimeo.com/123456789/1a2b3c4d5e",
          embedUrl: "https://player.vimeo.com/video/123456789?h=1a2b3c4d5e",
        },
      }
    );
    expect(
      normalizeMediaUrl("https://player.vimeo.com/video/123456789?h=1a2b3c4d5e")
    ).toEqual(normalizeMediaUrl("https://vimeo.com/123456789/1a2b3c4d5e"));
  });

  it("says why a link is refused instead of accepting the wrong video", () => {
    for (const shape of REJECTED_MEDIA_URLS) {
      const result = normalizeMediaUrl(shape);
      expect(result.ok, shape).toBe(false);
      if (!result.ok) expect(result.error, shape).toMatch(/URL/);
    }
  });

  it("normalizes supported providers and preserves ordinary links", () => {
    expect(normalizeMediaUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      ok: true,
      value: {
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
    });
    expect(
      normalizeMediaUrl("https://player.vimeo.com/video/123456789")
    ).toEqual({
      ok: true,
      value: {
        provider: "vimeo",
        videoId: "123456789",
        url: "https://vimeo.com/123456789",
        embedUrl: "https://player.vimeo.com/video/123456789",
      },
    });
    expect(normalizeMediaUrl("http://example.com/review?id=4")).toEqual({
      ok: true,
      value: { provider: "external", url: "http://example.com/review?id=4" },
    });
    expect(
      normalizeMediaUrl(
        '<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>'
      ).ok
    ).toBe(false);
    expect(normalizeMediaUrl("https://www.youtube.com/watch?v=bad").ok).toBe(
      false
    );
    expect(
      normalizeMediaUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")
    ).toEqual(normalizeMediaUrl("https://youtu.be/dQw4w9WgXcQ"));
    expect(
      normalizeMediaUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ")
    ).toMatchObject({ ok: true, value: { provider: "external" } });
    expect(
      normalizeMediaUrl(
        "https://user:password@www.youtube.com/watch?v=dQw4w9WgXcQ"
      ).ok
    ).toBe(false);
  });

  it("makes each added version current while retaining earlier history", () => {
    const first = addMediaVersion(output, [], {
      id: "version-1",
      source: { provider: "external", url: "https://example.com/one" },
      createdAt: "2026-08-24T10:01:00.000Z",
    });
    expect("error" in first).toBe(false);
    if ("error" in first) return;

    const second = addMediaVersion(first.output, [first.version], {
      id: "version-2",
      source: {
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
      createdAt: "2026-08-24T10:02:00.000Z",
    });
    expect("error" in second).toBe(false);
    if ("error" in second) return;
    expect(second.output.currentVersionId).toBe("version-2");
    expect(second.version.versionNumber).toBe(2);
  });

  it("keeps unresolved comments on old versions visible to internal users", () => {
    const current = { ...output, currentVersionId: "version-2" };
    const comments = [
      {
        id: "comment-old",
        mediaVersionId: "version-1",
        body: "Fix the title card.",
        resolved: false,
        createdAt: "2026-08-24T10:01:00.000Z",
      },
      {
        id: "comment-old-resolved",
        mediaVersionId: "version-1",
        body: "Looks good.",
        resolved: true,
        createdAt: "2026-08-24T10:01:00.000Z",
      },
      {
        id: "comment-current",
        mediaVersionId: "version-2",
        body: "Check the mix.",
        resolved: false,
        createdAt: "2026-08-24T10:02:00.000Z",
      },
    ];
    expect(
      unresolvedOldVersionComments(current, [], comments).map(
        (comment) => comment.id
      )
    ).toEqual(["comment-old"]);
  });

  it("validates persisted snapshots instead of trusting array contents", () => {
    expect(
      parseProjectOutputSnapshot({
        outputs: [output],
        versions: [],
        comments: [],
      })
    ).toEqual({ outputs: [output], versions: [], comments: [] });
    expect(
      parseProjectOutputSnapshot({
        outputs: [null],
        versions: [],
        comments: [],
      })
    ).toBeNull();
  });
});

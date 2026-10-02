import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicOutputRow, readPublicPortalAccess } from "./client-portal-view";

describe("public Client Portal boundary", () => {
  it("renders only the allowlisted current-version contract and clear access states", () => {
    expect(readPublicPortalAccess({ access: "invalid_token" })).toEqual({
      kind: "invalid",
    });
    expect(readPublicPortalAccess({ access: "closed" })).toEqual({
      kind: "closed",
    });
    expect(readPublicPortalAccess({ access: "expired" })).toEqual({
      kind: "expired",
    });
    expect(readPublicPortalAccess({ access: "invalid_pin" })).toEqual({
      kind: "pin-required",
      wrongPin: true,
    });

    expect(
      readPublicPortalAccess({
        access: "active",
        project: {
          title: "Launch film",
          stage: "Review",
          progress: 75,
          publicNotes: "Ready for review",
          notes: "private",
          earnings: 9000,
        },
        outputs: [
          {
            id: "main",
            title: "Main film",
            reviewState: "sent_to_client",
            currentVersion: {
              id: "v2",
              title: "Review cut",
              source: {
                kind: "youtube",
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              },
              notes: "private",
            },
            versions: [{ id: "v1" }],
          },
        ],
      })
    ).toEqual({
      kind: "active",
      portal: {
        title: "Launch film",
        notes: "Ready for review",
        stage: "Review",
        progress: 75,
        outputs: [
          {
            id: "main",
            title: "Main film",
            reviewState: "sent_to_client",
            currentVersion: {
              id: "v2",
              label: "Review cut",
              source: {
                provider: "YouTube",
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              },
            },
          },
        ],
      },
    });
  });
});

function renderOutput(source: Record<string, string>) {
  const access = readPublicPortalAccess({
    access: "active",
    project: { title: "Launch film" },
    outputs: [
      {
        id: "main",
        title: "Main film",
        currentVersion: { id: "v2", title: "Review cut", source },
        versions: [
          { id: "v1", source: { url: "https://vimeo.com/987654321" } },
        ],
      },
    ],
  });
  if (access.kind !== "active") throw new Error("Expected an active portal");
  return renderToStaticMarkup(
    createElement(PublicOutputRow, {
      output: access.portal.outputs[0],
      comments: [],
      commentsLoading: false,
      displayName: "",
      onDisplayNameChange: () => {},
      onClearDisplayName: () => {},
      onAddComment: async () => {},
      onReopenComment: async () => {},
      busy: false,
      busyCommentId: "",
    })
  );
}

describe("client hub video playback", () => {
  it("keeps an ordinary link and ignores supplied player metadata", () => {
    const html = renderOutput({
      kind: "youtube",
      url: "https://example.com/review",
      embedUrl: "https://evil.example/player",
    });
    expect(html).not.toContain("<iframe");
    expect(html).toContain('href="https://example.com/review"');
    expect(html).toContain("Open current version");
  });

  it("does not render a player for an output with no shared version", () => {
    const html = renderOutput({ url: "javascript:alert(1)" });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("Open current version");
    expect(html).toContain("No version shared yet");
  });
});

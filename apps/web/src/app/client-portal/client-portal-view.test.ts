import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PublicOutputRow,
  PublicVersionReview,
  readPublicPortalAccess,
} from "./client-portal-view";
import type { MediaVersionComment } from "@/features/media-version-comments/media-version-comments";

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
        editorDisplayName: "Dana Reyes",
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
              versionNumber: 2,
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
        revisions: { used: 2, limit: 3, roundsUsed: 9 },
      })
    ).toEqual({
      kind: "active",
      portal: {
        title: "Launch film",
        editorDisplayName: "Dana Reyes",
        notes: "Ready for review",
        stage: "Review",
        progress: 75,
        revisions: { used: 2, limit: 3 },
        outputs: [
          {
            id: "main",
            title: "Main film",
            reviewState: "sent_to_client",
            currentVersion: {
              id: "v2",
              versionNumber: 2,
              label: "Review cut",
              source: {
                provider: "YouTube",
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              },
              isCurrent: true,
              isLocked: false,
              approved: false,
              approvedAt: null,
              approvedByName: null,
            },
            versions: [
              {
                id: "v2",
                versionNumber: 2,
                label: "Review cut",
                source: {
                  provider: "YouTube",
                  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                },
                isCurrent: true,
                isLocked: false,
                approved: false,
                approvedAt: null,
                approvedByName: null,
              },
            ],
          },
        ],
      },
    });
  });
});

function rowProps(output: unknown) {
  const access = readPublicPortalAccess({
    access: "active",
    project: { title: "Launch film" },
    outputs: [output],
  });
  if (access.kind !== "active") throw new Error("Expected an active portal");
  return {
    output: access.portal.outputs[0],
    token: "token-abc",
    pin: undefined as string | undefined,
    comments: [] as readonly MediaVersionComment[],
    commentsLoading: false,
    displayName: "",
    onDisplayNameChange: () => {},
    onClearDisplayName: () => {},
    onAddComment: async () => {},
    onReopenComment: async () => {},
    onApprove: async () => ({
      approvedAt: "2026-10-21T10:00:00.000Z",
      approvedByName: "Jordan Lee",
    }),
    approvals: {} as Record<
      string,
      { approvedAt: string; approvedByName: string }
    >,
    busy: false,
    busyCommentId: "",
  };
}

function renderOutput(source: Record<string, string>) {
  const props = rowProps({
    id: "main",
    title: "Main film",
    currentVersion: { id: "v2", title: "Review cut", source },
    versions: [{ id: "v1", source: { url: "https://vimeo.com/987654321" } }],
  });
  return renderToStaticMarkup(createElement(PublicOutputRow, props));
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

it("renders the approved changelog beside its version and ignores private draft fields", () => {
  const props = rowProps({
    id: "main",
    title: "Main film",
    currentVersion: {
      id: "v2",
      title: "Version 2",
      source: { url: "https://example.com/cut" },
      changelog: "Contrast improved. <script>bad</script>",
      text: "Private draft",
      clarifyingQuestion: "Internal question",
      possibleNewScope: true,
    },
  });
  const markup = renderToStaticMarkup(createElement(PublicOutputRow, props));
  expect(markup).toContain("What changed");
  expect(markup).toContain(
    "Contrast improved. &lt;script&gt;bad&lt;/script&gt;"
  );
  expect(markup).not.toMatch(
    /Private draft|Internal question|possibleNewScope|<script>/
  );
});

function approvedOutputProps() {
  return rowProps({
    id: "main",
    title: "Main film",
    reviewState: "approved",
    currentVersion: {
      id: "v3",
      versionNumber: 3,
      title: "Final cut",
      source: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      isCurrent: true,
      isLocked: true,
      approved: true,
      approvedAt: "2026-10-21T10:00:00.000Z",
      approvedByName: "Jordan Lee",
    },
    versions: [
      {
        id: "v3",
        versionNumber: 3,
        title: "Final cut",
        source: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        isCurrent: true,
        isLocked: true,
        approved: true,
        approvedAt: "2026-10-21T10:00:00.000Z",
        approvedByName: "Jordan Lee",
      },
      {
        id: "v2",
        versionNumber: 2,
        title: "Review cut",
        source: { url: "https://vimeo.com/987654321" },
        isCurrent: false,
        isLocked: false,
        approved: false,
        approvedAt: null,
        approvedByName: null,
      },
    ],
  });
}

describe("client portal approval and version history", () => {
  it("hides the comment box once approved and locked, showing who approved and when", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicOutputRow, approvedOutputProps())
    );
    expect(markup).toContain("Approved by Jordan Lee · Oct 21, 2026");
    expect(markup).not.toContain("Add comment");
    expect(markup).not.toContain('id="comment-body-v3"');
    expect(markup).not.toContain("Approve version");
  });

  it("offers the approve action on the current version only while it awaits sign-off", () => {
    const props = rowProps({
      id: "main",
      title: "Main film",
      reviewState: "sent_to_client",
      currentVersion: {
        id: "v3",
        versionNumber: 3,
        title: "Final cut",
        source: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        isCurrent: true,
        isLocked: false,
        approved: false,
        approvedAt: null,
        approvedByName: null,
      },
      versions: [
        {
          id: "v3",
          versionNumber: 3,
          title: "Final cut",
          source: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          isCurrent: true,
          isLocked: false,
          approved: false,
          approvedAt: null,
          approvedByName: null,
        },
        {
          id: "v2",
          versionNumber: 2,
          title: "Review cut",
          source: { url: "https://vimeo.com/987654321" },
          isCurrent: false,
          isLocked: false,
          approved: false,
          approvedAt: null,
          approvedByName: null,
        },
      ],
    });
    const markup = renderToStaticMarkup(createElement(PublicOutputRow, props));
    expect(markup).toContain("Approve version");
  });

  it("switching from v3 to v2 renders comments read-only with no comment form", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicVersionReview, {
        versionId: "v2",
        supportsPlayerTimestamps: true,
        comments: [
          {
            id: "c1",
            outputId: "main",
            mediaVersionId: "v2",
            authorName: "Jordan Lee",
            body: "Tighten the opening",
            timestampSeconds: 60,
            resolved: false,
            createdAt: "2026-10-20T09:00:00.000Z",
          },
          {
            id: "c2",
            outputId: "main",
            mediaVersionId: "v3",
            authorName: "Jordan Lee",
            body: "Latest review note",
            resolved: false,
            createdAt: "2026-10-21T09:00:00.000Z",
          },
        ] as readonly MediaVersionComment[],
        loading: false,
        readOnly: true,
        notice: "Earlier version — read only",
        displayName: "",
        onDisplayNameChange: () => {},
        onClearDisplayName: () => {},
        onSubmit: async () => {},
        onReopen: async () => {},
      })
    );
    expect(markup).toContain("Earlier version — read only");
    // Only the v2 thread is shown and the form is gone; the timecode stays.
    expect(markup).toContain("Tighten the opening");
    expect(markup).not.toContain("Latest review note");
    expect(markup).not.toContain("Add comment");
    expect(markup).not.toContain('id="comment-body-v2"');
    expect(markup).not.toContain("Clear saved name");
  });
});

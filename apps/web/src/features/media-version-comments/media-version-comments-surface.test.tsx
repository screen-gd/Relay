import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MediaVersionComments,
  PublicMediaVersionComments,
} from "@/components/media-version-comments";
import { FrameAnnotationEditor } from "./annotation-overlay";

const visit = { isSignedIn: false, isAuthenticated: false };

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: visit.isAuthenticated,
    isLoading: false,
  }),
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@/lib/optional-auth", () => ({
  useOptionalAuth: () => ({
    isLoaded: true,
    status: "ready",
    isSignedIn: visit.isSignedIn,
    user: null,
    openSignIn: () => undefined,
    openSignUp: () => undefined,
    signOut: async () => undefined,
  }),
}));

function renderVersion(revisionsEnabled: boolean) {
  return renderToStaticMarkup(
    createElement(MediaVersionComments, {
      versions: [
        {
          id: "version-1",
          outputId: "output-a",
          versionNumber: 1,
          label: "Fine cut",
          current: true,
        },
      ],
      comments: [],
      revisionsEnabled,
      canEditRevisions: true,
    })
  );
}

beforeEach(() => {
  visit.isSignedIn = false;
  visit.isAuthenticated = false;
});

describe("version review surface", () => {
  it("shows selected marks on a frame without an embedded player", () => {
    const html = renderToStaticMarkup(
      createElement(FrameAnnotationEditor, {
        shapes: [],
        onChange: vi.fn(),
        label: "Frame notes",
        disabled: true,
        preview: {
          shapes: [{ type: "pin", x: 0.5, y: 0.5 }],
          label: "Frame marks from Client's comment",
        },
      })
    );
    expect(html).toContain(
      'aria-label="Frame marks from Client&#x27;s comment"'
    );
    expect(html).toContain('cx="80"');
    expect(html).toContain("aspect-video");
  });

  it("lets an untimed drawing be selected without seeking a player", () => {
    const html = renderToStaticMarkup(
      createElement(PublicMediaVersionComments, {
        versionId: "version-1",
        comments: [
          {
            id: "untimed-drawing",
            outputId: "output-a",
            mediaVersionId: "version-1",
            authorName: "Client",
            body: "Move this logo",
            annotations: [{ type: "pin", x: 0.5, y: 0.5 }],
            resolved: false,
            createdAt: "2026-10-23T00:00:00Z",
          },
        ],
        displayName: "Client",
        onDisplayNameChange: vi.fn(),
        onClearDisplayName: vi.fn(),
        onSubmit: async () => {},
        onReopen: async () => {},
        onCommentSelect: vi.fn(),
      })
    );
    expect(html).toContain('aria-label="Show frame marks on the player"');
    expect(html).not.toContain("Jump to");
  });

  it("offers the note box on a version in a local workspace", () => {
    const html = renderVersion(false);

    expect(html).toContain("Client note");
    expect(html).toContain("Timecode (optional)");
    expect(html).toContain("Add note");
  });

  it("shows the AI actions locked instead of leaving them out", () => {
    const html = renderVersion(false);

    expect(html).toContain("Turn feedback into revisions");
    expect(html).toContain("Draft a version changelog");
    expect(html).toContain("Match comments in a transcript");
    expect(html).toContain("Sign in to use AI");
  });

  it("runs the AI actions in a signed-in workspace", () => {
    visit.isSignedIn = true;
    visit.isAuthenticated = true;
    const html = renderVersion(true);

    expect(html).toContain("Turn feedback into revisions");
    expect(html).toContain("Draft a version changelog");
    expect(html).not.toContain('data-slot="ai-locked-notice"');
    expect(html).not.toContain("Add note");
  });
});

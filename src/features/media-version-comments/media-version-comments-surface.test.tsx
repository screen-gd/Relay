import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaVersionComments } from "@/components/media-version-comments";

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
  it("offers the note box on a version in a local workspace", () => {
    const html = renderVersion(false);

    expect(html).toContain("Client note");
    expect(html).toContain("Timecode (optional)");
    expect(html).toContain("Add note");
  });

  it("shows the AI actions locked instead of leaving them out", () => {
    const html = renderVersion(false);

    expect(html).toContain("Turn feedback into revisions");
    expect(html).toContain("Draft the changelog");
    expect(html).toContain("Match ambiguous comments");
    expect(html).toContain("Sign in to use AI");
  });

  it("runs the AI actions in a signed-in workspace", () => {
    visit.isSignedIn = true;
    visit.isAuthenticated = true;
    const html = renderVersion(true);

    expect(html).toContain("Turn feedback into revisions");
    expect(html).toContain("Draft changelog");
    expect(html).not.toContain('data-slot="ai-locked-notice"');
    expect(html).not.toContain("Add note");
  });
});

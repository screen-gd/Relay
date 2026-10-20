import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StatusDrafts } from "./status-drafts";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  hasAccount: false,
  aiEnabled: false,
  drafts: [] as Array<{
    _id: string;
    projectId: string;
    runId: string;
    channel: "portal" | "email" | "whatsapp";
    text: string;
    sourceOutputIds: string[];
    sourceCommentIds: string[];
  }>,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.isAuthenticated }),
  // `statusDrafts.list` is the only query asked for one Project's rows.
  useQuery: (_query: unknown, args: unknown) =>
    args && typeof args === "object" && "projectId" in args
      ? state.drafts
      : undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@/lib/optional-auth", () => ({
  useOptionalAuth: () => ({
    isSignedIn: state.hasAccount,
    openSignIn: () => undefined,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

const savedDraft = {
  _id: "draft-1",
  projectId: "project-1",
  runId: "run-1",
  channel: "portal" as const,
  text: "Nadia, the cut is with you now.",
  sourceOutputIds: ["project-1:output:1"],
  sourceCommentIds: [],
};

beforeEach(() => {
  state.isAuthenticated = false;
  state.hasAccount = false;
  state.aiEnabled = false;
  state.drafts = [];
});

function render() {
  return renderToStaticMarkup(
    <StatusDrafts
      projectId="project-1"
      portalId={"portal-1" as Id<"projectPortals">}
      aiEnabled={state.aiEnabled}
    />
  );
}

test("shows the locked draft where the action lives without an account", () => {
  const html = render();
  expect(html).toContain("Client update");
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Draft a client status update");
  expect(html).toContain("Sign in to use AI");
  expect(html).not.toContain("Update channel");
});

test("points a Workspace with AI off at Settings", () => {
  state.isAuthenticated = true;
  state.hasAccount = true;
  const html = render();
  expect(html).toContain("Draft a client status update");
  expect(html).toContain("Turn on AI in Settings");
  expect(html).not.toContain("Sign in to use AI");
  expect(html).not.toContain("Update channel");
});

test("keeps a saved draft readable, editable, and publishable while AI is off", () => {
  state.isAuthenticated = true;
  state.hasAccount = true;
  state.drafts = [savedDraft];

  const html = render();

  expect(html).toContain("Nadia, the cut is with you now.");
  expect(html).toContain("Update channel");
  expect(html).toContain("Save draft");
  expect(html).toContain("Copy text");
  expect(html).toContain("Replace portal note");
  // The lock stands in for generation and nothing else.
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Turn on AI in Settings");
  expect(html).not.toContain("Retry with better model");
});

test("offers the channel and draft button to a Workspace that can run AI", () => {
  state.isAuthenticated = true;
  state.hasAccount = true;
  state.aiEnabled = true;
  const html = render();
  expect(html).toContain("Update channel");
  expect(html).toContain("Draft a client status update");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

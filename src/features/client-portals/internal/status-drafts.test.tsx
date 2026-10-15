import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { StatusDrafts } from "./status-drafts";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  hasAccount: false,
  aiEnabled: false,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.isAuthenticated }),
  useQuery: () => undefined,
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

beforeEach(() => {
  state.isAuthenticated = false;
  state.hasAccount = false;
  state.aiEnabled = false;
});

function render() {
  return renderToStaticMarkup(
    <StatusDrafts projectId="project-1" aiEnabled={state.aiEnabled} />
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

test("offers the channel and draft button to a Workspace that can run AI", () => {
  state.isAuthenticated = true;
  state.hasAccount = true;
  state.aiEnabled = true;
  const html = render();
  expect(html).toContain("Update channel");
  expect(html).toContain("Draft a client status update");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

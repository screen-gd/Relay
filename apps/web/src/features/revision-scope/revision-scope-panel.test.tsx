import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { RevisionScopePanel } from "./revision-scope-panel";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }),
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  state.isAuthenticated = false;
  state.isLoading = false;
});

function render() {
  return renderToStaticMarkup(<RevisionScopePanel projectId="project-1" />);
}

test("shows the locked change order where it lives without an account", () => {
  const html = render();
  expect(html).toContain("Revision rounds");
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Draft a change order");
  expect(html).toContain("Sign in to use AI");
});

test("waits for sign-in to resolve instead of flashing a lock", () => {
  state.isLoading = true;
  expect(render()).toBe("");
});

test("waits for the rounds the Workspace counts, not for a lock", () => {
  state.isAuthenticated = true;
  expect(render()).toBe("");
});

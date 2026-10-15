import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../../../../convex/_generated/api";
import { StatusDrafts } from "./status-drafts";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.isAuthenticated }),
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  state.isAuthenticated = false;
});

function render() {
  return renderToStaticMarkup(<StatusDrafts projectId="project-1" />);
}

test("shows the locked draft where the action lives without an account", () => {
  const html = render();
  expect(html).toContain("Client update");
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Draft a client status update");
  expect(html).toContain("Sign in to use AI");
  expect(html).not.toContain("Update channel");
  expect(html).not.toContain("Draft update");
});

test("offers the channel and draft button to a signed-in Workspace", () => {
  state.isAuthenticated = true;
  const html = render();
  expect(html).toContain("Draft update");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

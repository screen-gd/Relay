import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EarningsQa } from "./earnings-qa";

const workspaceId = "workspace-1" as Id<"teamWorkspaces">;

const state = vi.hoisted(() => ({
  isAuthenticated: true,
  aiEnabled: false,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.isAuthenticated }),
  useQuery: (fn: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(fn) === "aiRuns:getSummary"
      ? {
          enabled: state.aiEnabled,
          canManage: true,
          googleConfigured: true,
          openaiConfigured: false,
          month: "2026-10",
          limit: 300,
          used: 0,
          remaining: 300,
          resetsAt: Date.UTC(2026, 10, 1),
        }
      : undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  state.isAuthenticated = true;
  state.aiEnabled = false;
});

function render() {
  return renderToStaticMarkup(<EarningsQa workspaceId={workspaceId} />);
}

test("keeps the section and names the locked question while Workspace AI is off", () => {
  const html = render();
  expect(html).toContain("Ask about earnings");
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Ask about your earnings");
  expect(html).toContain("Turn on AI in Settings");
  expect(html).not.toContain('aria-label="Earnings question"');
});

test("locks the question behind sign-in when the visit has no account", () => {
  state.isAuthenticated = false;
  const html = render();
  expect(html).toContain("Sign in to use AI");
});

test("offers the question box once Workspace AI is on", () => {
  state.aiEnabled = true;
  const html = render();
  expect(html).toContain('aria-label="Earnings question"');
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { WorkspaceAiSettings } from "./workspace-ai-settings";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  summary: undefined as
    FunctionReturnType<typeof api.aiRuns.getSummary> | undefined,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.isAuthenticated }),
  useQuery: () => state.summary,
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));

beforeEach(() => {
  state.isAuthenticated = false;
  state.summary = undefined;
});

function render() {
  return renderToStaticMarkup(<WorkspaceAiSettings notify={vi.fn()} />);
}

test("AI consent is off and disabled without an authenticated workspace", () => {
  const html = render();
  expect(html).toContain("AI assistance");
  expect(html).toContain('aria-checked="false"');
  expect(html).toContain('disabled=""');
  expect(html).toContain("Connect an authenticated workspace");
  expect(html).toContain("Clients and Viewers cannot run AI");
});

test("the Owner sees persisted consent and shared quota usage", () => {
  state.isAuthenticated = true;
  state.summary = {
    enabled: true,
    canManage: true,
    googleConfigured: true,
    openaiConfigured: false,
    month: "2026-10",
    limit: 900,
    used: 25,
    remaining: 875,
    resetsAt: Date.UTC(2026, 10, 1),
  };
  const html = render();
  expect(html).toContain('aria-checked="true"');
  expect(html).toContain("Gemini API key");
  expect(html).toContain("OpenAI API key");
  expect(html).toContain('type="password"');
  expect(html).toContain("Enter a replacement key");
  expect(html).toContain("Remove key");
  expect(html).toContain("25 of 900 runs used this month. 875 remaining.");
  expect(html).toContain("UTC");
});

test("non-owners see the allowance but cannot change consent", () => {
  state.summary = {
    enabled: true,
    canManage: false,
    googleConfigured: true,
    openaiConfigured: false,
    month: "2026-10",
    limit: 300,
    used: 300,
    remaining: 0,
    resetsAt: Date.UTC(2026, 10, 1),
  };
  const html = render();
  expect(html).toContain('disabled=""');
  expect(html).toContain("Only the Workspace Owner can change this setting.");
  expect(html).toContain("0 remaining.");
  expect(html).not.toContain('type="password"');
  expect(html).not.toContain("Remove key");
});

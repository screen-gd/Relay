import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BriefImport } from "./brief-import";

const workspace = {
  _id: "workspace-1" as Id<"teamWorkspaces">,
  _creationTime: 0,
  ownerUserId: "user-1",
  name: "Studio",
  aiEnabled: true,
};

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  workspace: undefined as typeof workspace | null | undefined,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }),
  useQuery: (fn: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(fn) === "briefImport:workspace"
      ? state.workspace
      : undefined,
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  state.isAuthenticated = false;
  state.isLoading = false;
  state.workspace = undefined;
});

function render() {
  return renderToStaticMarkup(
    <BriefImport
      clients={[]}
      onCreated={vi.fn()}
      open={false}
      onOpenChange={vi.fn()}
    />
  );
}

test("names the locked import in local mode instead of hiding it", () => {
  const html = render();
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Import a brief");
  expect(html).toContain("Sign in to use AI");
  expect(html).not.toContain("Paste your brief");
});

test("points a signed-in Workspace without one at Settings", () => {
  state.isAuthenticated = true;
  state.workspace = null;
  const html = render();
  expect(html).toContain("Import a brief");
  expect(html).toContain("Turn on AI in Settings");
});

test("locks the import while the Workspace has AI off", () => {
  state.isAuthenticated = true;
  state.workspace = { ...workspace, aiEnabled: false };
  const html = render();
  expect(html).toContain("Import a brief");
  expect(html).toContain("Turn on AI in Settings");
  expect(html).not.toContain("Paste your brief");
});

test("waits instead of flashing a lock while the workspace loads", () => {
  state.isAuthenticated = true;
  expect(render()).toBe("");
});

test("waits for sign-in to resolve instead of flashing a lock", () => {
  state.isLoading = true;
  expect(render()).toBe("");
});

test("offers the import to a connected Workspace", () => {
  state.isAuthenticated = true;
  state.workspace = workspace;
  const html = render();
  expect(html).toContain("Import brief");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { ChangeOrderDraft } from "./change-order-draft";

type Summary = NonNullable<
  FunctionReturnType<typeof api.revisionRounds.getSummary>
>;

const summary: Summary = {
  canEdit: true,
  aiEnabled: false,
  includedRounds: 2,
  limitSource: "workspace",
  roundBasis: "per_output",
  basisSource: "default",
  roundsUsed: 1,
  extraRounds: 3,
  truncated: false,
  currencyCode: "USD",
  extraRoundRate: 120,
  extraHourRate: 60,
  outputs: [],
};

const state = vi.hoisted(() => ({
  isAuthenticated: true,
  aiEnabled: false,
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
  state.isAuthenticated = true;
  state.aiEnabled = false;
});

function render() {
  return renderToStaticMarkup(
    <ChangeOrderDraft
      projectId="project-1"
      summary={{ ...summary, aiEnabled: state.aiEnabled }}
    />
  );
}

test("keeps the coded amounts and names the locked draft while AI is off", () => {
  const html = render();
  expect(html).toContain("Extra rounds");
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Draft a change order");
  expect(html).toContain("Turn on AI in Settings");
  expect(html).not.toContain("Turn on AI in Settings to draft");
  expect(html).not.toContain(">Draft change order<");
});

test("locks the draft behind sign-in when the visit has no account", () => {
  state.isAuthenticated = false;
  const html = render();
  expect(html).toContain("Sign in to use AI");
});

test("offers the draft once Workspace AI is on", () => {
  state.aiEnabled = true;
  const html = render();
  expect(html).toContain("Draft change order");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DeadlineRiskRadar } from "./deadline-risk-radar";

const workspaceId = "workspace-1" as Id<"teamWorkspaces">;

const radar = {
  evaluatedOn: "2026-10-15",
  updatedAt: null,
  truncated: false,
  findings: [
    {
      _id: "finding-1" as Id<"deadlineRiskFindings">,
      _creationTime: 0,
      workspaceId,
      kind: "overdue",
      severity: "high",
      waitingOn: "editor",
      subject: "project",
      projectId: "project-1",
      projectTitle: "Launch film",
      state: "In Progress",
      dueDate: "2026-10-12",
      daysUntilDue: -3,
      relatedOutputIds: [],
    },
  ],
} satisfies FunctionReturnType<typeof api.deadlineRisk.listFindings>;

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
          limit: 900,
          used: 0,
          remaining: 900,
          resetsAt: Date.UTC(2026, 10, 1),
        }
      : getFunctionName(fn) === "deadlineRisk:listFindings"
        ? radar
        : undefined,
  useMutation: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  linkOptions: (options: unknown) => options,
}));

beforeEach(() => {
  state.isAuthenticated = true;
  state.aiEnabled = false;
});

function render() {
  return renderToStaticMarkup(<DeadlineRiskRadar workspaceId={workspaceId} />);
}

test("names the locked digest and points at Settings while Workspace AI is off", () => {
  const html = render();
  expect(html).toContain('data-slot="ai-locked-notice"');
  expect(html).toContain("Flag deadline risk");
  expect(html).toContain("Turn on AI in Settings");
  expect(html).toContain("Launch film");
  expect(html).not.toContain("Draft digest");
});

test("locks the digest behind sign-in when the visit has no account", () => {
  state.isAuthenticated = false;
  const html = render();
  expect(html).toContain("Sign in to use AI");
  expect(html).not.toContain("Turn on AI in Settings");
});

test("offers the digest once Workspace AI is on", () => {
  state.aiEnabled = true;
  const html = render();
  expect(html).toContain("Draft digest");
  expect(html).not.toContain('data-slot="ai-locked-notice"');
});

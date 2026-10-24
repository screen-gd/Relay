import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { ProjectHistoryProvider } from "@/lib/project-history";
import type { WorkItem } from "@/lib/types";
import { ClientsApplication } from "./clients-application";

const base: WorkItem = {
  id: "live",
  profileId: "video-editor",
  title: "Live cut",
  clientId: "client-acme",
  client: "Acme",
  status: "In Progress",
  workType: "Client Work",
  startDate: "2026-10-01",
  dueDate: "2026-10-08",
  earnings: 300,
  notes: "",
};
// A paid delivery and an archived Project are history, outside the live list.
const projects: WorkItem[] = [
  base,
  { ...base, id: "paid", status: "Delivered", paid: true, earnings: 1200 },
  { ...base, id: "archived", archived: true, earnings: 0 },
];

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));
vi.mock("@/lib/data-context", () => ({
  useData: () => ({ settings: createDefaultSettings() }),
}));
vi.mock("@/features/projects/project-access", () => ({
  useProjectAccess: () => ({ personalProjects: projects }),
}));
vi.mock("@/features/projects/project-actions-provider", () => ({
  useProjectActions: () => ({ openProjectDetails: vi.fn() }),
}));
vi.mock("./use-client-actions", () => ({
  useClientActions: () => ({ addClient: vi.fn(), updateClient: vi.fn() }),
}));

function renderClients(history: {
  historyLoading: boolean;
  historyIncluded: boolean;
}) {
  return renderToStaticMarkup(
    <ProjectHistoryProvider
      controls={{
        requestHistory: () => () => undefined,
        pinProject: () => () => undefined,
        isPinResolved: () => true,
        ...history,
      }}
    >
      <ClientsApplication />
    </ProjectHistoryProvider>
  );
}

describe("Client history", () => {
  it("holds totals until completed history has loaded", () => {
    for (const history of [
      { historyLoading: false, historyIncluded: false },
      { historyLoading: true, historyIncluded: true },
    ]) {
      const html = renderClients(history);
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toContain("1,200");
    }
  });

  it("totals the paid delivery and leaves archived work out of active", () => {
    const html = renderClients({
      historyLoading: false,
      historyIncluded: true,
    });
    expect(html).not.toContain('aria-busy="true"');
    expect(html).toContain("1 active");
    expect(html).toContain("1 delivered");
    expect(html).toContain("1,200");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectHistoryProvider } from "@/lib/project-history";
import { createDefaultSettings } from "./settings-defaults";
import { SettingsDesignPage } from "./settings-page";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useSearch: () => ({ section: "data" }),
}));
vi.mock("./settings-controller", () => ({
  useSettingsController: () => ({
    exportBackup: () => "{}",
    importBackup: vi.fn(),
    settingsSaveState: "saved",
    retrySettingsSave: vi.fn(),
    updateWorkspaceSettings: vi.fn(),
  }),
}));

/** The disabled state of each export button on the data section. */
function exportButtons(historyLoading: boolean) {
  const html = renderToStaticMarkup(
    <ProjectHistoryProvider
      controls={{
        requestHistory: () => () => undefined,
        pinProject: () => () => undefined,
        isPinResolved: () => true,
        historyLoading,
        historyIncluded: true,
      }}
    >
      <SettingsDesignPage
        settings={createDefaultSettings()}
        setSettings={vi.fn()}
        notify={vi.fn()}
        projects={[]}
        salaryBatches={[]}
        canManageFinance
      />
    </ProjectHistoryProvider>
  );
  return Object.fromEntries(
    html
      .split("<button")
      .slice(1)
      .map((button) => {
        const end = button.indexOf(">");
        const attrs = button.slice(0, end);
        const label = button
          .slice(end + 1, button.indexOf("</button>"))
          .replace(/<[^>]*>/g, "")
          .trim();
        return [label, /\sdisabled=""/.test(attrs)] as const;
      })
      .filter(([label]) => label.startsWith("Export"))
  );
}

describe("Workspace exports", () => {
  // Completed Projects are history; a backup or CSV taken before it lands
  // would silently drop them.
  it("waits for completed history before exporting projects", () => {
    expect(exportButtons(true)).toEqual({
      "Export backup": true,
      "Export projects CSV": true,
      "Export clients CSV": false,
      "Export payments CSV": true,
    });
    expect(Object.values(exportButtons(false))).not.toContain(true);
  });
});

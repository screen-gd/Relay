import { runInNewContext } from "node:vm";
import { afterEach, expect, test, vi } from "vitest";
import { applyRootThemeVariables, themeBootScript } from "./route-theme";

afterEach(() => vi.unstubAllGlobals());

test.each(["Light", "Dark"])(
  "route head updates preserve the active %s theme and accent",
  (theme) => {
    const properties = new Map<string, string>();
    const root = {
      dataset: { theme: "" },
      style: {
        colorScheme: "",
        setProperty: (name: string, value: string) =>
          properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
      classList: { toggle: vi.fn() },
    };
    const document = { documentElement: root };
    const window = {
      matchMedia: () => ({ matches: false }),
      localStorage: {
        getItem: () =>
          JSON.stringify({
            theme: theme === "Light" ? "Dark" : "Light",
            accentColor: "",
          }),
      },
    };
    vi.stubGlobal("document", document);
    vi.stubGlobal("window", window);
    const context = { document, window };
    runInNewContext(themeBootScript, context);

    applyRootThemeVariables({ theme, accentColor: "#2563eb" });
    const activeProperties = new Map(properties);
    // The router can reinsert a head script on page and hash navigation.
    runInNewContext(themeBootScript, context);

    expect(root.dataset.theme).toBe(theme.toLowerCase());
    expect(root.style.colorScheme).toBe(theme.toLowerCase());
    expect(root.classList.toggle).toHaveBeenLastCalledWith(
      "dark",
      theme === "Dark"
    );
    expect(properties).toEqual(activeProperties);
  }
);

import { relay } from "@/app/design-system";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, test, vi } from "vitest";
import { applyRootThemeVariables, themeBootScript } from "./route-theme";

const accents = [
  relay.accent,
  "#000000",
  "#ffffff",
  "#111827",
  "#fef08a",
  "#2563eb",
  "#e879f9",
  "#777777",
  "#7f7f7f",
];

function rootHarness(prefersDark = false) {
  const properties = new Map<string, string>();
  const root = {
    style: {
      colorScheme: "",
      setProperty: (key: string, value: string) => properties.set(key, value),
      removeProperty: (key: string) => properties.delete(key),
    },
    dataset: { theme: "" },
    classList: { toggle: vi.fn() },
  };
  const document = { documentElement: root };
  const window = { matchMedia: () => ({ matches: prefersDark }) };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  return { root, properties, document, window };
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

afterEach(() => vi.unstubAllGlobals());

describe("accent preference", () => {
  test.each(["Light", "Dark"])(
    "navigation cannot replace the current %s theme with stale startup preferences",
    (theme) => {
      const current = rootHarness();
      const context = {
        document: current.document,
        window: {
          ...current.window,
          localStorage: {
            getItem: () =>
              JSON.stringify({
                theme: theme === "Light" ? "Dark" : "Light",
                accentColor: "",
              }),
          },
        },
      };
      runInNewContext(themeBootScript, context);
      applyRootThemeVariables({ theme, accentColor: "#2563eb" });
      const properties = new Map(current.properties);
      // Head scripts can be reinserted when a route or its hash changes.
      runInNewContext(themeBootScript, context);
      expect(current.root.dataset.theme).toBe(theme.toLowerCase());
      expect(current.properties).toEqual(properties);
    }
  );

  test.each(["Light", "Dark"])(
    "applies every swatch with readable text in %s",
    (theme) => {
      const { properties } = rootHarness();
      for (const accentColor of accents) {
        applyRootThemeVariables({ theme, accentColor });
        expect(properties.get("--accent")).toBe(accentColor);
        const foreground = properties.get("--accent-foreground");
        const backgroundLuminance = luminance(accentColor);
        const ratio =
          foreground === "#ffffff"
            ? 1.05 / (backgroundLuminance + 0.05)
            : (backgroundLuminance + 0.05) / (luminance("#0b0c0e") + 0.05);
        expect(ratio).toBeCloseTo(
          Math.max(
            1.05 / (backgroundLuminance + 0.05),
            (backgroundLuminance + 0.05) / (luminance("#0b0c0e") + 0.05)
          )
        );
        const mark = properties.get("--accent-mark");
        expect(mark).toBeDefined();
        const markLuminance = luminance(mark ?? "");
        const markRatio =
          theme === "Dark"
            ? (markLuminance + 0.05) / 0.05
            : 1.05 / (markLuminance + 0.05);
        expect(markRatio).toBeGreaterThanOrEqual(3);
        expect([...properties.keys()]).toEqual([
          "--accent",
          "--accent-foreground",
          "--accent-mark",
        ]);
      }
    }
  );

  test("reset removes all three inline overrides", () => {
    const { properties } = rootHarness();
    applyRootThemeVariables({ theme: "Light", accentColor: "#e879f9" });
    applyRootThemeVariables(createDefaultSettings());
    expect(properties.size).toBe(0);
  });

  test.each(["", "red", "#fff", "#12345g", "url(evil)"])(
    "clears invalid stored color %s",
    (accentColor) => {
      const { properties } = rootHarness();
      applyRootThemeVariables({ theme: "Dark", accentColor: "#0891b2" });
      applyRootThemeVariables({ theme: "Dark", accentColor });
      expect(properties.size).toBe(0);
    }
  );

  test.each([...accents, "#14B8A6", "", "invalid"])(
    "boot matches runtime for stored %s",
    (accentColor) => {
      const settings = { theme: "System", accentColor };
      const runtime = rootHarness(true);
      applyRootThemeVariables(settings);
      const boot = rootHarness(true);
      runInNewContext(themeBootScript, {
        document: boot.document,
        window: {
          ...boot.window,
          localStorage: { getItem: () => JSON.stringify(settings) },
        },
      });
      expect(boot.properties).toEqual(runtime.properties);
      expect(boot.root.style.colorScheme).toBe(runtime.root.style.colorScheme);
      expect(boot.root.dataset.theme).toEqual(runtime.root.dataset.theme);
      expect(boot.root.classList.toggle).toHaveBeenCalledWith("dark", true);
    }
  );

  test.each([
    null,
    "null",
    "{}",
    "malformed{",
    '{"theme":"invalid","accentColor":"invalid"}',
  ])("boot uses CSS defaults for absent or invalid preferences %s", (raw) => {
    const boot = rootHarness();
    runInNewContext(themeBootScript, {
      document: boot.document,
      window: { localStorage: { getItem: () => raw } },
    });
    expect(boot.properties.size).toBe(0);
    expect(boot.root.dataset.theme).toBe("dark");
    expect(boot.root.classList.toggle).toHaveBeenCalledWith("dark", true);
  });

  test("System falls back to light when matchMedia is unavailable", () => {
    const boot = rootHarness();
    vi.stubGlobal("window", {});
    applyRootThemeVariables({ theme: "System", accentColor: "#2563eb" });
    expect(boot.root.dataset.theme).toBe("light");
    runInNewContext(themeBootScript, {
      document: boot.document,
      window: {
        localStorage: {
          getItem: () =>
            JSON.stringify({ theme: "System", accentColor: "#2563eb" }),
        },
      },
    });
    expect(boot.root.classList.toggle).toHaveBeenCalledWith("dark", false);
    expect(boot.properties.get("--accent")).toBe("#2563eb");
  });
});

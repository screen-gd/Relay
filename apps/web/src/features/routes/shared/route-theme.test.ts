import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, test, vi } from "vitest";
import { relay } from "@/app/design-system";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { applyRootThemeVariables, themeBootScript } from "./route-theme";

const accents = [
  relay.color.teal,
  relay.color.cyan,
  relay.color.sky,
  relay.color.indigo,
  relay.color.pink,
  relay.color.deepTeal,
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
    "applies every swatch with readable text in %s",
    (theme) => {
      const { properties } = rootHarness();
      for (const accentColor of accents) {
        applyRootThemeVariables({ theme, accentColor });
        expect(properties.get("--app-accent")).toBe(accentColor);
        const foreground = properties.get("--app-accent-foreground");
        const backgroundLuminance = luminance(accentColor);
        const ratio =
          foreground === "#ffffff"
            ? 1.05 / (backgroundLuminance + 0.05)
            : (backgroundLuminance + 0.05) / 0.05;
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect([...properties.keys()]).toEqual([
          "--app-accent",
          "--app-accent-foreground",
        ]);
      }
    }
  );

  test("reset removes both inline overrides", () => {
    const { properties } = rootHarness();
    applyRootThemeVariables({ theme: "Light", accentColor: relay.color.pink });
    applyRootThemeVariables(createDefaultSettings());
    expect(properties.size).toBe(0);
  });

  test.each(["", "red", "#fff", "#12345g", "url(evil)"])(
    "clears invalid stored color %s",
    (accentColor) => {
      const { properties } = rootHarness();
      applyRootThemeVariables({ theme: "Dark", accentColor: relay.color.cyan });
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
    applyRootThemeVariables({ theme: "System", accentColor: relay.color.teal });
    expect(boot.root.dataset.theme).toBe("light");
    runInNewContext(themeBootScript, {
      document: boot.document,
      window: {
        localStorage: {
          getItem: () =>
            JSON.stringify({ theme: "System", accentColor: relay.color.teal }),
        },
      },
    });
    expect(boot.root.classList.toggle).toHaveBeenLastCalledWith("dark", false);
    expect(boot.properties.get("--app-accent")).toBe(relay.color.teal);
  });
});

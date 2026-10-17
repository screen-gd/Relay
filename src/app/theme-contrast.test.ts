import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { deriveAccentTokens } from "@/features/routes/shared/route-theme";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const light = css.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
const dark = css.match(/\.dark \{([\s\S]*?)\n\}/)?.[1] ?? "";

function token(block: string, name: string) {
  const expression = new RegExp(`${name}:\\s*([^;]+);`);
  const value = block.match(expression)?.[1] ?? light.match(expression)?.[1];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("content and metadata stay readable on workspace surfaces", () => {
  for (const theme of [light, dark]) {
    for (const name of [
      "--surface-page",
      "--surface-frame",
      "--surface-fill",
      "--surface-active",
      "--surface-overlay",
    ]) {
      for (const text of ["--text-primary", "--text-meta"]) {
        expect(
          contrast(token(theme, text), token(theme, name))
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test("default accent text and marks meet their contrast targets", () => {
  for (const theme of [light, dark]) {
    expect(
      contrast(token(theme, "--accent"), token(theme, "--accent-foreground"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(token(theme, "--accent-mark"), token(theme, "--surface-page"))
    ).toBeGreaterThanOrEqual(3);
  }
});

test("neutral chart lines meet non-text contrast on workspace surfaces", () => {
  for (const theme of [light, dark]) {
    for (const name of [
      "--surface-page",
      "--surface-fill",
      "--surface-active",
    ]) {
      expect(
        contrast(token(theme, "--text-meta"), token(theme, name))
      ).toBeGreaterThanOrEqual(3);
    }
  }
});

test.each([
  "#000000",
  "#ffffff",
  "#111827",
  "#fef08a",
  "#2563eb",
  "#e879f9",
  "#777777",
])("custom accent %s stays readable in both themes", (color) => {
  for (const isDark of [true, false]) {
    const tokens = deriveAccentTokens(color, isDark);
    expect(contrast(tokens.accent, tokens.foreground)).toBeCloseTo(
      Math.max(contrast(color, "#0b0c0e"), contrast(color, "#ffffff"))
    );
    expect(
      contrast(tokens.mark, isDark ? "#000000" : "#ffffff")
    ).toBeGreaterThanOrEqual(3);
  }
});

test("midtone accents keep the agreed near-black or white foreground despite the accepted gap", () => {
  const { foreground } = deriveAccentTokens("#777777", true);
  expect(foreground).toBe("#ffffff");
  expect(contrast("#777777", foreground)).toBeCloseTo(4.478, 3);
});

test("boundary-dependent controls retain at least 3:1 in both themes", () => {
  for (const Control of [Checkbox, Switch]) {
    const html = renderToStaticMarkup(
      createElement(Control, { "aria-label": "Enabled", checked: false })
    );
    const borderToken = html.match(/border-\[var\((--[a-z-]+)\)\]/)?.[1];
    if (!borderToken) throw new Error("Control has no semantic border");
    for (const theme of [light, dark]) {
      for (const surface of ["--surface-page", "--surface-fill"]) {
        expect(
          contrast(token(theme, borderToken), token(theme, surface))
        ).toBeGreaterThanOrEqual(3);
      }
    }
  }
});

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const light = css.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
const dark = css.match(/\.dark \{([\s\S]*?)\n\}/)?.[1] ?? "";

function token(block: string, name: string) {
  const value = block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
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

test("muted and subtle text use the accessible shared token", () => {
  expect(token(light, "--app-muted")).toBe("var(--text-muted)");
  expect(token(light, "--app-subtle")).toBe("var(--text-muted)");
  // Includes raised, inset, overlay, media wells and composited selected surfaces.
  const surfaces = [
    [light, ["#ffffff", "#f4f4f5", "#e4e4e7", "#d4d4d8", "#d9e3e8", "#dfd5c7", "#eee7da", "#dce4dc", "#d6e1ed"]],
    [dark, ["#000000", "#070707", "#0a0a0a", "#121212", "#171717", "#181818", "#2f2f2f", "#17263a", "#29251f", "#172a21", "#252039", "#252b33"]],
  ] satisfies Array<[string, string[]]>;
  for (const [theme, backgrounds] of surfaces) {
    for (const background of backgrounds) {
      expect(contrast(token(theme, "--text-muted"), background)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("chart grid reaches 3:1 without brightening decorative borders", () => {
  for (const theme of [light, dark]) {
    for (const name of ["--surface-canvas", "--surface-panel", "--surface-panel-raised", "--surface-sunken", "--surface-overlay"]) {
      expect(contrast(token(theme, "--app-chart-grid"), token(theme, name))).toBeGreaterThanOrEqual(3);
    }
  }
  expect(token(light, "--app-border")).toBe("#e4e4e7");
  expect(token(dark, "--app-border")).toBe("rgb(255 255 255 / 0.08)");
});

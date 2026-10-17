import { useMemo, useSyncExternalStore } from "react";

export type Rgb = [number, number, number];
export type Seed = { fill: Rgb; line: Rgb; star: Rgb };

const colorTokens = {
  accent: "--accent-mark",
  neutral: "--text-meta",
  muted: "--surface-active",
  lime: "--accent-mark",
  green: "--text-meta",
  blue: "--text-meta",
  purple: "--surface-active",
  pink: "--text-meta",
  orange: "--surface-active",
  red: "--text-meta",
  grey: "--text-meta",
} as const;

export type DitherColor = keyof typeof colorTokens;

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`;

export const colorVariable = (color: DitherColor) =>
  `var(${colorTokens[color]})`;

function seed(value = ""): Seed {
  const hex = value.trim();
  const fill: Rgb = /^#[0-9a-f]{6}$/i.test(hex)
    ? [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ]
    : [0, 0, 0];
  return { fill, line: fill, star: fill };
}

function snapshot() {
  if (typeof document === "undefined") return "";
  const style = getComputedStyle(document.documentElement);
  return ["--accent-mark", "--text-meta", "--surface-active"]
    .map((token) => style.getPropertyValue(token).trim())
    .join("|");
}

function paletteFromSnapshot(value: string) {
  const [accent, neutral, muted] = value.split("|");
  return {
    "--accent-mark": seed(accent),
    "--text-meta": seed(neutral),
    "--surface-active": seed(muted),
  };
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  return () => observer.disconnect();
}

/** Canvas colors update when the theme boot or Appearance changes root tokens. */
export function useChartPalette() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => paletteFromSnapshot(value), [value]);
}

export function seedOfColor(
  color: DitherColor,
  palette = paletteFromSnapshot(snapshot())
): Seed {
  return palette[colorTokens[color]];
}

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && Object.hasOwn(colorTokens, value);

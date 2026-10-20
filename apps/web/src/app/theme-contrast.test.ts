import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Quartz builds every text and surface color from four oklch channels per
// theme. Light comes from Quartz's tokens; dark from Relay's chassis override.
const quartz = readFileSync(
  new URL("../styles/quartz/tokens.css", import.meta.url),
  "utf8"
);
const relay = readFileSync(
  new URL("../styles/relay-theme.css", import.meta.url),
  "utf8"
);

type Channels = [number, number, number];

function channels(css: string, name: string): Channels {
  const match = css.match(
    new RegExp(`--${name}-c:\\s*([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)`)
  );
  if (!match) throw new Error(`Missing --${name}-c`);
  return [Number(match[1]) / 100, Number(match[2]), Number(match[3])];
}

const darkBlock = relay.match(/data-theme="dark"\][\s\S]*?\{([\s\S]*?)\}/)?.[1];
if (!darkBlock) throw new Error("Missing the Relay dark chassis block");

const themes = {
  light: {
    ink: channels(quartz, "ink"),
    paper: channels(quartz, "paper"),
    grey: channels(quartz, "grey"),
    canvas: channels(quartz, "canvas"),
  },
  dark: {
    ink: channels(darkBlock, "ink"),
    paper: channels(darkBlock, "paper"),
    grey: channels(darkBlock, "grey"),
    canvas: channels(darkBlock, "canvas"),
  },
};

/** oklch to gamma-encoded sRGB, clamped to the gamut. */
function srgb([L, C, h]: Channels) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((x) => {
    const v = Math.min(1, Math.max(0, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  });
}

function luminance(color: number[]) {
  const [r, g, b] = color.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Ink at an alpha over a surface, composited the way browsers do. */
function inkOver(ink: number[], surface: number[], alpha: number) {
  return ink.map(
    (value, index) => value * alpha + surface[index] * (1 - alpha)
  );
}

test("text roles read on every surface in both themes", () => {
  // text-1, text-2 and text-3 are ink at these alphas (Quartz tokens.css).
  const textAlphas = { "text-1": 1, "text-2": 0.8, "text-3": 0.66 };
  for (const [theme, t] of Object.entries(themes)) {
    const ink = srgb(t.ink);
    for (const surface of ["paper", "grey", "canvas"] as const) {
      const background = srgb(t[surface]);
      for (const [role, alpha] of Object.entries(textAlphas)) {
        expect(
          contrast(inkOver(ink, background, alpha), background),
          `${theme} ${role} on ${surface}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test("the dark chassis is near black with distinct surface steps", () => {
  const { canvas, paper, grey } = themes.dark;
  expect(luminance(srgb(canvas))).toBeLessThan(0.005);
  // The viewport and wells read as separate steps from the sidebar. Tone
  // steps this dark are measured in oklch lightness, not contrast ratio.
  expect(paper[0] - canvas[0]).toBeGreaterThanOrEqual(0.03);
  expect(grey[0] - paper[0]).toBeGreaterThanOrEqual(0.03);
});

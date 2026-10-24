import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";

// Relay's brand type is Geist Sans and Geist Mono (docs/brand/relay-brand-kit.png).
const geist = loadGeist("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const geistMono = loadGeistMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const fonts = {
  sans: geist.fontFamily,
  mono: geistMono.fontFamily,
} as const;

/**
 * Colors copied from Relay's light theme in `src/app/globals.css`,
 * plus the acid lime brand accent from `docs/brand/ASSET-GUIDE.md`.
 */
export const colors = {
  lime: "#C6FF00",
  ink: "#000000",
  text2: "#3f3f46",
  muted: "#52525b",
  zinc: "#71717A",
  canvas: "#f4f4f5",
  panel: "#ffffff",
  border: "#e4e4e7",
  strong: "#d4d4d8",
  selected: "#e4e4e7",
  backdropTop: "#F8F8F6",
  backdropBottom: "#E9E9E5",
  info: "#2563eb",
  infoBg: "#eff6ff",
  success: "#15803d",
  successBg: "#f0fdf4",
  warning: "#b45309",
  warningBg: "#fffbeb",
  danger: "#b91c1c",
  dangerBg: "#fef2f2",
} as const;

/** Relay's default workflow, in order. */
export const stages = [
  { name: "Planned", color: colors.zinc },
  { name: "Editing", color: colors.info },
  { name: "Client Review", color: colors.warning },
  { name: "Revisions", color: colors.danger },
  { name: "Approved", color: colors.success },
  { name: "Delivered", color: colors.ink },
] as const;

export type StageName = (typeof stages)[number]["name"];

export const stageColor = (name: StageName) =>
  stages.find((stage) => stage.name === name)?.color ?? colors.zinc;

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

/** Logical size of the app window. Cursor and camera targets use these coordinates. */
export const WINDOW = {
  width: 1600,
  height: 960,
  chrome: 44,
  header: 56,
  rail: 52,
} as const;

/** Top-left of the app content area inside the window. */
export const CONTENT = {
  x: WINDOW.rail,
  y: WINDOW.chrome + WINDOW.header,
  width: WINDOW.width - WINDOW.rail,
  height: WINDOW.height - WINDOW.chrome - WINDOW.header,
} as const;

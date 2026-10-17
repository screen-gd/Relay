import type { SettingsState } from "@/lib/types";

export const headingFont =
  'var(--font-geist-sans), "Geist Variable", sans-serif';
// An empty preference leaves the theme's CSS accent in control.
export const defaultAccent = "";
export const accent = "var(--accent)";
export const border = "var(--border-control)";
export const activeBg = "var(--surface-active)";
export const successColor = "var(--status-success)";
export const warningColor = "var(--status-warning)";

/** Shared by the pre-hydration script and live theme changes. */
export function deriveAccentTokens(color: string, isDark: boolean) {
  const channels = [1, 3, 5].map((start) =>
    parseInt(color.slice(start, start + 2), 16)
  );
  function luminance(rgb: number[]) {
    const linear = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  const value = luminance(channels);
  const nearBlack = luminance([11, 12, 14]);
  const darkContrast = (value + 0.05) / (nearBlack + 0.05);
  const lightContrast = 1.05 / (value + 0.05);
  const foreground = darkContrast >= lightContrast ? "#0b0c0e" : "#ffffff";
  const markContrast = (rgb: number[]) => {
    const luminanceValue = luminance(rgb);
    return isDark
      ? (luminanceValue + 0.05) / 0.05
      : 1.05 / (luminanceValue + 0.05);
  };
  let mark = color;
  if (markContrast(channels) < 3) {
    // Find the smallest mix toward white or black that survives 8-bit rounding.
    let low = 0;
    let high = 1;
    const target = isDark ? 255 : 0;
    const mix = (amount: number) =>
      channels.map((channel) =>
        Math.round(channel + (target - channel) * amount)
      );
    for (let step = 0; step < 24; step++) {
      const middle = (low + high) / 2;
      if (markContrast(mix(middle)) >= 3) high = middle;
      else low = middle;
    }
    mark = `#${mix(high)
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return { accent: color, foreground, mark };
}

export function applyRootThemeVariables(
  settings: Pick<SettingsState, "theme" | "accentColor">,
  derive = deriveAccentTokens
) {
  if (typeof document === "undefined") return;
  const prefersDark =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const theme = ["Light", "Dark", "System"].includes(settings.theme)
    ? settings.theme
    : "Dark";
  const isDark = theme === "Dark" || (theme === "System" && prefersDark);
  const root = document.documentElement;
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  const color = settings.accentColor;
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
    const tokens = derive(color, isDark);
    root.style.setProperty("--accent", tokens.accent);
    root.style.setProperty("--accent-foreground", tokens.foreground);
    root.style.setProperty("--accent-mark", tokens.mark);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    root.style.removeProperty("--accent-mark");
  }
}

// Serialize the same self-contained function so boot and runtime cannot drift.
export const themeBootScript = `
(function () {
  // Route head scripts may run again; the live preference must win after boot.
  if (document.documentElement.dataset.theme) return;
  var settings = {};
  try {
    var raw = window.localStorage.getItem("video-editing-work-tracker:settings:v1");
    settings = raw ? JSON.parse(raw) : {};
  } catch {}
  (${applyRootThemeVariables.toString()})(settings || {}, (${deriveAccentTokens.toString()}));
})();
`;

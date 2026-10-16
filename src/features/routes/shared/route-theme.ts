import { relay } from "@/app/design-system";
import type { SettingsState } from "@/lib/types";

export const headingFont = relay.font.heading;
// An empty preference leaves the theme's CSS accent in control.
export const defaultAccent = "";
export const accent = `var(--app-accent, ${relay.color.teal})`;
export const border = "var(--app-border)";
export const activeBg = "var(--app-active, rgba(45,140,151,0.18))";
export const successColor = `var(--app-success, ${relay.color.success})`;
export const warningColor = `var(--app-warning, ${relay.color.warning})`;

export function applyRootThemeVariables(
  settings: Pick<SettingsState, "theme" | "accentColor">
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
  const color = settings.accentColor;
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
    const channels = [1, 3, 5].map((start) => {
      const channel = parseInt(color.slice(start, start + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance =
      channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    root.style.setProperty("--app-accent", color);
    root.style.setProperty(
      "--app-accent-foreground",
      luminance > 0.179 ? "#000000" : "#ffffff"
    );
  } else {
    root.style.removeProperty("--app-accent");
    root.style.removeProperty("--app-accent-foreground");
  }
}

// Serialize the same self-contained function so boot and runtime cannot drift.
export const themeBootScript = `
(function () {
  // Route head scripts may run again; the live preference must win after boot.
  if (document.documentElement.dataset.theme) return;
  try {
    var raw = window.localStorage.getItem("video-editing-work-tracker:settings:v1");
    var settings = raw ? JSON.parse(raw) : {};
    (${applyRootThemeVariables.toString()})(settings || {});
  } catch {}
})();
`;

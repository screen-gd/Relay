import { relay } from "@/app/design-system";
import type { SettingsState } from "@/lib/types";

export const headingFont = relay.font.heading;
export const defaultAccent = relay.color.teal;
export const accent = `var(--app-accent, ${relay.color.teal})`;
export const border = "var(--app-border)";
export const activeBg = "var(--app-active, rgba(45,140,151,0.18))";
export const successColor = `var(--app-success, ${relay.color.success})`;
export const warningColor = `var(--app-warning, ${relay.color.warning})`;

export function applyRootThemeVariables(settings: SettingsState) {
  if (typeof document === "undefined") return;
  const isDark = themeIsDark(settings);
  const root = document.documentElement;
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
}

function themeIsDark(settings: SettingsState) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return (
    settings.theme === "Dark" || (settings.theme === "System" && prefersDark)
  );
}

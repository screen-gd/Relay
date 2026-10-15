/**
 * Relay brand values used outside CSS. The theme tokens in `globals.css` are
 * the source for UI color; `ember` is the brand accent (dark theme value).
 */
export const relay = {
  color: {
    ember: "#EC8A5E",
    teal: "#18181B",
    cyan: "#27272A",
    deepTeal: "#3F3F46",
    sky: "#71717A",
    indigo: "#A1A1AA",
    pink: "#D4D4D8",
    success: "#22C55E",
    warning: "#FBBF24",
  },
  font: {
    heading: 'var(--font-geist-sans), "Geist Variable", sans-serif',
  },
} as const;

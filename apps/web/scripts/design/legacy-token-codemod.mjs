// Rewrites pre-Quartz arbitrary color classes, such as text-[var(--app-muted)],
// to the Quartz utility for the same role (text-text-2). Variant prefixes and
// opacity suffixes are kept. Run: node scripts/design/legacy-token-codemod.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Legacy variable -> Quartz color name, per utility family. */
const roles = {
  "app-muted": { text: "text-2", bg: "text-2", border: "text-2" },
  "app-subtle": { text: "text-3", bg: "text-3" },
  "app-ink": { text: "text-1", bg: "ink", border: "ink" },
  "app-text": { text: "text-1" },
  "app-highlight": { text: "text-1", bg: "ink", border: "ink" },
  "text-primary": { text: "text-1" },
  "text-secondary": { text: "text-2" },
  "text-muted": { text: "text-2" },
  "app-border": { border: "line-row", bg: "line-row", divide: "line-row" },
  "app-strong-border": { border: "strong", bg: "strong", ring: "strong" },
  "app-input-border": { border: "input" },
  "app-hover": { bg: "hover" },
  "app-active": { bg: "selected" },
  "sidebar-active": { bg: "selected" },
  "app-panel": { bg: "well" },
  "app-soft-panel": { bg: "well" },
  "app-header-panel": { bg: "well" },
  "surface-inset": { bg: "well" },
  "surface-panel": { bg: "well" },
  "surface-sunken": { bg: "well" },
  "app-canvas": { bg: "page", text: "page" },
  "surface-canvas": { bg: "page" },
  "app-control": { bg: "page" },
  "app-sidebar": { bg: "canvas" },
  "app-progress-track": { bg: "tile" },
  "app-avatar-surface": { bg: "tile" },
  primary: {
    bg: "primary",
    text: "primary",
    border: "primary",
    ring: "primary",
    fill: "primary",
    outline: "primary",
  },
  "primary-foreground": {
    text: "primary-foreground",
    bg: "primary-foreground",
  },
  "app-danger": { text: "fail-text", border: "fail", bg: "fail" },
  "status-danger": { text: "fail-text", border: "fail", bg: "fail" },
  "app-warning": { text: "warn-text", border: "warn", bg: "warn" },
  "status-warning": { text: "warn-text", border: "warn", bg: "warn" },
  "app-success": { text: "text-1", bg: "ink" },
  "status-success": { text: "text-1", bg: "ink" },
  "status-info": { text: "text-1" },
  "app-danger-bg": { bg: "fail-wash" },
  "status-danger-bg": { bg: "fail-wash" },
  "app-warning-bg": { bg: "warn-wash" },
  "status-warning-bg": { bg: "warn-wash" },
  "app-success-bg": { bg: "well" },
  "status-success-bg": { bg: "well" },
  "status-info-bg": { bg: "well" },
};

const shadows = {
  "app-shadow-1": "shadow-none",
  "app-shadow-2": "shadow-overlay",
  "shadow-panel": "shadow-none",
};

const pattern =
  /\b(bg|text|border(?:-[trblxyse])?|ring|fill|stroke|outline|divide|decoration|caret|from|to|via)-\[var\(--([a-z0-9-]+)\)\]/g;
const shadowPattern = /\bshadow-\[var\(--([a-z0-9-]+)\)\]/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

let changed = 0;
let swaps = 0;
for (const file of walk(process.argv[2] ?? "src")) {
  const before = readFileSync(file, "utf8");
  const after = before
    .replace(pattern, (whole, utility, name) => {
      const family = utility.startsWith("border") ? "border" : utility;
      const role = roles[name]?.[family];
      if (!role) return whole;
      swaps++;
      return `${utility}-${role}`;
    })
    .replace(shadowPattern, (whole, name) => {
      if (!shadows[name]) return whole;
      swaps++;
      return shadows[name];
    });
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(`${swaps} classes swapped in ${changed} files`);

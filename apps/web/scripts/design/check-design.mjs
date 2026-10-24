// Design ratchet for the Quartz layer. Counts patterns the system bans in
// app code and fails when any count rises above the saved baseline, so new
// drift is caught while old drift is paid down over time.
//
//   node scripts/design/check-design.mjs            check against the baseline
//   node scripts/design/check-design.mjs --update   lower the baseline to today
//   node scripts/design/check-design.mjs --self-test  prove every rule fires
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const baselinePath = join(root, "scripts/design/design-baseline.json");

/** Each rule: what it bans, why, and the pattern that finds it. */
const rules = [
  {
    id: "raw-color",
    why: "Use a Quartz role (bg-page, text-text-2, ...), never a literal color.",
    pattern: /#[0-9a-fA-F]{3,8}\b(?![\w-])|\brgba?\(\s*\d|\bhsla?\(\s*\d/g,
    bad: 'className="bg-[#1f1f22]"',
  },
  {
    id: "palette-class",
    why: "Tailwind palette colors skip the theme; use a role.",
    pattern:
      /\b(?:bg|text|border|ring)-(?:zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    bad: 'className="text-emerald-500"',
  },
  {
    id: "legacy-var",
    why: "The pre-Quartz --app-* names are aliases; use the Quartz role.",
    pattern:
      /var\(--(?:app-[a-z-]+|surface-(?:panel|sunken|inset|panel-raised)|text-(?:primary|secondary|muted)|status-[a-z-]+)\)/g,
    bad: 'className="text-[var(--app-muted)]"',
  },
  {
    id: "arbitrary-text-size",
    why: "Set text with a type role (type-label, type-body-sm, ...).",
    pattern: /\btext-\[\d+(?:\.\d+)?px\]/g,
    bad: 'className="text-[11px]"',
  },
  {
    id: "caps",
    why: "Quartz keeps sentence case; capitals and tracking shout.",
    pattern: /\b(?:uppercase|tracking-widest|tracking-\[0\.\d+em\])\b/g,
    bad: 'className="uppercase tracking-widest"',
  },
  {
    id: "glass",
    why: "Overlays and bars are solid surfaces; blur drops text contrast.",
    pattern: /\bbackdrop-blur(?:-\w+)?\b/g,
    bad: 'className="backdrop-blur-md"',
  },
  {
    id: "looping-motion",
    why: "Nothing pulses or bounces; a running state is a small turning arc.",
    pattern: /\banimate-(?:pulse|ping|bounce)\b/g,
    bad: 'className="animate-pulse"',
  },
  {
    id: "side-rail",
    why: "Mark selection with the selected wash, not an edge bar.",
    pattern: /\bborder-l-[24]\b|inset_[23]px_0_0/g,
    bad: 'className="border-l-2 border-primary"',
  },
];

/** Files that may hold literal colors: brand marks, chart engines, tokens. */
const allow = [
  /^src\/components\/dither-kit\//,
  /^src\/lib\/dither\//,
  /^src\/app\/brand-assets\.ts$/,
  /^src\/components\/brand-marks\.tsx$/,
  /^src\/app\/design-system\.ts$/,
  /^src\/routes\/__root\.tsx$/,
  /\.test\.tsx?$/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(path);
  }
  return out;
}

function count(text) {
  return Object.fromEntries(
    rules.map((rule) => [rule.id, (text.match(rule.pattern) ?? []).length])
  );
}

function scan() {
  const totals = Object.fromEntries(rules.map((rule) => [rule.id, 0]));
  const where = Object.fromEntries(rules.map((rule) => [rule.id, []]));
  for (const file of walk(join(root, "src"))) {
    const path = relative(root, file).replace(/\\/g, "/");
    if (allow.some((pattern) => pattern.test(path))) continue;
    const found = count(readFileSync(file, "utf8"));
    for (const [id, n] of Object.entries(found)) {
      if (!n) continue;
      totals[id] += n;
      where[id].push(`${path} (${n})`);
    }
  }
  return { totals, where };
}

if (process.argv.includes("--self-test")) {
  let failed = 0;
  for (const rule of rules) {
    const hits = (rule.bad.match(rule.pattern) ?? []).length;
    console.log(`${hits ? "fires" : "SILENT"}  ${rule.id}  on ${rule.bad}`);
    if (!hits) failed++;
  }
  const clean = 'className="bg-page text-text-2 type-label rounded-soft"';
  const falsePositives = rules.filter((rule) => clean.match(rule.pattern));
  for (const rule of falsePositives)
    console.log(`FALSE HIT  ${rule.id}  on ${clean}`);
  process.exit(failed || falsePositives.length ? 1 : 0);
}

const { totals, where } = scan();
if (process.argv.includes("--update")) {
  writeFileSync(baselinePath, `${JSON.stringify(totals, null, 2)}\n`);
  console.log("Baseline written:", totals);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
let failed = false;
for (const rule of rules) {
  const now = totals[rule.id];
  const allowed = baseline[rule.id] ?? 0;
  const status = now > allowed ? "FAIL" : now < allowed ? "down" : "ok";
  console.log(
    `${status.padEnd(4)}  ${rule.id.padEnd(20)} ${now} (baseline ${allowed})`
  );
  if (now > allowed) {
    failed = true;
    console.log(`      ${rule.why}`);
    for (const line of where[rule.id].slice(0, 12))
      console.log(`      ${line}`);
  }
}
if (Object.entries(totals).some(([id, n]) => n < (baseline[id] ?? 0)))
  console.log("\nCounts fell. Run with --update to lower the baseline.");
process.exit(failed ? 1 : 0);

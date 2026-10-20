// Replaces ad-hoc font sizes, weights and tracking in class strings with the
// Quartz type role that matches, so text hierarchy is set in one place.
// A size with a weight is a label or heading; a size alone is body text.
//
// Run: node scripts/design/type-role-codemod.mjs [dir]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const weighted = {
  "text-[9px]": "type-label-sm",
  "text-[10px]": "type-label-sm",
  "text-[11px]": "type-label-sm",
  "text-[12px]": "type-label-sm",
  "text-xs": "type-label-sm",
  "text-[13px]": "type-label",
  "text-sm": "type-label",
  "text-[14px]": "type-label",
  "text-[15px]": "type-heading-xs",
  "text-base": "type-heading-xs",
  "text-[16px]": "type-heading-xs",
  "text-lg": "type-heading-sm",
  "text-[18px]": "type-heading-sm",
  "text-xl": "type-heading",
  "text-[20px]": "type-heading-sm",
  "text-2xl": "type-heading-lg",
  "text-[24px]": "type-heading",
  "text-[28px]": "type-heading-lg",
  "text-[30px]": "type-heading-lg",
  "text-3xl": "type-display",
  "text-[34px]": "type-display",
  "text-[40px]": "type-display",
};

const plain = {
  ...weighted,
  "text-[13px]": "type-body-sm",
  "text-sm": "type-body",
  "text-[14px]": "type-body",
  "text-base": "type-body-lg",
  "text-[16px]": "type-body-lg",
};

const weight = /^font-(medium|semibold|bold)$/;
// Responsive or state-prefixed sizes are left alone; only bare sizes map.
const strip = [
  weight,
  /^font-normal$/,
  /^tracking-(tight|tighter|wide|wider|widest|normal|\[[^\]]+\])$/,
  /^leading-(none|tight|snug|normal|relaxed|loose|\d+|\[[^\]]+\])$/,
  /^uppercase$/,
];

function convert(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const size = tokens.find((t) => weighted[t]);
  if (!size || tokens.some((t) => t.startsWith("type-"))) return text;
  const role = (tokens.some((t) => weight.test(t)) ? weighted : plain)[size];
  return tokens
    .filter((t) => t !== size && !strip.some((rule) => rule.test(t)))
    .concat(role)
    .join(" ");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(path);
  }
  return out;
}

let files = 0;
let swaps = 0;
for (const file of walk(process.argv[2] ?? "src")) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const edits = [];
  const seen = new Set();

  function edit(lit) {
    if (seen.has(lit.pos)) return;
    seen.add(lit.pos);
    const next = convert(lit.text);
    if (next === lit.text) return;
    swaps++;
    const quote = source[lit.getStart(sf)];
    const body = quote === "`" ? next.replace(/`/g, "\\`") : next;
    edits.push({
      start: lit.getStart(sf),
      end: lit.getEnd(),
      text: `${quote}${body}${quote}`,
    });
  }

  function collect(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      edit(node);
    else if (!ts.isJsxElement(node) && !ts.isArrowFunction(node))
      ts.forEachChild(node, collect);
  }

  function visit(node) {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) === "className" &&
      node.initializer
    ) {
      collect(node.initializer);
    } else if (
      ts.isCallExpression(node) &&
      ["cn", "cva", "clsx"].includes(node.expression.getText(sf))
    ) {
      node.arguments.forEach(collect);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let next = source;
  for (const e of edits)
    next = next.slice(0, e.start) + e.text + next.slice(e.end);
  writeFileSync(file, next);
  files++;
}
console.log(`${swaps} class strings moved to type roles in ${files} files`);

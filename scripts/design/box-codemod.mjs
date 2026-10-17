// Turns bordered boxes into Quartz fields: a class string that draws a 1px
// border around a grey fill (or a dashed placeholder box) becomes the grey
// field with the frame radius and no border. Quartz separates groups with
// fields, not lines, so the border was a second edge on the same group.
//
// Run: node scripts/design/box-codemod.mjs [dir]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const fillTokens =
  /^(bg-(well|card|muted(\/\d+)?|muted\/20|page)|bg-well\/\d+)$/;
const radiusTokens = /^rounded(-(sm|md|lg|xl|2xl|\[[0-9]+px\]))?$/;

function convert(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const hasBorder =
    tokens.includes("border") &&
    tokens.some((t) =>
      /^border-(line-row|border|strong|dashed|input)$/.test(t)
    );
  const dashed = tokens.includes("border-dashed");
  const hasFill = tokens.some((t) => fillTokens.test(t));
  if (!hasBorder || (!hasFill && !dashed)) return text;
  const kept = tokens.filter(
    (t) =>
      !/^(border|border-(line-row|border|strong|dashed|input))$/.test(t) &&
      !radiusTokens.test(t) &&
      !/^(bg-card|bg-muted(\/\d+)?|bg-well\/\d+|text-card-foreground|shadow-none)$/.test(
        t
      )
  );
  if (!kept.some((t) => /^bg-/.test(t))) kept.push("bg-well");
  kept.push("rounded-frame");
  return kept.join(" ");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "ui") walk(path, out);
    } else if (name.endsWith(".tsx") && !name.includes(".test."))
      out.push(path);
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
  const edit = (lit) => {
    if (seen.has(lit.pos)) return;
    seen.add(lit.pos);
    const next = convert(lit.text);
    if (next === lit.text) return;
    swaps++;
    const quote = source[lit.getStart(sf)];
    edits.push({
      start: lit.getStart(sf),
      end: lit.getEnd(),
      text: `${quote}${next}${quote}`,
    });
  };
  const collect = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      edit(node);
    else if (!ts.isJsxElement(node) && !ts.isArrowFunction(node))
      ts.forEachChild(node, collect);
  };
  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) === "className" &&
      node.initializer
    )
      collect(node.initializer);
    else if (ts.isCallExpression(node) && node.expression.getText(sf) === "cn")
      node.arguments.forEach(collect);
    else if (
      ts.isVariableDeclaration(node) &&
      /ClassName$|Class$/.test(node.name.getText(sf)) &&
      node.initializer
    )
      collect(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let next = source;
  for (const e of edits)
    next = next.slice(0, e.start) + e.text + next.slice(e.end);
  writeFileSync(file, next);
  files++;
}
console.log(`${swaps} bordered boxes became fields in ${files} files`);

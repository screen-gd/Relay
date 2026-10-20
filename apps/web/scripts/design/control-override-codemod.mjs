// Removes look overrides that call sites pass into shared controls, so every
// Button, field, badge and tab renders as its Quartz default. A height
// override on a Button becomes the matching `size` prop instead.
//
// Run: node scripts/design/control-override-codemod.mjs [dir]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const fieldTags = new Set(["Input", "Textarea", "SelectTrigger", "DatePicker"]);
const buttonTags = new Set(["Button"]);
const badgeTags = new Set(["Badge"]);
const tabTags = new Set([
  "TabsList",
  "TabsTrigger",
  "ToggleGroup",
  "ToggleGroupItem",
]);

/** Classes that restate what the component owns: radius, type, shadow, edge. */
const shared = [
  /^rounded(-(sm|md|lg|xl|2xl|full|none|\[[^\]]+\]))?$/,
  /^!?shadow(-(none|xs|sm|md|lg|\[[^\]]+\]))?$/,
  /^text-(xs|sm|base|\[(9|10|11|12|13|14|15)px\])$/,
  /^font-(medium|semibold|bold|normal)$/,
  /^(leading|tracking)-/,
  /^active:(translate-y-0|translate-y-px|scale-100)$/,
  /^(dark:)?focus-visible:border-/,
  /^dark:(hover:)?bg-/,
  /^transition(-[a-z[\],-]+)?$/,
  /^duration-\d+$/,
];

const fieldOnly = [
  /^h-(8|9|10|11|\[[0-9]+px\])$/,
  /^min-h-(8|9|10|11)$/,
  /^(!?)border(-(line-row|input|strong|border|transparent|0))?$/,
  /^!?bg-(well|page|transparent|background|card|muted)$/,
];

const buttonOnly = [
  /^!?border(-(line-row|input|strong|border))?$/,
  /^!?bg-(well|page|background|card)$/,
  /^gap-(1|1\.5|2)$/,
];

const badgeOnly = [
  /^border(-(line-row|border|transparent))?$/,
  /^px-(1|1\.5|2|2\.5)$/,
  /^py-(0|0\.5|1)$/,
  /^h-(5|6)$/,
];

const tabOnly = [
  /^!?h-(7|8|9|10)$/,
  /^!?bg-\[var\(--app-active\)\]$/,
  /^!?(data-\[state=active\]:)?(!?)bg-(selected|well|page)$/,
  /^px-(2|2\.5|3)$/,
];

const heightToSize = {
  "h-6": "xs",
  "h-7": "sm",
  "h-8": "sm",
  "h-9": "default",
  "h-10": "default",
  "h-11": "lg",
  "h-12": "lg",
};

function dropList(tag) {
  if (fieldTags.has(tag)) return [...shared, ...fieldOnly];
  if (buttonTags.has(tag)) return [...shared, ...buttonOnly];
  if (badgeTags.has(tag)) return [...shared, ...badgeOnly];
  if (tabTags.has(tag)) return [...shared, ...tabOnly];
  return [];
}

function clean(text, rules) {
  const kept = [];
  const dropped = [];
  for (const token of text.split(/\s+/).filter(Boolean)) {
    (rules.some((rule) => rule.test(token)) ? dropped : kept).push(token);
  }
  return { text: kept.join(" "), dropped };
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
let removed = 0;
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

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf).replace(/^Owned/, "");
      const rules = dropList(tag);
      if (rules.length) handle(node, tag, rules);
    }
    ts.forEachChild(node, visit);
  }

  function handle(node, tag, rules) {
    const attrs = node.attributes.properties;
    const classAttr = attrs.find(
      (a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "className"
    );
    if (!classAttr || !classAttr.initializer) return;
    const hasSize = attrs.some(
      (a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "size"
    );
    const literals = [];
    const init = classAttr.initializer;
    if (ts.isStringLiteral(init)) literals.push(init);
    else if (ts.isJsxExpression(init) && init.expression) {
      const collect = (n) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
          literals.push(n);
        else if (
          ts.isCallExpression(n) ||
          ts.isBinaryExpression(n) ||
          ts.isConditionalExpression(n) ||
          ts.isParenthesizedExpression(n) ||
          ts.isArrayLiteralExpression(n)
        )
          ts.forEachChild(n, collect);
      };
      collect(init.expression);
    }
    let sizeFromHeight;
    for (const lit of literals) {
      const raw = lit.text;
      if (buttonTags.has(tag) && !hasSize && !sizeFromHeight) {
        const h = raw.split(/\s+/).find((t) => heightToSize[t]);
        if (h && !/\bsize-/.test(raw)) sizeFromHeight = heightToSize[h];
      }
      const extra = buttonTags.has(tag)
        ? [/^h-(6|7|8|9|10|11|12)$/, /^min-h-(8|9|10|11)$/]
        : [];
      const { text, dropped } = clean(raw, [...rules, ...extra]);
      if (!dropped.length) continue;
      removed += dropped.length;
      const quote = source[lit.getStart(sf)];
      edits.push({
        start: lit.getStart(sf),
        end: lit.getEnd(),
        text: `${quote}${text}${quote}`,
      });
    }
    if (sizeFromHeight && sizeFromHeight !== "default") {
      edits.push({
        start: node.tagName.getEnd(),
        end: node.tagName.getEnd(),
        text: ` size="${sizeFromHeight}"`,
      });
    }
  }

  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let next = source;
  for (const edit of edits)
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  // An emptied className is dropped rather than left as className="".
  next = next.replace(/\s+className=""/g, "");
  writeFileSync(file, next);
  files++;
}
console.log(`${removed} override classes removed in ${files} files`);

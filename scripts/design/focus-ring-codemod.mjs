// Quartz draws one focus outline for every control (src/styles/quartz/base.css).
// This strips the older per-component focus box-shadow rings so focus never
// shows twice. An inset ring becomes Quartz's inset outline.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ringClass =
  /(?:^|(?<=[\s"'`]))(?:[a-z-]+:)*focus(?:-visible|-within)?:(?:ring(?:-[a-z0-9[\]()/.%-]+)?|ring-offset(?:-[a-z0-9[\]()/.%-]+)?|border-ring|outline-hidden)(?=[\s"'`]|$)/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

let changed = 0;
for (const file of walk(process.argv[2] ?? "src")) {
  const before = readFileSync(file, "utf8");
  let after = before.replace(
    /focus-visible:ring-inset/g,
    "focus-visible:focus-ring-inset"
  );
  after = after.replace(ringClass, "");
  // Tidy the doubled spaces the removals leave inside class strings.
  after = after.replace(/"([^"\n]*)"/g, (m, inner) =>
    /  /.test(inner) && /[a-z]-/.test(inner)
      ? `"${inner.replace(/ {2,}/g, " ").trim()}"`
      : m
  );
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(`focus rings cleaned in ${changed} files`);

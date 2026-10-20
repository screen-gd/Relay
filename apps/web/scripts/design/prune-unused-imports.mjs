// Removes imports that nothing in the file reads, for the files given, using
// the TypeScript checker. Only import declarations are touched; unused locals
// are reported for a person to remove.
//
// Run: node scripts/design/prune-unused-imports.mjs src/a.tsx src/b.tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const files = process.argv.slice(2).map((file) => resolve(file));
const configPath = ts.findConfigFile(
  process.cwd(),
  ts.sys.fileExists,
  "tsconfig.json"
);
const config = ts.getParsedCommandLineOfConfigFile(
  configPath,
  { noUnusedLocals: true },
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  }
);
const program = ts.createProgram(files, {
  ...config.options,
  noUnusedLocals: true,
  noEmit: true,
});

for (const file of files) {
  const sf = program.getSourceFile(file);
  if (!sf) continue;
  const unused = program
    .getSemanticDiagnostics(sf)
    .filter(
      (d) => [6133, 6192, 6196, 6198].includes(d.code) && d.start !== undefined
    );
  const edits = [];
  const locals = [];
  for (const diagnostic of unused) {
    let node = findNode(sf, diagnostic.start);
    while (
      node &&
      !ts.isImportDeclaration(node) &&
      !ts.isImportSpecifier(node) &&
      !ts.isImportClause(node) &&
      !ts.isNamespaceImport(node)
    ) {
      if (
        ts.isSourceFile(node) ||
        ts.isFunctionLike(node) ||
        ts.isVariableStatement(node)
      ) {
        node = undefined;
        break;
      }
      node = node.parent;
    }
    if (!node) {
      locals.push(sf.getLineAndCharacterOfPosition(diagnostic.start).line + 1);
      continue;
    }
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportClause(node) ||
      ts.isNamespaceImport(node)
    ) {
      const decl = ts.isImportDeclaration(node)
        ? node
        : (node.parent.parent ?? node.parent);
      const target = ts.isImportDeclaration(decl) ? decl : node;
      edits.push({ start: target.getFullStart(), end: target.getEnd() });
    } else {
      const specifier = node;
      const list = specifier.parent.elements;
      const index = list.indexOf(specifier);
      const end =
        index < list.length - 1
          ? list[index + 1].getStart(sf)
          : specifier.getEnd();
      edits.push({ start: specifier.getStart(sf), end });
    }
  }
  let text = sf.getFullText();
  const unique = [
    ...new Map(edits.map((e) => [`${e.start}:${e.end}`, e])).values(),
  ].sort((a, b) => b.start - a.start);
  for (const edit of unique)
    text = text.slice(0, edit.start) + text.slice(edit.end);
  // A trailing comma before a closing brace can be left behind; tidy it.
  text = text.replace(/,(\s*)}/g, "$1}").replace(/{\s*,/g, "{");
  if (unique.length) writeFileSync(file, text);
  console.log(
    `${file.split(/[\\/]/).slice(-2).join("/")}: ${unique.length} imports removed${locals.length ? `, unused locals at lines ${locals.join(", ")}` : ""}`
  );
}

function findNode(sf, position) {
  let found;
  (function visit(node) {
    if (position >= node.getStart(sf) && position < node.getEnd()) {
      found = node;
      ts.forEachChild(node, visit);
    }
  })(sf);
  return found;
}

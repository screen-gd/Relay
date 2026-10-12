const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = process.cwd();
const files = [
  "src/components/precision-projects.tsx",
  "src/components/precision-workspaces.tsx",
  "src/features/projects/project-table-controller.ts",
  "src/features/projects/project-table-domain.ts",
  "src/features/projects/project-table-domain.test.ts",
  "src/features/reports/reports-application.tsx",
  "src/features/reports/reports-application.test.tsx",
];
for (const folder of [
  "src/components/dither-kit",
  "src/components/kibo-ui/kanban",
]) {
  for (const file of fs.readdirSync(folder)) files.push(`${folder}/${file}`);
}
const snapshot = new Map(
  files.map((file) => [file, fs.readFileSync(file, "utf8")])
);
const patch = execFileSync(
  "git",
  ["diff", "--binary", "--", "package.json", "pnpm-lock.yaml"],
  { cwd: root }
);
for (const remote of ["gitcafe", "github-nexus", "origin"]) {
  const destination = path.resolve(root, "..", `Relay-kanban-pr-${remote}`);
  const branch = `feature/kanban-basic-reports-${remote}`;
  if (fs.existsSync(destination))
    throw new Error(`Destination already exists: ${destination}`);
  execFileSync(
    "git",
    ["worktree", "add", "-b", branch, destination, `${remote}/main`],
    { cwd: root, stdio: "inherit" }
  );
  execFileSync("git", ["apply", "--3way", "-"], {
    cwd: destination,
    input: patch,
    stdio: ["pipe", "inherit", "inherit"],
  });
  for (const [file, original] of snapshot) {
    let content = original;
    if (
      remote !== "origin" &&
      file === "src/features/reports/reports-application.tsx"
    ) {
      content = content
        .replace('import { EarningsQa } from "./earnings-qa";\n', "")
        .replace("    currentTeamId,\n    sample,\n", "")
        .replace(
          /  const role = teamData\?\.currentMember\.role;[\s\S]*?  const salaryPlans =/,
          "  const salaryPlans ="
        )
        .replace("      earningsQa={earningsQa}\n", "");
    }
    if (
      remote !== "origin" &&
      file === "src/components/precision-workspaces.tsx"
    ) {
      content = content
        .replace("  earningsQa,\n", "")
        .replace(
          "  /** AI earnings Q&A panel, rendered after client totals. */\n  earningsQa?: ReactNode;\n",
          ""
        )
        .replace("        {earningsQa}\n", "");
    }
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  execFileSync(
    "git",
    ["add", "--", ...files, "package.json", "pnpm-lock.yaml"],
    { cwd: destination, stdio: "inherit" }
  );
  console.log(
    JSON.stringify({ remote, destination, branch, files: files.length + 2 })
  );
}

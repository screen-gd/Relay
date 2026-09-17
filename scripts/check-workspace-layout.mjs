import { existsSync, readFileSync, readdirSync } from "node:fs";

function featurePresentationFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return featurePresentationFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

const authenticatedPresentationFiles = [
  "src/components/precision-dashboard.tsx",
  "src/components/precision-projects.tsx",
  "src/components/precision-schedule.tsx",
  "src/components/precision-workspaces.tsx",
  "src/components/precision-media.tsx",
  ...featurePresentationFiles("src/features"),
];

const forbidden = [
  {
    label: "page-root maximum width",
    pattern: /<WorkspacePage[^>]*className=["'][^"']*max-w-/g,
  },
  {
    label: "TypeScript viewport measurement",
    pattern: /window\.(?:innerHeight|innerWidth)/g,
  },
  {
    label: "page-specific remaining-height calculation",
    pattern: /(?:lg|xl):h-\[calc\(100%-[^\]]+\)\]/g,
  },
];

const failures = [];

for (const file of authenticatedPresentationFiles) {
  const source = readFileSync(file, "utf8");
  if (
    /from\s+["'][^"']*(?:tracker-app|remaining-routes|route-controllers)["']/.test(
      source
    )
  ) {
    failures.push(`${file} imports a retired application bucket.`);
  }
  for (const rule of forbidden) {
    const matches = [...source.matchAll(rule.pattern)];
    for (const match of matches) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      failures.push(`${file}:${line} introduces ${rule.label}: ${match[0]}`);
    }
  }

  const workspacePages = [...source.matchAll(/<WorkspacePage\b([^>]*)>/g)];
  for (const match of workspacePages) {
    if (!/\bfamily=/.test(match[1])) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      failures.push(
        `${file}:${line} is missing an explicit WorkspacePage family.`
      );
    }
  }

  if (workspacePages.length > 0 && !/<PageContent\b/.test(source)) {
    failures.push(
      `${file} uses WorkspacePage without the shared PageContent wrapper.`
    );
  }

  for (const match of source.matchAll(
    /<(?:MasterDetail|ThreePane)\b[^>]*className=["'][^"']*grid-cols-\[/g
  )) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    failures.push(
      `${file}:${line} overrides shared pane geometry instead of using a shared variant.`
    );
  }
}

for (const retired of [
  "src/app/tracker-app.tsx",
  "src/features/routes/remaining-routes.tsx",
  "src/features/routes/route-controllers.ts",
]) {
  if (existsSync(retired))
    failures.push(
      `${retired} must stay removed; routes own their application modules.`
    );
}
const routeSource = readFileSync(
  "src/features/team/team-chat-page.tsx",
  "utf8"
);
const workspaceLayoutSource = readFileSync(
  "src/app/(workspace)/layout.tsx",
  "utf8"
);
if (!workspaceLayoutSource.includes("<WorkspaceRuntime>")) {
  failures.push(
    "Workspace routes must use the persistent WorkspaceRuntime layout."
  );
}
const workspaceRuntimeSource = readFileSync(
  "src/features/workspace/workspace-runtime.tsx",
  "utf8"
);
if (/from\s+["'][^"']*-application["']/.test(workspaceRuntimeSource)) {
  failures.push(
    "WorkspaceRuntime must not import route applications; Next.js owns route selection."
  );
}
for (const slot of [
  "conversation-header",
  "conversation-history",
  "conversation-composer",
]) {
  if (!routeSource.includes(`data-slot="${slot}"`)) {
    failures.push(`Team Chat is missing the shared ${slot} region.`);
  }
}

const workspacePageSource = readFileSync(
  "src/components/workspace-page/workspace-page.tsx",
  "utf8"
);
if (!/max-w-\[1920px\]/.test(workspacePageSource)) {
  failures.push(
    "WorkspacePage no longer owns the shared 1920px maximum content width."
  );
}
if (!/data-family=/.test(workspacePageSource)) {
  failures.push("WorkspacePage no longer exposes its explicit layout family.");
}

const pageContentSource = readFileSync(
  "src/components/workspace-page/page-content.tsx",
  "utf8"
);
if (!/data-slot="page-content"/.test(pageContentSource)) {
  failures.push("PageContent no longer exposes the shared page-content slot.");
}

if (failures.length) {
  console.error(
    `Workspace layout check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`
  );
  process.exit(1);
}

console.log(
  `Workspace layout check passed for ${authenticatedPresentationFiles.length} presentation files.`
);

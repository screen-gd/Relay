import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const changes = [
  [
    "website/components/ClientReviewDemo.tsx",
    'src="/videos/client-review-city.mp4"',
    'src="/api/client-review-video"',
  ],
  [
    "website/package.json",
    '"test:visibility": "node --test ../scripts/check-marketing-origin.test.mjs"',
    '"test:visibility": "node --test ../scripts/check-marketing-origin.test.mjs",\n    "test:video": "node --test ../scripts/check-client-review-video.test.mjs"',
  ],
];
assert.equal(
  execFileSync("git", ["diff", "--cached", "--name-only"], {
    encoding: "utf8",
  }).trim(),
  ""
);
for (const [path, before, after] of changes) {
  const original = execFileSync("git", ["show", `HEAD:${path}`], {
    encoding: "utf8",
  });
  assert.equal(original.split(before).length, 2, path);
  const hash = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    input: original.replace(before, after),
    encoding: "utf8",
  }).trim();
  execFileSync("git", [
    "update-index",
    "--add",
    "--cacheinfo",
    `100644,${hash},${path}`,
  ]);
}
execFileSync("git", [
  "add",
  "--",
  "website/lib/client-review-video.ts",
  "website/app/api/client-review-video/route.ts",
  "scripts/check-client-review-video.test.mjs",
]);

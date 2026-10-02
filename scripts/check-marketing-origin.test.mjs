import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("marketing URLs ignore the app origin and normalize their own setting", () => {
  const moduleUrl = new URL("../website/lib/site-metadata.ts", import.meta.url);
  for (const [configured, expected] of [
    ["", "https://web.relay-app.cc.cd"],
    ["   ", "https://web.relay-app.cc.cd"],
    [" https://marketing.example.com/ ", "https://marketing.example.com"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `import { siteUrl } from ${JSON.stringify(moduleUrl.href)}; console.log(siteUrl);`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: "https://relay-app.cc.cd",
          NEXT_PUBLIC_MARKETING_SITE_URL: configured,
        },
      }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), expected);
  }
});

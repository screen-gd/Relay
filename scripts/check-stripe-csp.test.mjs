import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.mjs";

test("Clerk checkout can load Stripe", async () => {
  const [{ headers }] = await nextConfig.headers();
  const csp = headers.find(
    ({ key }) => key === "Content-Security-Policy"
  )?.value;

  assert.match(csp, /script-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/api\.stripe\.com/);
});

test("client hubs allow supported video players without allowing arbitrary frames", async () => {
  const [{ headers }] = await nextConfig.headers();
  const csp = headers.find(
    ({ key }) => key === "Content-Security-Policy"
  )?.value;
  const frameSources = csp
    .split("; ")
    .find((directive) => directive.startsWith("frame-src "))
    .split(" ");

  assert.ok(frameSources.includes("https://www.youtube-nocookie.com"));
  assert.ok(frameSources.includes("https://player.vimeo.com"));
  assert.ok(!frameSources.includes("*"));
  assert.ok(!frameSources.includes("https:"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

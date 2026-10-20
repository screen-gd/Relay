import assert from "node:assert/strict";
import test from "node:test";
import { securityHeaders } from "../security-headers.mjs";

test("Clerk checkout can load Stripe", () => {
  const csp = securityHeaders()["Content-Security-Policy"];

  assert.match(csp, /script-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/api\.stripe\.com/);
});

test("client hubs allow supported video players without allowing arbitrary frames", () => {
  const csp = securityHeaders()["Content-Security-Policy"];
  const frameSources = csp
    .split("; ")
    .find((directive) => directive.startsWith("frame-src "))
    .split(" ");

  assert.ok(frameSources.includes("https://www.youtube-nocookie.com"));
  assert.ok(frameSources.includes("https://player.vimeo.com"));
  assert.ok(!frameSources.includes("*"));
  assert.ok(!frameSources.includes("https:"));
  const scriptSources = csp
    .split("; ")
    .find((directive) => directive.startsWith("script-src "))
    .split(" ");
  assert.ok(scriptSources.includes("https://www.youtube.com"));
  assert.ok(scriptSources.includes("https://player.vimeo.com"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

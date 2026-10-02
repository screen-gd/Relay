import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

// Check route availability without freezing editorial copy or internal markup.
const routes = [
  "/",
  "/projects",
  "/calendar",
  "/timeline",
  "/clients",
  "/feedback",
  "/files",
  "/media",
  "/resources",
  "/templates",
  "/integrations",
  "/team",
  "/team-chat",
  "/reports",
  "/settings",
  "/account",
  "/organization",
  "/profile/edit",
  "/sample-studio",
  "/profile",
  "/client-hub",
  "/client-portal",
  "/privacy",
  "/terms",
  "/contact",
  "/accessibility",
];
const publicRoutes = [
  "/client-portal",
  "/privacy",
  "/terms",
  "/contact",
  "/accessibility",
  "/route-that-does-not-exist",
];
const startupTimeoutMs = 30_000;
let server;
let browser;

try {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      join("node_modules", "next", "dist", "bin", "next"),
      "start",
      "-p",
      String(port),
    ],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  await waitForServer(baseUrl, () => output);

  for (const path of routes) {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200, `${path} must render successfully`);
    assert.match(
      response.headers.get("content-type") ?? "",
      /text\/html/,
      `${path} must return HTML`
    );
    await response.body?.cancel();
  }
  for (const path of [
    "/route-that-does-not-exist",
    "/early-access",
    "/api/early-access",
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 404, `${path} must stay unavailable`);
    await response.body?.cancel();
  }
  console.log(
    `Production routes verified: ${routes.length} pages and 3 expected 404s.`
  );

  browser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      for (const path of publicRoutes) {
        const pageErrors = [];
        page.on("pageerror", onPageError);
        function onPageError(error) {
          pageErrors.push(error.message);
        }
        try {
          await page.goto(`${baseUrl}${path}`, {
            waitUntil: "domcontentloaded",
          });
          await page.locator("main").waitFor({ state: "visible" });
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(() => document.activeElement === document.body),
            false,
            `Keyboard focus must enter ${path}`
          );
          for (const fontSize of ["100%", "200%"]) {
            const overflow = await page.evaluate((size) => {
              document.documentElement.style.fontSize = size;
              return (
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth + 1
              );
            }, fontSize);
            assert.equal(
              overflow,
              false,
              `${path} overflows at ${viewport.width}px with ${fontSize} text`
            );
          }
          assert.deepEqual(
            pageErrors,
            [],
            `${path} has browser runtime errors`
          );
        } finally {
          page.off("pageerror", onPageError);
        }
      }
    } finally {
      await context.close();
    }
  }
  console.log(
    "Public pages passed desktop/mobile layout, keyboard entry, and 200% text resizing checks."
  );
} finally {
  await browser?.close();
  if (server) await stopServer(server);
}

async function getOpenPort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.on("error", reject);
    socket.listen(0, resolve);
  });
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function waitForServer(url, getOutput) {
  const started = Date.now();
  while (Date.now() - started < startupTimeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      // Retry until the server is ready or the timeout expires.
    }
    if (server.exitCode !== null)
      throw new Error(`Production server exited.\n${getOutput()}`);
    await delay(300);
  }
  throw new Error(`Production server startup timed out.\n${getOutput()}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (child.exitCode === null && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      timeout: 5_000,
    });
  }
}

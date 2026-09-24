import { chromium } from "@playwright/test";

const baseUrl = process.env.RELAY_VERIFY_URL?.replace(/\/$/, "");

if (!baseUrl) {
  console.error(
    "Set RELAY_VERIFY_URL before running the Cloudflare auth check."
  );
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  await signIn.waitFor({ state: "visible" });
  await signIn.click();

  const unavailable = page.getByText(/Sign-in is unavailable until Clerk/);
  const clerkModal = page.locator('[class*="cl-modalBackdrop"]');

  await Promise.race([
    unavailable.waitFor({ state: "visible", timeout: 10_000 }).then(() => {
      throw new Error(
        "Cloudflare account sign-in is disabled by incomplete public runtime configuration."
      );
    }),
    clerkModal.waitFor({ state: "visible", timeout: 10_000 }),
  ]);

  console.log(`Cloudflare Clerk sign-in opened successfully at ${baseUrl}.`);
} finally {
  await browser.close();
}

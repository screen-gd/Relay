import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/render-with-router";
import { AccountSettingsPage } from "./account-page";

const account = vi.hoisted(() => ({
  isAuthEnabled: false,
  isSignedIn: false,
  isLoaded: true,
  openSignIn: vi.fn(),
  openSignUp: vi.fn(),
}));

vi.mock("./account-controller", () => ({
  useAccountController: () => account,
}));

describe("Account settings in local mode", () => {
  it.each([false, true])(
    "keeps public profile editing available when sign-in availability is %s",
    async (isAuthEnabled) => {
      account.isAuthEnabled = isAuthEnabled;
      const html = await renderWithRouter(<AccountSettingsPage />, "/account");
      expect(html).toContain('href="/profile/edit"');
      expect(html).toContain("Edit public profile");
      expect(html).not.toContain("Sign in to edit");
      expect(html.includes("Create account")).toBe(isAuthEnabled);
      expect(html.includes("Sign-in is currently unavailable")).toBe(
        !isAuthEnabled
      );
    }
  );
});

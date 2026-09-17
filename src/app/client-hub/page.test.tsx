import { renderToStaticMarkup } from "react-dom/server";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { expect, test } from "vitest";
import ClientHubPage from "./page";
import { UserBillingProfile } from "@/components/subscription-plans";

test("billing profile renders signed out without Clerk configuration", () => {
  expect(renderToStaticMarkup(<UserBillingProfile />)).toContain(
    "Sign in to view your billing profile."
  );
});

test("Client Hub renders signed out without Clerk configuration", () => {
  const client = new ConvexReactClient("https://placeholder.convex.cloud");
  const html = renderToStaticMarkup(
    <ConvexProviderWithAuth
      client={client}
      useAuth={() => ({
        isLoading: false,
        isAuthenticated: false,
        fetchAccessToken: async () => null,
      })}
    >
      <ClientHubPage />
    </ConvexProviderWithAuth>
  );
  expect(html).toContain("Sign in to view your projects");
});

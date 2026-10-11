import { NextRequest } from "next/server";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([
  [
    "GET",
    "/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
    "application/javascript",
  ],
  [
    "POST",
    "/v1/client/sessions/sess_test/tokens?template=convex",
    "application/json",
  ],
])(
  "forwards Clerk %s requests on the custom production domain",
  async (method, path, contentType) => {
    vi.stubEnv(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`
    );
    vi.stubEnv("CLERK_SECRET_KEY", "sk_live_proxy_test");
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("upstream response", {
        headers: { "content-type": contentType },
      })
    );
    vi.stubGlobal("fetch", upstream);

    const { default: proxy, config } = await import("./middleware");
    const url = `https://relay-app.cc.cd/__clerk${path}`;
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      true
    );
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/projects" })
    ).toBe(false);

    const request = new NextRequest(url, { method });
    const event = new NextFetchEvent({
      request,
      page: "/__clerk",
      context: undefined,
    });
    const response = await proxy(request, event);
    expect(upstream).toHaveBeenCalledWith(
      `https://frontend-api.clerk.dev${path}`,
      expect.objectContaining({ method })
    );
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response))
      throw new Error("Clerk proxy returned no response");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(contentType);
    expect(await response.text()).toBe("upstream response");
  }
);

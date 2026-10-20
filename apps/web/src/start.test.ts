import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

function stubClerkProxy(contentType: string) {
  vi.stubEnv(
    "VITE_CLERK_PUBLISHABLE_KEY",
    `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`
  );
  vi.stubEnv("CLERK_SECRET_KEY", "sk_live_proxy_test");
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(
    new Response("upstream response", {
      headers: { "content-type": contentType },
    })
  );
  vi.stubGlobal("fetch", upstream);
  return upstream;
}

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
    const upstream = stubClerkProxy(contentType);
    const { handleClerkProxy } = await import("./start");

    const response = await handleClerkProxy(
      new Request(`https://relay-app.cc.cd/__clerk${path}`, { method })
    );

    expect(upstream).toHaveBeenCalledWith(
      `https://frontend-api.clerk.dev${path}`,
      expect.objectContaining({ method })
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe(contentType);
    expect(await response?.text()).toBe("upstream response");
  }
);

test("leaves app routes to the router", async () => {
  const upstream = stubClerkProxy("text/html");
  const { handleClerkProxy } = await import("./start");

  const response = await handleClerkProxy(
    new Request("https://relay-app.cc.cd/projects")
  );

  expect(response).toBeUndefined();
  expect(upstream).not.toHaveBeenCalled();
});

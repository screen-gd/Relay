import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendContactEmail } from "./contact-email";

const input = {
  name: " Client ",
  email: " client@example.com ",
  message: " Need help with reviews. ",
  website: "",
  captchaToken: "proof",
  submissionId: "6d477c1b-78b4-4fef-94fa-2d1f3d1e730c",
};
const proof = { success: true, hostname: "relay.example", action: "contact" };
function request(body: unknown = input, origin = "https://relay.example") {
  return new Request("https://relay.example/api/contact", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("CONTACT_FROM_EMAIL", "support@relay.example");
  vi.stubEnv("CONTACT_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("CONTACT_TURNSTILE_SECRET_KEY", "secret-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("sends verified contact messages only to Relay, with reply-to and a stable idempotency key", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(proof))
    .mockResolvedValueOnce(Response.json({ id: "queued-message" }));
  vi.stubGlobal("fetch", fetcher);
  const response = await sendContactEmail(request());
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({ kind: "submitted" });
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  );
  const verification = fetcher.mock.calls[0][1].body as URLSearchParams;
  expect(verification.get("secret")).toBe("secret-key");
  expect(verification.get("response")).toBe("proof");
  const [url, options] = fetcher.mock.calls[1];
  expect(url).toBe("https://api.resend.com/emails");
  expect(JSON.parse(options.body)).toEqual({
    from: "Relay Support <support@relay.example>",
    to: ["screen.dev@protonmail.com"],
    reply_to: "client@example.com",
    subject: "Relay inquiry from Client",
    text: "Name: Client\nEmail: client@example.com\n\nNeed help with reviews.",
  });
  expect(options.headers["Idempotency-Key"]).toBe(
    `contact/${input.submissionId}`
  );
});

it("rejects cross-origin, malformed, oversized and recipient-injection requests before external calls", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await sendContactEmail(request(input, "https://attacker.example"))).status
  ).toBe(403);
  for (const body of [
    { ...input, name: "Client\r\nBcc: victim@example.com" },
    { ...input, email: "bad" },
    { ...input, message: " " },
    { ...input, to: "victim@example.com" },
  ]) {
    expect((await sendContactEmail(request(body))).status).toBe(400);
  }
  expect(
    (await sendContactEmail(request({ ...input, message: "x".repeat(20_000) })))
      .status
  ).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});

it("does not send mail for failed, wrong-host or wrong-action security checks", async () => {
  for (const result of [
    { ...proof, success: false },
    { ...proof, hostname: "attacker.example" },
    { ...proof, action: "other" },
  ]) {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetcher);
    expect((await sendContactEmail(request())).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});

it("reports unavailable configuration and provider failures without claiming success or exposing credentials", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("RESEND_API_KEY", "");
  expect((await sendContactEmail(request())).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  for (const result of [
    Response.json({ error: "secret provider details" }, { status: 500 }),
    Response.json({}),
  ]) {
    fetcher
      .mockResolvedValueOnce(Response.json(proof))
      .mockResolvedValueOnce(result);
    const response = await sendContactEmail(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ kind: "delivery_unconfirmed" });
  }
  fetcher
    .mockResolvedValueOnce(Response.json(proof))
    .mockRejectedValueOnce(new Error("provider timeout"));
  expect((await sendContactEmail(request())).status).toBe(502);
});

it("silently discards filled honeypots without contacting external services", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await sendContactEmail(request({ ...input, website: "spam.example" })))
      .status
  ).toBe(202);
  expect(fetcher).not.toHaveBeenCalled();
});

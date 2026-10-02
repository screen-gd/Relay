import "server-only";
import { z } from "zod";

const supportInbox = "screen.dev@protonmail.com";
const emailAddress = z.string().trim().max(254).email();
const inputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[^\r\n\x00-\x1f\x7f]+$/),
    email: emailAddress,
    message: z.string().trim().min(1).max(4000),
    website: z.string().max(200),
    captchaToken: z.string().min(1).max(2048),
    submissionId: z.string().uuid(),
  })
  .strict();

export function contactEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  const siteKey = process.env.CONTACT_TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.CONTACT_TURNSTILE_SECRET_KEY?.trim();
  return apiKey &&
    emailAddress.safeParse(fromEmail).success &&
    siteKey &&
    secretKey
    ? { apiKey, fromEmail: fromEmail!, siteKey, secretKey }
    : undefined;
}

function reply(kind: string, status: number) {
  return Response.json(
    { kind },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

async function boundedJson(request: Request) {
  if (!request.body) throw new Error("Empty body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function sendContactEmail(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return reply("invalid_origin", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return reply("invalid_content_type", 415);
  const config = contactEmailConfig();
  if (!config) return reply("unavailable", 503);
  let raw: unknown;
  try {
    raw = await boundedJson(request);
  } catch {
    return reply("invalid_input", 400);
  }
  if (raw === undefined) return reply("too_large", 413);
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return reply("invalid_input", 400);
  const { name, email, message, website, captchaToken, submissionId } =
    parsed.data;
  if (website) return reply("submitted", 202);

  try {
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: config.secretKey,
          response: captchaToken,
          idempotency_key: submissionId,
        }),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      }
    );
    const challenge: unknown = await verification.json();
    if (
      !verification.ok ||
      !challenge ||
      typeof challenge !== "object" ||
      !("success" in challenge) ||
      challenge.success !== true ||
      !("hostname" in challenge) ||
      challenge.hostname !== new URL(request.url).hostname ||
      !("action" in challenge) ||
      challenge.action !== "contact"
    )
      return reply("verification_failed", 403);

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact/${submissionId}`,
      },
      body: JSON.stringify({
        from: `Relay Support <${config.fromEmail}>`,
        to: [supportInbox],
        reply_to: email,
        subject: `Relay inquiry from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!sent.ok) return reply("delivery_unconfirmed", 502);
    const result: unknown = await sent.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("id" in result) ||
      typeof result.id !== "string" ||
      !result.id
    )
      return reply("delivery_unconfirmed", 502);
    return reply("submitted", 202);
  } catch {
    return reply("delivery_unconfirmed", 502);
  }
}

"use client";

import { supportEmail } from "@/lib/support-contact";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fieldClass =
  "min-h-12 w-full rounded-md border border-[var(--app-strong-border)] bg-[var(--app-control)] px-3 py-2 text-base text-[var(--app-ink)] outline-none transition-colors placeholder:text-[var(--app-subtle)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]";

class ContactSubmissionError extends Error {}

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export function ContactForm({
  enabled = false,
  siteKey,
}: {
  enabled?: boolean;
  siteKey?: string;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState("");
  const challenge = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const submissionId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      !enabled ||
      !loaded ||
      !siteKey ||
      !challenge.current ||
      !window.turnstile
    )
      return;
    try {
      widget.current = window.turnstile.render(challenge.current, {
        sitekey: siteKey,
        action: "contact",
        callback: (value) => {
          setToken(value);
          setVerificationError("");
        },
        "expired-callback": () => setToken(""),
        "error-callback": () => {
          setToken("");
          setVerificationError(
            "The security check could not load. Please refresh or email support directly."
          );
        },
      });
    } catch {
      setVerificationError(
        "The security check could not load. Please refresh or email support directly."
      );
    }
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [enabled, loaded, siteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy || !token) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    submissionId.current ??= crypto.randomUUID();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(values.get("name") || "").trim(),
          email: String(values.get("email") || "").trim(),
          message: String(values.get("message") || "").trim(),
          website: String(values.get("website") || ""),
          captchaToken: token,
          submissionId: submissionId.current,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result: unknown = await response.json();
      const kind =
        result && typeof result === "object" && "kind" in result
          ? result.kind
          : undefined;
      if (!response.ok || kind !== "submitted") {
        throw new ContactSubmissionError(
          kind === "verification_failed"
            ? "Please complete a new security check and try again."
            : kind === "invalid_input"
              ? "Check your name, email address and message, then try again."
              : kind === "unavailable"
                ? "The contact form is temporarily unavailable. Please email support directly."
                : "We could not confirm your submission. Try again or email support directly."
        );
      }
      setStatus(
        "Your message was submitted. We’ll reply to the email address you provided."
      );
      form.reset();
      submissionId.current = undefined;
    } catch (caught) {
      setError(
        caught instanceof ContactSubmissionError
          ? caught.message
          : "We could not confirm your submission. Try again or email support directly."
      );
    } finally {
      setBusy(false);
      setToken("");
      if (widget.current) window.turnstile?.reset(widget.current);
    }
  }

  return (
    <form
      className="mt-5 grid gap-4"
      onSubmit={(event) => void handleSubmit(event)}
      aria-busy={busy}
      onChange={() => {
        submissionId.current = undefined;
        setStatus("");
      }}
    >
      <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
        <div className="grid gap-2">
          <Label className="text-base font-semibold" htmlFor="contact-name">
            Name
          </Label>
          <Input
            className={fieldClass}
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-base font-semibold" htmlFor="contact-email">
            Email
          </Label>
          <Input
            className={fieldClass}
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-base font-semibold" htmlFor="contact-message">
            How can we help?
          </Label>
          <Textarea
            className={`${fieldClass} min-h-36 resize-y`}
            id="contact-message"
            name="message"
            required
            maxLength={4000}
            aria-describedby="contact-message-help"
          />
          <p
            id="contact-message-help"
            className="text-sm text-[var(--app-muted)]"
          >
            Do not include passwords, API keys, or private client files.
          </p>
        </div>
        <label className="absolute -left-[10000px]" aria-hidden="true">
          Website
          <Input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            maxLength={200}
          />
        </label>
        {enabled && siteKey ? (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              onReady={() => setLoaded(true)}
              onError={() =>
                setVerificationError(
                  "The security check could not load. Please refresh or email support directly."
                )
              }
            />
            <div ref={challenge} aria-label="Security check" />
          </>
        ) : (
          <p role="status" className="text-sm text-[var(--app-muted)]">
            The contact form is temporarily unavailable. You can email us
            directly at{" "}
            <a className="underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        )}
        <p className="text-sm text-[var(--app-muted)]">
          We use your name, email and message to respond to your inquiry.{" "}
          <a className="underline" href="/privacy">
            Privacy policy
          </a>
          .
        </p>
        <div>
          <Button
            className="min-h-12 rounded-md bg-[var(--app-accent)] px-5 text-base font-semibold text-white transition-colors hover:bg-[var(--app-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
            type="submit"
            disabled={!enabled || busy || !token}
          >
            {busy ? "Sending..." : "Send message"}
          </Button>
        </div>
      </fieldset>
      {verificationError ? (
        <p role="alert" className="text-sm text-destructive">
          {verificationError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          className="text-sm leading-6 text-[var(--app-muted)]"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </form>
  );
}

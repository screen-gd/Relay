import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AuthLoadingGate } from "./app-feedback";

const noop = () => undefined;

describe("AuthLoadingGate", () => {
  test("shows the loading status while Clerk is still starting", () => {
    const html = renderToStaticMarkup(
      <AuthLoadingGate clerkStatus="loading" onContinueLocally={noop} />
    );
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  test("offers Retry and Local Mode as soon as Clerk reports an error", () => {
    const html = renderToStaticMarkup(
      <AuthLoadingGate clerkStatus="error" onContinueLocally={noop} />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Relay could not start account sign-in.");
    expect(html).toContain(">Retry<");
    expect(html).toContain(">Use Local Mode<");
    expect(html).not.toContain('role="status"');
  });
});

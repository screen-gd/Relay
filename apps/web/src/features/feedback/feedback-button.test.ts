import { expect, test } from "vitest";
import { composeFeedbackMailto } from "./feedback-button";

test("the feedback link carries the note and the page it came from", () => {
  const link = composeFeedbackMailto(
    "Export CSV drops my quotes",
    "https://relay.test/projects?tab=paid"
  );
  expect(link).toContain("mailto:support@contact.relay-app.cc.cd?");
  const body = decodeURIComponent(link.split("&body=")[1]);
  expect(body).toBe(
    "Export CSV drops my quotes\n\nPage: https://relay.test/projects?tab=paid"
  );
});

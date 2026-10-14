import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageActions } from "./page-actions";

describe("PageActions", () => {
  it("shows the primary action and keeps the rest behind More", () => {
    const html = renderToStaticMarkup(
      <PageActions
        primary={<button type="button">New Client</button>}
        more={[
          { label: "Show archived", onSelect: () => undefined, checked: false },
          { label: "Import clients", onSelect: () => undefined },
        ]}
      />
    );
    expect(html).toContain("New Client");
    expect(html).toContain("More");
    expect(html).not.toContain("Import clients");
    expect(html).not.toContain("Show archived");
  });

  it("omits the More trigger when no secondary action exists", () => {
    const html = renderToStaticMarkup(
      <PageActions primary={<button type="button">New Client</button>} />
    );
    expect(html).toContain("New Client");
    expect(html).not.toContain("More");
  });
});

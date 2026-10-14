import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RevisionAllowance, readRevisionAllowance } from "./revision-allowance";

describe("client portal revision allowance", () => {
  it("reads the allowance numbers alone", () => {
    expect(readRevisionAllowance({ used: 2, limit: 3 })).toEqual({
      used: 2,
      limit: 3,
    });
    expect(
      readRevisionAllowance({ used: 2, limit: 3, revisionLimit: 99 })
    ).toEqual({ used: 2, limit: 3 });
    expect(readRevisionAllowance({ used: "2", limit: 3 })).toBeNull();
    expect(readRevisionAllowance({ limit: 3 })).toBeNull();
    expect(readRevisionAllowance(null)).toBeNull();
  });

  it("shows the used count against the limit and stays quiet without one", () => {
    expect(
      renderToStaticMarkup(
        createElement(RevisionAllowance, { allowance: { used: 2, limit: 3 } })
      )
    ).toContain("2 of 3 revisions used");
    expect(
      renderToStaticMarkup(
        createElement(RevisionAllowance, { allowance: null })
      )
    ).toBe("");
  });
});

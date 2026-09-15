import { expect, test } from "vitest";
import { omitLegacySettings } from "./settings-persistence";

test("persisted settings omit local-only fields", () => {
  expect(
    omitLegacySettings({
      theme: "Dark",
      density: "Compact",
    })
  ).toEqual({ theme: "Dark" });
});

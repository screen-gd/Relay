import { expect, test } from "vitest";
import { projectViewSearch } from "./route-head";

test.each([
  [{}, undefined],
  [{ view: "outputs" }, "outputs"],
  [{ view: ["files", "review"] }, "files"],
  [{ view: 123 }, undefined],
])("project ?view= search %j parses to %s", (search, view) => {
  expect(projectViewSearch.parse(search)).toEqual({ view });
});

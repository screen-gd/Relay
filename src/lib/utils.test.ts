import { expect, test } from "vitest";
import { cn } from "./utils";

test("type roles coexist with text colors while later roles replace earlier ones", () => {
  expect(cn("text-body text-[var(--text-primary)]", "text-meta")).toBe(
    "text-[var(--text-primary)] text-meta"
  );
  expect(cn("text-meta", "text-[var(--text-meta)]")).toBe(
    "text-meta text-[var(--text-meta)]"
  );
});

import { expect, it } from "vitest";
import {
  formatReviewTimestamp,
  parseReviewTimestamp,
} from "./review-timestamps";

it("preserves zero, minutes and hours while rejecting ambiguous or out-of-range manual timestamps", () => {
  expect(parseReviewTimestamp("  ")).toBeUndefined();
  for (const seconds of [0, 65, 3600, 604800]) {
    expect(parseReviewTimestamp(formatReviewTimestamp(seconds))).toBe(seconds);
  }
  expect(formatReviewTimestamp(12.7)).toBe("0:12");
  for (const value of [
    "12",
    "1:5",
    "1:60",
    "-1:00",
    "1:00:60",
    "168:00:01",
    "text",
  ]) {
    expect(() => parseReviewTimestamp(value)).toThrow();
  }
});

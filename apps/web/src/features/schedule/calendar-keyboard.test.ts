import { describe, expect, it } from "vitest";
import { calendarDateForKey } from "./calendar-keyboard";

function move(value: string, key: string, weekStart = "Mon") {
  const date = new Date(`${value}T00:00:00`);
  const next = calendarDateForKey(date, key, weekStart);
  expect(date.getTime()).toBe(new Date(`${value}T00:00:00`).getTime());
  return next && [next.getFullYear(), next.getMonth() + 1, next.getDate()];
}

describe("calendar keyboard dates", () => {
  it.each([
    ["2026-10-01", "ArrowLeft", [2026, 9, 30]],
    ["2026-12-31", "ArrowRight", [2027, 1, 1]],
    ["2026-10-03", "ArrowUp", [2026, 9, 26]],
    ["2026-10-29", "ArrowDown", [2026, 11, 5]],
    ["2026-03-31", "PageUp", [2026, 2, 28]],
    ["2024-03-31", "PageUp", [2024, 2, 29]],
    ["2024-01-31", "PageDown", [2024, 2, 29]],
    ["2026-12-31", "PageDown", [2027, 1, 31]],
    ["2026-01-31", "PageUp", [2025, 12, 31]],
  ])("moves %s with %s", (value, key, expected) => {
    expect(move(value, key)).toEqual(expected);
  });

  it.each([
    ["Mon", "Home", [2026, 9, 28]],
    ["Mon", "End", [2026, 10, 4]],
    ["Sun", "Home", [2026, 9, 27]],
    ["Sun", "End", [2026, 10, 3]],
    ["Sat", "Home", [2026, 9, 26]],
    ["Sat", "End", [2026, 10, 2]],
  ])("uses %s week bounds for %s", (weekStart, key, expected) => {
    expect(move("2026-10-01", key, weekStart)).toEqual(expected);
  });

  it("leaves activation and Tab to the button", () => {
    for (const key of ["Tab", "Enter", " ", "Escape"]) {
      expect(move("2026-10-01", key)).toBeNull();
    }
  });
});

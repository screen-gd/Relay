import { describe, expect, it } from "vitest";
import { normalizeAnnotations } from "../../../convex/mediaVersionAnnotations";
import {
  addAnnotationShape,
  extendAnnotationStroke,
  type AnnotationShape,
} from "./media-version-annotations";

const point = { x: 0.5, y: 0.5 };
const pin = { type: "pin", ...point } as const;
function stroke(length: number): AnnotationShape {
  return {
    type: "stroke",
    points: Array.from({ length }, () => ({ ...point })),
  };
}

describe("drawing submission budgets", () => {
  it("keeps twenty pins sendable and allows drawing again after undo", () => {
    const full = Array.from({ length: 20 }, () => pin);
    expect(normalizeAnnotations(full)).toEqual(full);
    expect(addAnnotationShape(full, pin)).toBeUndefined();
    const afterUndo = addAnnotationShape(full.slice(0, -1), pin);
    expect(afterUndo).toEqual(full);
  });

  it("stops extending at the total point budget before submission fails", () => {
    const almostFull = [stroke(200), stroke(200), stroke(199)];
    const full = extendAnnotationStroke(almostFull, point);
    expect(full).toBeDefined();
    if (!full) throw new Error("Expected one point of drawing capacity");
    expect(normalizeAnnotations(full)).toEqual(full);
    expect(extendAnnotationStroke(full, point)).toBeUndefined();
    expect(addAnnotationShape(full, pin)).toBeUndefined();
    expect(addAnnotationShape(full, stroke(2))).toBeUndefined();
    expect(addAnnotationShape(almostFull, stroke(2))).toBeUndefined();
    expect(
      normalizeAnnotations(addAnnotationShape(almostFull, pin) ?? [])
    ).toHaveLength(4);
  });

  it("ends a full stroke while allowing another stroke within the budget", () => {
    const fullStroke = [stroke(200)];
    expect(extendAnnotationStroke(fullStroke, point)).toBeUndefined();
    const next = addAnnotationShape(fullStroke, stroke(2));
    expect(next).toBeDefined();
    expect(normalizeAnnotations(next ?? [])).toHaveLength(2);
  });
});

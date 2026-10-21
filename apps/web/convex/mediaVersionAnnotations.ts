import { v, type Infer } from "convex/values";

// Client frame annotations: pins and freehand strokes are two shapes of one
// validator. Coordinates are normalized 0-1 against the frame so a phone mark
// lands in the same place on the editor's desktop player.
export const MAX_ANNOTATION_SHAPES = 20;
export const MAX_STROKE_POINTS = 200;
export const MAX_ANNOTATION_POINTS = 600;
export const MIN_STROKE_POINTS = 2;
// Normalizing a pointer position introduces float drift; values inside this
// margin are clamped, anything further out is a malformed submission.
const COORDINATE_DRIFT = 0.05;

export const annotationPointValidator = v.object({
  x: v.number(),
  y: v.number(),
});

export const annotationShapeValidator = v.union(
  v.object({
    type: v.literal("pin"),
    x: v.number(),
    y: v.number(),
  }),
  v.object({
    type: v.literal("stroke"),
    points: v.array(annotationPointValidator),
  })
);

export type AnnotationPoint = Infer<typeof annotationPointValidator>;
export type AnnotationShape = Infer<typeof annotationShapeValidator>;

function coordinate(value: number, label: string) {
  if (!Number.isFinite(value))
    throw new Error(`${label} coordinates must be finite numbers`);
  if (value < -COORDINATE_DRIFT || value > 1 + COORDINATE_DRIFT)
    throw new Error(`${label} coordinates must be normalized between 0 and 1`);
  return Math.min(1, Math.max(0, value));
}

/**
 * Validates a client submission and returns the stored shapes: counts are
 * capped, coordinates clamped to the frame, and NaN/Infinity rejected.
 */
export function normalizeAnnotations(
  shapes: readonly AnnotationShape[]
): AnnotationShape[] {
  if (shapes.length > MAX_ANNOTATION_SHAPES)
    throw new Error(
      `A comment can hold at most ${MAX_ANNOTATION_SHAPES} annotations`
    );
  const totalPoints = shapes.reduce(
    (total, shape) => total + (shape.type === "pin" ? 1 : shape.points.length),
    0
  );
  if (totalPoints > MAX_ANNOTATION_POINTS)
    throw new Error(
      `A comment can hold at most ${MAX_ANNOTATION_POINTS} annotation points`
    );
  return shapes.map((shape) => {
    if (shape.type === "pin")
      return {
        type: "pin" as const,
        x: coordinate(shape.x, "Pin"),
        y: coordinate(shape.y, "Pin"),
      };
    if (shape.points.length < MIN_STROKE_POINTS)
      throw new Error("A stroke needs at least two points");
    if (shape.points.length > MAX_STROKE_POINTS)
      throw new Error(`A stroke can hold at most ${MAX_STROKE_POINTS} points`);
    return {
      type: "stroke" as const,
      points: shape.points.map((point) => ({
        x: coordinate(point.x, "Stroke"),
        y: coordinate(point.y, "Stroke"),
      })),
    };
  });
}

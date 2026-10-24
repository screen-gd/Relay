// Client frame annotations. Pins and freehand strokes are two shapes of one
// model; every coordinate is normalized 0-1 against the frame box so the same
// mark lands in the same place on a phone and a desktop player.
export type AnnotationPoint = { x: number; y: number };

export type AnnotationShape =
  | { type: "pin"; x: number; y: number }
  | { type: "stroke"; points: AnnotationPoint[] };

export const MAX_ANNOTATION_SHAPES = 20;
export const MAX_STROKE_POINTS = 200;
export const MAX_ANNOTATION_POINTS = 600;

function pointCount(shapes: readonly AnnotationShape[]) {
  return shapes.reduce(
    (total, shape) => total + (shape.type === "pin" ? 1 : shape.points.length),
    0
  );
}

/** Keeps a drawing within the same budgets accepted by the comment endpoint. */
export function addAnnotationShape(
  shapes: readonly AnnotationShape[],
  shape: AnnotationShape
): AnnotationShape[] | undefined {
  const added = shape.type === "pin" ? 1 : shape.points.length;
  if (
    shapes.length >= MAX_ANNOTATION_SHAPES ||
    (shape.type === "stroke" &&
      (shape.points.length < 2 || shape.points.length > MAX_STROKE_POINTS)) ||
    pointCount(shapes) + added > MAX_ANNOTATION_POINTS
  )
    return undefined;
  return [...shapes, shape];
}

export function extendAnnotationStroke(
  shapes: readonly AnnotationShape[],
  point: AnnotationPoint
): AnnotationShape[] | undefined {
  const last = shapes.at(-1);
  if (
    last?.type !== "stroke" ||
    last.points.length >= MAX_STROKE_POINTS ||
    pointCount(shapes) >= MAX_ANNOTATION_POINTS
  )
    return undefined;
  return [
    ...shapes.slice(0, -1),
    { type: "stroke", points: [...last.points, point] },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : undefined;
}

function readPoints(value: unknown): AnnotationPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points: AnnotationPoint[] = [];
  for (const entry of value.slice(0, MAX_STROKE_POINTS)) {
    if (!isRecord(entry)) continue;
    const x = coordinate(entry.x);
    const y = coordinate(entry.y);
    if (x === undefined || y === undefined) continue;
    points.push({ x, y });
  }
  return points.length >= 2 ? points : undefined;
}

/** Reads stored annotation shapes, dropping anything malformed. */
export function parseAnnotations(value: unknown): AnnotationShape[] {
  if (!Array.isArray(value)) return [];
  const shapes: AnnotationShape[] = [];
  for (const entry of value.slice(0, MAX_ANNOTATION_SHAPES)) {
    if (!isRecord(entry)) continue;
    if (entry.type === "pin") {
      const x = coordinate(entry.x);
      const y = coordinate(entry.y);
      if (x !== undefined && y !== undefined)
        shapes.push({ type: "pin", x, y });
      continue;
    }
    if (entry.type === "stroke") {
      const points = readPoints(entry.points);
      if (points) shapes.push({ type: "stroke", points });
    }
  }
  return shapes;
}

"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { MapPin, Pencil, RotateCcw, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_STROKE_POINTS,
  type AnnotationPoint,
  type AnnotationShape,
} from "./media-version-annotations";

// The frame box is 16:9 everywhere a player is rendered, so a 160x90 user
// space maps normalized coordinates without distorting pins.
const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 90;

function toUserSpace(point: AnnotationPoint) {
  return {
    x: point.x * FRAME_WIDTH,
    y: point.y * FRAME_HEIGHT,
  };
}

function strokePoints(shape: Extract<AnnotationShape, { type: "stroke" }>) {
  return shape.points
    .map((point) => {
      const { x, y } = toUserSpace(point);
      return `${x},${y}`;
    })
    .join(" ");
}

/** One pass of every shape; drawn twice so the accent mark reads on any frame. */
function ShapeLayer({
  shapes,
  pass,
}: {
  shapes: readonly AnnotationShape[];
  pass: "halo" | "line";
}) {
  const wide = pass === "halo";
  return (
    <>
      {shapes.map((shape, index) => {
        if (shape.type === "pin") {
          const { x, y } = toUserSpace(shape);
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r={wide ? 2.4 : 2}
                fill={wide ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={wide ? 4 : 2}
                vectorEffect="non-scaling-stroke"
              />
              {wide ? null : (
                <circle cx={x} cy={y} r={0.5} fill="currentColor" />
              )}
            </g>
          );
        }
        return (
          <polyline
            key={index}
            points={strokePoints(shape)}
            fill="none"
            stroke="currentColor"
            strokeWidth={wide ? 5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </>
  );
}

/**
 * Renders stored annotation shapes over a frame box. Used by the portal and by
 * the editor's comment list, so a mark always lands in the same relative spot.
 */
export function AnnotationOverlay({
  shapes,
  label,
  className,
}: {
  shapes: readonly AnnotationShape[];
  label: string;
  className?: string;
}) {
  if (!shapes.length) return null;
  return (
    <svg
      viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn("absolute inset-0 size-full", className)}
    >
      <g className="text-background">
        <ShapeLayer shapes={shapes} pass="halo" />
      </g>
      <g className="text-accent-mark">
        <ShapeLayer shapes={shapes} pass="line" />
      </g>
    </svg>
  );
}

function readPoint(event: PointerEvent<SVGSVGElement>): AnnotationPoint {
  const box = event.currentTarget.getBoundingClientRect();
  const x = box.width ? (event.clientX - box.left) / box.width : 0;
  const y = box.height ? (event.clientY - box.top) / box.height : 0;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

type Tool = "pin" | "stroke";

/**
 * Draw-on-frame feedback: a transparent SVG over the player box with a pin and
 * a freehand tool, undo and clear. Shapes stay in the caller so switching tools
 * never loses the mark or the comment draft beside it.
 */
export function FrameAnnotationEditor({
  shapes,
  onChange,
  label,
  disabled = false,
  children,
}: {
  shapes: readonly AnnotationShape[];
  onChange: (next: AnnotationShape[]) => void;
  label: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [tool, setTool] = useState<Tool | null>(null);
  const drawing = useRef<number | null>(null);
  const active = !disabled && tool !== null;

  function toggle(next: Tool) {
    setTool((current) => (current === next ? null : next));
  }

  function undo() {
    onChange(shapes.slice(0, -1));
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (!active || !tool) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = event.pointerId;
    const point = readPoint(event);
    if (tool === "pin") {
      onChange([...shapes, { type: "pin", x: point.x, y: point.y }]);
      drawing.current = null;
      return;
    }
    onChange([...shapes, { type: "stroke", points: [point, point] }]);
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (drawing.current !== event.pointerId || tool !== "stroke") return;
    const last = shapes.at(-1);
    if (!last || last.type !== "stroke") return;
    const point = readPoint(event);
    const previous = last.points.at(-1);
    if (
      previous &&
      Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) < 0.002
    )
      return;
    const points =
      last.points.length >= MAX_STROKE_POINTS
        ? last.points
        : [...last.points, point];
    onChange([...shapes.slice(0, -1), { type: "stroke", points }]);
  }

  function end(event: PointerEvent<SVGSVGElement>) {
    if (drawing.current !== event.pointerId) return;
    drawing.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section aria-label={label}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-well",
          children ? undefined : "aspect-video"
        )}
      >
        {children}
        <svg
          viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}
          preserveAspectRatio="none"
          className={cn(
            "absolute inset-0 size-full",
            active ? "cursor-crosshair touch-none" : "pointer-events-none"
          )}
          aria-hidden={shapes.length === 0 ? true : undefined}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <g className="text-background">
            <ShapeLayer shapes={shapes} pass="halo" />
          </g>
          <g className="text-accent-mark">
            <ShapeLayer shapes={shapes} pass="line" />
          </g>
        </svg>
      </div>
      {disabled ? null : (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={tool === "pin" ? "outline" : "ghost"}
            aria-pressed={tool === "pin"}
            onClick={() => toggle("pin")}
          >
            <MapPin aria-hidden="true" />
            Pin
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tool === "stroke" ? "outline" : "ghost"}
            aria-pressed={tool === "stroke"}
            onClick={() => toggle("stroke")}
          >
            <Pencil aria-hidden="true" />
            Draw
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!shapes.length}
            onClick={undo}
          >
            <RotateCcw aria-hidden="true" />
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!shapes.length}
            onClick={() => onChange([])}
          >
            <Trash2 aria-hidden="true" />
            Clear
          </Button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useRef, useState, type PointerEvent } from "react";
import ui from "./app-ui.module.css";
import styles from "./FrameNotes.module.css";

type Point = { x: number; y: number };
export type FrameMark =
  { kind: "pin"; point: Point } | { kind: "stroke"; points: Point[] };

/** Local frame marks follow the portal's Pin, Draw, Undo and Clear controls. */
export default function FrameNotes({
  marks,
  onChange,
  preview,
  disabled,
}: {
  marks: FrameMark[];
  onChange: (marks: FrameMark[]) => void;
  preview?: readonly FrameMark[];
  disabled: boolean;
}) {
  const [tool, setTool] = useState<"pin" | "draw" | null>(null);
  const drawing = useRef(false);
  const point = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(160, ((event.clientX - rect.left) / rect.width) * 160)
      ),
      y: Math.max(
        0,
        Math.min(90, ((event.clientY - rect.top) / rect.height) * 90)
      ),
    };
  };
  return (
    <>
      <svg
        className={styles.overlay}
        viewBox="0 0 160 90"
        aria-label="Frame notes"
        role="img"
        data-active={!disabled && tool !== null}
        onPointerDown={(event) => {
          if (disabled || !tool) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          const start = point(event);
          onChange([
            ...marks,
            tool === "pin"
              ? { kind: "pin", point: start }
              : { kind: "stroke", points: [start] },
          ]);
          drawing.current = tool === "draw";
        }}
        onPointerMove={(event) => {
          if (!drawing.current || disabled) return;
          const last = marks.at(-1);
          if (last?.kind !== "stroke" || last.points.length >= 200) return;
          onChange([
            ...marks.slice(0, -1),
            { kind: "stroke", points: [...last.points, point(event)] },
          ]);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      >
        {(preview ?? marks).map((mark, index) =>
          mark.kind === "pin" ? (
            <g key={index}>
              <circle
                cx={mark.point.x}
                cy={mark.point.y}
                r={2}
                fill="var(--foreground)"
              />
              <circle
                cx={mark.point.x}
                cy={mark.point.y}
                r={0.65}
                fill="var(--background)"
              />
            </g>
          ) : (
            <polyline
              key={index}
              points={mark.points
                .map((point) => point.x + "," + point.y)
                .join(" ")}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={0.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        )}
      </svg>
      <div
        className={styles.tools}
        role="group"
        aria-label="Frame annotation tools"
      >
        <button
          className={ui.textButton}
          type="button"
          aria-pressed={tool === "pin"}
          disabled={disabled}
          onClick={() => setTool((value) => (value === "pin" ? null : "pin"))}
        >
          Pin
        </button>
        <button
          className={ui.textButton}
          type="button"
          aria-pressed={tool === "draw"}
          disabled={disabled}
          onClick={() => setTool((value) => (value === "draw" ? null : "draw"))}
        >
          Draw
        </button>
        <button
          className={ui.textButton}
          type="button"
          disabled={disabled || marks.length === 0}
          onClick={() => onChange(marks.slice(0, -1))}
        >
          Undo
        </button>
        <button
          className={ui.textButton}
          type="button"
          disabled={
            disabled ||
            (marks.length === 0 && tool === null && !preview?.length)
          }
          onClick={() => {
            drawing.current = false;
            setTool(null);
            onChange([]);
          }}
        >
          Clear
        </button>
      </div>
    </>
  );
}

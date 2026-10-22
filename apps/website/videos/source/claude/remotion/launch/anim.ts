import { Easing, interpolate } from "remotion";

/** Entrance curve: fast arrival, long settle. */
export const easeOut = Easing.bezier(0.19, 1, 0.22, 1);
/** Camera curve: commit, travel, land clean. */
export const easeCam = Easing.bezier(0.76, 0, 0.24, 1);
/** Cursor and UI moves on screen. */
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** Exits accelerate away. */
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

/** Clamped keyframe interpolation. Easing applies to every segment. */
export const kf = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
  easing: (t: number) => number = easeInOut
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** 0 → 1 reveal that starts at `start` and lasts `duration` frames. */
export const reveal = (frame: number, start: number, duration = 18) =>
  kf(frame, [start, start + duration], [0, 1], easeOut);

/** Counts up to `value` between two frames. */
export const countUp = (
  frame: number,
  start: number,
  end: number,
  value: number
) => Math.round(kf(frame, [start, end], [0, value], easeOut));

/** Visible part of `text` when it is typed evenly between `start` and `end`. */
export const typed = (
  text: string,
  frame: number,
  start: number,
  end: number
) =>
  text.slice(
    0,
    Math.round(kf(frame, [start, end], [0, text.length], (t) => t))
  );

export const money = (value: number) => `$${value.toLocaleString("en-US")}`;

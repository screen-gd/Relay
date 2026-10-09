import { VIDEO } from "./theme";

/**
 * Beat grid for the soundtrack "Close Up" (Michael Ramir C., Mixkit).
 * Measured with `scripts/analyze-audio.mjs`: 104.999 BPM, first beat at 0.148695 s.
 * Every cut, landing and click in the film sits on this grid.
 */
export const BPM = 104.999;
export const BEAT = (60 / BPM) * VIDEO.fps;
export const BAR = BEAT * 4;

/** Third source bar, measured at 4.720167 s, rounded to the nearest video frame. */
export const MUSIC_TRIM = 142;

/** Frame of beat `n` from the start of a scene that begins on a bar line. */
export const beat = (n: number) => Math.round(n * BEAT);

/** Frame of bar `n`. */
export const bar = (n: number) => Math.round(n * BAR);

/** Every feature scene opens on a title card that leaves at this beat while the product shot rises in. */
export const TITLE_OUT = beat(3);
/** Beat at which the product shot has landed in its first readable framing. */
export const UI_START = TITLE_OUT + 12;
export const UI_IN = beat(4.5);

/** 24 complete bars. Source peaks 11, 15 and 23 match template, drop and payment. */
export const SCENE_BARS = {
  intro: 3,
  dashboard: 3,
  create: 5,
  board: 3,
  review: 5,
  money: 3,
  outro: 2,
} as const;

export type SceneId = keyof typeof SCENE_BARS;

const order = Object.keys(SCENE_BARS) as SceneId[];

/** First bar of each scene. */
export const sceneStartBar = (id: SceneId) =>
  order
    .slice(0, order.indexOf(id))
    .reduce((sum, key) => sum + SCENE_BARS[key], 0);

/** Scene length in frames, rounded against the global grid so cuts never drift. */
export const sceneFrames = (id: SceneId) =>
  bar(sceneStartBar(id) + SCENE_BARS[id]) - bar(sceneStartBar(id));

/** Round on the global grid, then subtract the scene start to avoid rounding drift. */
export const sceneBeat = (id: SceneId, n: number) =>
  beat(sceneStartBar(id) * 4 + n) - bar(sceneStartBar(id));

export const TOTAL_FRAMES = bar(
  order.reduce((sum, key) => sum + SCENE_BARS[key], 0)
);

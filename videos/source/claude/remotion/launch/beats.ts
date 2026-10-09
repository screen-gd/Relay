import { VIDEO } from "./theme";

/**
 * Beat grid for the soundtrack "Close Up" (Michael Ramir C., Mixkit).
 * Measured with `scripts/analyze-audio.mjs`: 105.5 BPM, first beat at 0.145 s.
 * Every cut, landing and click in the film sits on this grid.
 */
export const BPM = 105.5;
export const BEAT = (60 / BPM) * VIDEO.fps;
export const BAR = BEAT * 4;

/** Frames trimmed from the track so its 4th bar (6.97 s) lands on frame 0. */
export const MUSIC_TRIM = 209;

/** Frame of beat `n` from the start of a scene that begins on a bar line. */
export const beat = (n: number) => Math.round(n * BEAT);

/** Frame of bar `n`. */
export const bar = (n: number) => Math.round(n * BAR);

/** Every feature scene opens on a title card that leaves at this beat while the product shot rises in. */
export const TITLE_OUT = beat(3);
/** Beat at which the product shot has landed in its first readable framing. */
export const UI_IN = beat(4.5);

/** Scene lengths in bars. The track's lift (bar 7) hits the first product shot. */
export const SCENE_BARS = {
  intro: 4,
  dashboard: 3,
  create: 4,
  board: 3,
  review: 4,
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

export const TOTAL_FRAMES = bar(
  order.reduce((sum, key) => sum + SCENE_BARS[key], 0)
);

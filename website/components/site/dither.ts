import type { Rgb } from "@/components/dither-kit/palette";

/**
 * 8x8 ordered (Bayer) threshold matrix, normalized to 0–1. Built from the
 * standard recursion; 64 levels give a smoother fade than Dither Kit's 4x4.
 */
export const BAYER8: readonly (readonly number[])[] = (() => {
  let m = [[0]];
  for (let size = 1; size < 8; size *= 2) {
    m = Array.from({ length: size * 2 }, (_, y) =>
      Array.from({ length: size * 2 }, (_, x) => {
        const base = m[y % size][x % size] * 4;
        const quadrant = [0, 2, 3, 1][
          (y >= size ? 2 : 0) + (x >= size ? 1 : 0)
        ];
        return base + quadrant;
      })
    );
  }
  return m.map((row) => row.map((v) => (v + 0.5) / 64));
})();

export type DitherSpec = {
  /** Cell size in CSS px; rounded to whole device pixels when drawn. */
  cell: number;
  color: Rgb;
  /** Opacity of every lit cell. */
  alpha: number;
  /**
   * Share of cells lit (0–1) at a point. `u` and `v` run 0–1 across the box
   * (left to right, top to bottom).
   */
  density: (u: number, v: number) => number;
};

/**
 * Size `canvas` to `width` x `height` CSS px at device resolution and paint
 * an ordered dither into it. Cells are square blocks of a whole number of
 * device pixels, so the pattern stays even at any display scaling. One
 * paint, no animation loop.
 */
export function paintDither(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  spec: DitherSpec
): void {
  const dpr = window.devicePixelRatio || 1;
  const cell = Math.max(1, Math.round(spec.cell * dpr));

  canvas.width = Math.max(0, Math.round(width * dpr));
  canvas.height = Math.max(0, Math.round(height * dpr));
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return;

  const [r, g, b] = spec.color;
  ctx.fillStyle = `rgba(${r},${g},${b},${spec.alpha})`;
  const cols = Math.ceil(canvas.width / cell);
  const rows = Math.ceil(canvas.height / cell);

  for (let cy = 0; cy < rows; cy++) {
    const v = Math.min(1, ((cy + 0.5) * cell) / canvas.height);
    for (let cx = 0; cx < cols; cx++) {
      const u = Math.min(1, ((cx + 0.5) * cell) / canvas.width);
      if (spec.density(u, v) <= BAYER8[cy & 7][cx & 7]) continue;
      ctx.fillRect(cx * cell, cy * cell, cell, cell);
    }
  }
}

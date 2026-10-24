"use client";

import { useEffect, useRef } from "react";
import { xorshift32 } from "@/components/dither-kit/pixel";

/** Glyph cell size in CSS px. */
const CELL_W = 3.9;
const CELL_H = 7;
/** Redraw interval; a slow tick keeps the flicker cheap. */
const TICK_MS = 130;
/** Tallest flame, as a share of the canvas height. */
const MAX_FLAME = 0.8;
/** Sides narrower than this get no flames. */
const MIN_SIDE = 32;
const EMBER_COUNT = 4;

/** Glyph sets from dense (flame base) to sparse (flame tips and smoke). */
const HOT = "X#XX#%";
const BODY = "=+x+=X:";
const LOW = ".:-.:.-=+";
const SMOKE = ".:'";
const SPARK = "+*'";
const EMBER = ".'*°";

const Kind = { Empty: 0, Hot: 1, Body: 2, Smoke: 3, Spark: 4 } as const;
type Kind = (typeof Kind)[keyof typeof Kind];

type Tone = { body: string; hot: string; spark: string; alpha: number };

/** Relay lime per theme. Light mode needs deeper greens to show on white. */
const TONES: Record<"dark" | "light", Tone> = {
  dark: { body: "#9ccc00", hot: "#c6ff00", spark: "#e4ff80", alpha: 1 },
  light: { body: "#5c8a00", hot: "#3f6200", spark: "#7aa800", alpha: 1.2 },
};

type Ember = {
  active: boolean;
  col: number;
  y: number;
  startY: number;
  speed: number;
  glyph: string;
};

/**
 * One side's ASCII fire, after the flames on tripwire.sh. Column heights
 * come from seeded peaks that shrink toward the content rail, and each tick
 * re-picks glyphs by how far up the flame a cell sits. Column 0 is the
 * outer screen edge.
 */
class AsciiFire {
  private readonly ctx: CanvasRenderingContext2D;
  private cols = 0;
  private rows = 0;
  private width = 0;
  private height = 0;
  private kinds = new Uint8Array(0);
  private glyphs: string[] = [];
  private heights = new Float32Array(0);
  private jitter = new Float32Array(0);
  /** Flattened [column, amplitude, spread] triples. */
  private peaks: number[] = [];
  private embers: Ember[] = [];
  private emberWait = 1;
  private time = Math.random() * 10;
  private random = Math.random;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly side: "left" | "right",
    private readonly seed: number
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.textBaseline = "top";

    this.cols = Math.ceil(width / CELL_W);
    this.rows = Math.ceil(height / CELL_H);
    this.kinds = new Uint8Array(this.cols * this.rows);
    this.glyphs = new Array<string>(this.cols * this.rows).fill("");
    this.heights = new Float32Array(this.cols);

    const random = xorshift32(this.seed);
    this.jitter = Float32Array.from(
      { length: this.cols },
      () => 1 + 0.12 * (random() - 0.5)
    );
    this.peaks = [];
    for (let col = 1 + 3 * random(); col < this.cols; col += 7 + 6 * random()) {
      const reach = Math.pow(1 - col / this.cols, 0.8);
      this.peaks.push(col, reach * (0.6 + 0.4 * random()), 2.5 + 3 * random());
    }
    this.embers = Array.from({ length: EMBER_COUNT }, () => ({
      active: false,
      col: 0,
      y: 0,
      startY: 0,
      speed: 0,
      glyph: "",
    }));
  }

  /** Advances one tick and redraws. */
  step(tone: Tone, font: string) {
    this.time += 0.2;
    this.shape();
    this.fill();
    this.moveEmbers();
    this.draw(tone, font);
  }

  private shape() {
    const maxRows = (this.height * MAX_FLAME) / CELL_H;
    for (let col = 0; col < this.cols; col++) {
      let level = 0.03 + 0.02 * Math.sin(0.5 * col + this.time);
      for (let i = 0; i < this.peaks.length; i += 3) {
        const center = this.peaks[i];
        const d = (col - center) / this.peaks[i + 2];
        const flicker = 0.9 + 0.1 * Math.sin(2.1 * this.time + center);
        level = Math.max(level, this.peaks[i + 1] * flicker * Math.exp(-d * d));
      }
      this.heights[col] = level * this.jitter[col] * maxRows;
    }
  }

  /** Picks a glyph for every cell; row 0 is the bottom of the screen. */
  private fill() {
    const pick = (set: string) => set[Math.floor(this.random() * set.length)];
    const maxRows = (this.height * MAX_FLAME) / CELL_H;
    for (let col = 0; col < this.cols; col++) {
      const top = this.heights[col];
      for (let row = 0; row < this.rows; row++) {
        const i = (this.rows - 1 - row) * this.cols + col;
        this.kinds[i] = Kind.Empty;
        if (row < top) {
          const depth = row / Math.max(top, 1);
          if (depth < 0.14 && top > 0.08 * maxRows) {
            if (this.random() < 0.88) this.set(i, Kind.Hot, pick(HOT));
          } else if (depth < 0.32) {
            if (this.random() < 0.7) this.set(i, Kind.Body, pick(BODY));
          } else if (this.random() < 0.7 * (1 - depth) + 0.14) {
            this.set(i, Kind.Body, pick(LOW));
          }
        } else if (row < top + 0.12 * maxRows && this.random() < 0.035) {
          this.set(i, Kind.Smoke, pick(SMOKE));
        }
      }
    }
    for (let n = 0; n < 6; n++) {
      const row = Math.floor((0.15 + 0.45 * this.random()) * maxRows);
      const col = Math.floor(this.random() * this.cols);
      const i = (this.rows - 1 - row) * this.cols + col;
      if (this.kinds[i] === Kind.Body) this.set(i, Kind.Spark, pick(SPARK));
    }
  }

  private set(i: number, kind: Kind, glyph: string) {
    this.kinds[i] = kind;
    this.glyphs[i] = glyph;
  }

  /** Embers leave the tallest column and drift up until they fade. */
  private moveEmbers() {
    this.emberWait -= 0.13;
    const ceiling = this.height * 0.04;
    for (const ember of this.embers) {
      if (ember.active) {
        ember.y -= ember.speed;
        if (this.random() < 0.12) ember.col += this.random() < 0.5 ? -1 : 1;
        ember.col = Math.min(this.cols - 1, Math.max(0, ember.col));
        if (ember.y < ceiling) ember.active = false;
        continue;
      }
      if (this.emberWait > 0) continue;
      let tallest = 0;
      for (let col = 1; col < this.cols; col++) {
        if (this.heights[col] > this.heights[tallest]) tallest = col;
      }
      ember.active = true;
      ember.col = tallest;
      ember.y = ember.startY = this.height - this.heights[tallest] * CELL_H;
      ember.speed = 3 + 2 * this.random();
      ember.glyph = EMBER[Math.floor(this.random() * EMBER.length)];
      this.emberWait = 1 + 1.5 * this.random();
    }
  }

  private x(col: number) {
    return this.side === "left"
      ? col * CELL_W
      : this.width - (col + 1) * CELL_W;
  }

  private draw(tone: Tone, font: string) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.font = `500 6.5px ${font}`;
    const flameTop = this.rows - (this.height * MAX_FLAME) / CELL_H;
    const passes: [Kind, string, number][] = [
      [Kind.Smoke, tone.body, 0.18],
      [Kind.Body, tone.body, 0],
      [Kind.Hot, tone.hot, 0.6],
      [Kind.Spark, tone.spark, 0.7],
    ];
    for (const [kind, color, alpha] of passes) {
      ctx.fillStyle = color;
      for (let row = 0; row < this.rows; row++) {
        // Body glyphs brighten toward the bottom, from 0.2 to 0.5.
        const band = Math.min(
          1,
          Math.max(0, (row - flameTop) / (this.rows - flameTop))
        );
        ctx.globalAlpha = tone.alpha * (alpha || 0.2 + 0.3 * band);
        for (let col = 0; col < this.cols; col++) {
          const i = row * this.cols + col;
          if (this.kinds[i] !== kind) continue;
          ctx.fillText(this.glyphs[i], this.x(col), row * CELL_H);
        }
      }
    }

    ctx.fillStyle = tone.spark;
    ctx.font = `600 9px ${font}`;
    const ceiling = this.height * 0.04;
    for (const ember of this.embers) {
      if (!ember.active) continue;
      const t = (ember.startY - ember.y) / Math.max(1, ember.startY - ceiling);
      ctx.globalAlpha = tone.alpha * (1 - t * t);
      ctx.fillText(ember.glyph, this.x(ember.col), ember.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

/** Reads the content frame width from the `--frame` CSS token. */
function frameWidth(): number {
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--frame")
  );
  return Number.isFinite(value) ? value : 1200;
}

/**
 * ASCII flames on either side of a page's title area. By default they stand
 * on the top edge of the positioned parent and scroll with it (the chapter
 * index line on /features). With `pinned`, they stand on the bottom edge of
 * the screen instead and stay there while the page scrolls (home).
 * Redraws on a 130 ms tick while on screen; reduced-motion users get one
 * still frame, and narrow screens get none. Styled by `.hero-flames`.
 */
export default function HeroFlames({ pinned = false }: { pinned?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!wrap || !left || !right) return;

    const fires = [
      new AsciiFire(left, "left", 1543),
      new AsciiFire(right, "right", 7919),
    ];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let frame = 0;
    let sized = "";
    let hasSides = false;
    let onScreen = false;
    let tone = TONES.dark;
    let font = "monospace";

    const tick = () => fires.forEach((fire) => fire.step(tone, font));

    const sync = () => {
      window.clearInterval(timer);
      timer = 0;
      if (hasSides && onScreen && !reducedMotion.matches && !document.hidden) {
        timer = window.setInterval(tick, TICK_MS);
      }
    };

    const layout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = document.documentElement.clientWidth;
        const height = left.clientHeight;
        tone =
          TONES[
            document.documentElement.classList.contains("dark")
              ? "dark"
              : "light"
          ];
        font = getComputedStyle(left).fontFamily || "monospace";
        const raw = Math.floor((width - frameWidth()) / 2);
        const side = raw < MIN_SIDE ? 0 : raw;
        hasSides = side > 0;
        const key = `${side}x${height}@${window.devicePixelRatio}`;
        if (key !== sized) {
          sized = key;
          fires.forEach((fire) => fire.resize(side, height));
        }
        if (hasSides) tick();
        else fires.forEach((fire) => fire.clear());
        sync();
      });
    };

    document.fonts
      .load(`500 6.5px ${getComputedStyle(left).fontFamily}`)
      .then(layout, layout);
    reducedMotion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visible.observe(left);
    const resize = new ResizeObserver(layout);
    resize.observe(wrap);
    // Display scaling changes (zoom, moving screens) don't always resize.
    window.addEventListener("resize", layout);
    const theme = new MutationObserver(layout);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      visible.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", layout);
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      theme.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={pinned ? "hero-flames is-pinned" : "hero-flames"}
      aria-hidden="true"
    >
      <canvas ref={leftRef} className="is-left" />
      <canvas ref={rightRef} className="is-right" />
    </div>
  );
}

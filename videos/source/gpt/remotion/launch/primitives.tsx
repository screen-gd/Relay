import { Audio } from "@remotion/media";
import { useId, type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { easeCam, easeIn, easeInOut, easeOut, kf } from "./anim";
import { colors, fonts, VIDEO, WINDOW } from "./theme";

/** Relay's circular mark, copied from `public/brand/relay/mark-black.svg`. */
export const RelayMark: React.FC<{ size: number; color?: string }> = ({
  size,
  color = colors.ink,
}) => {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100"
          height="100"
        >
          <rect width="100" height="100" fill="white" />
          <path
            d="M-8 33h46c9 0 13 6 20 12l6 5h44"
            fill="none"
            stroke="black"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M-8 67h46c9 0 13-6 20-12l6-5h44"
            fill="none"
            stroke="black"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="46" fill={color} mask={`url(#${id})`} />
    </svg>
  );
};

/** Geist wordmark set next to the mark at lockup proportions. */
export const Wordmark: React.FC<{ height: number; color?: string }> = ({
  height,
  color = colors.ink,
}) => (
  <span
    style={{
      fontFamily: fonts.sans,
      fontWeight: 600,
      fontSize: height * 0.82,
      letterSpacing: "-0.04em",
      color,
      lineHeight: 1,
    }}
  >
    Relay
  </span>
);

/**
 * Neutral studio backdrop: a soft warm-grey gradient, a white key light and fine film grain.
 * `light` moves the key light (percent of the frame).
 */
export const Backdrop: React.FC<{ light?: readonly [number, number] }> = ({
  light = [50, 32],
}) => {
  const seed = 11;
  const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
  )}")`;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.backdropTop}, ${colors.backdropBottom})`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(1500px 1000px at ${light[0]}% ${light[1]}%, rgba(255,255,255,0.95), rgba(255,255,255,0) 68%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: grain,
          opacity: 0.05,
          mixBlendMode: "multiply",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Kinetic headline. Lines rise out of a mask one after another, then leave
 * upward with a quicker, subtler exit at `out`.
 */
export const Headline: React.FC<{
  lines: readonly string[];
  start?: number;
  out?: number;
  size?: number;
  top: number;
  muted?: readonly number[];
}> = ({ lines, start = 0, out, size = 108, top, muted = [] }) => {
  const frame = useCurrentFrame();
  const leave =
    out === undefined ? 0 : kf(frame, [out, out + 10], [0, 1], easeIn);
  if (leave >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: "-0.05em",
        textAlign: "center",
        color: colors.ink,
        opacity: 1 - leave,
        translate: `0 ${-leave * 28}px`,
      }}
    >
      {lines.map((line, index) => {
        const progress = kf(
          frame,
          [start + index * 4, start + index * 4 + 22],
          [0, 1],
          easeOut
        );
        return (
          <div
            key={line}
            style={{
              overflow: "hidden",
              paddingBottom: size * 0.2,
              marginBottom: -size * 0.16,
            }}
          >
            <div
              style={{
                translate: `0 ${(1 - progress) * 105}%`,
                color: muted.includes(index) ? colors.zinc : colors.ink,
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Places the 1600x960 app window in the frame and moves a virtual camera.
 * (fx, fy) is the window point kept at the frame centre plus (ox, oy).
 */
export const Camera: React.FC<{
  children: ReactNode;
  fx: number;
  fy: number;
  scale: number;
  rx?: number;
  ry?: number;
  ox?: number;
  oy?: number;
}> = ({ children, fx, fy, scale, rx = 0, ry = 0, ox = 0, oy = 0 }) => (
  <AbsoluteFill style={{ perspective: 2800, perspectiveOrigin: "50% 50%" }}>
    <div
      style={{
        position: "absolute",
        left: (VIDEO.width - WINDOW.width) / 2,
        top: (VIDEO.height - WINDOW.height) / 2,
        width: WINDOW.width,
        height: WINDOW.height,
        transformOrigin: "50% 50%",
        transform: [
          `translate(${ox}px, ${oy}px)`,
          `rotateX(${rx}deg)`,
          `rotateY(${ry}deg)`,
          `scale(${scale})`,
          `translate(${WINDOW.width / 2 - fx}px, ${WINDOW.height / 2 - fy}px)`,
        ].join(" "),
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

export type Shot = {
  f: number;
  fx: number;
  fy: number;
  scale: number;
  rx?: number;
  ry?: number;
  ox?: number;
  oy?: number;
};

/** Interpolates camera props across shots with the camera ease. */
export const useShots = (
  shots: readonly Shot[],
  ease: (t: number) => number
) => {
  const frame = useCurrentFrame();
  const frames = shots.map((shot) => shot.f);
  const pick = (key: keyof Omit<Shot, "f">) =>
    kf(
      frame,
      frames,
      shots.map((shot) => shot[key] ?? 0),
      frame <= shots[1].f ? easeOut : ease
    );
  return {
    fx: pick("fx"),
    fy: pick("fy"),
    scale: pick("scale"),
    rx: pick("rx"),
    ry: pick("ry"),
    ox: pick("ox"),
    oy: pick("oy"),
  };
};

/**
 * The product shot's arrival: it starts below the frame and
 * rises into `framing` between `from` and `to`.
 */
export const entrance = (
  framing: Omit<Shot, "f">,
  from: number,
  to: number
): Shot[] => [
  { ...framing, f: from, oy: (framing.oy ?? 0) + 1400 },
  { ...framing, f: to },
];

export type CursorStop = { f: number; x: number; y: number };

/** Pointer in window coordinates. Glides between stops and presses on each frame in `clicks`. */
export const Cursor: React.FC<{
  path: readonly CursorStop[];
  clicks?: readonly number[];
  grab?: readonly [number, number];
}> = ({ path, clicks = [], grab }) => {
  const frame = useCurrentFrame();
  const frames = path.map((stop) => stop.f);
  const at = (f: number) => ({
    x: kf(
      f,
      frames,
      path.map((stop) => stop.x),
      easeInOut
    ),
    y: kf(
      f,
      frames,
      path.map((stop) => stop.y),
      easeInOut
    ),
  });
  const { x, y } = at(frame);
  const opacity = kf(frame, [path[0].f, path[0].f + 8], [0, 1]);
  const press = clicks.reduce((acc, click) => {
    const d = frame - click;
    if (d < -3 || d > 6) return acc;
    return Math.max(acc, d < 0 ? (3 + d) / 3 : 1 - d / 6);
  }, 0);
  const held = grab !== undefined && frame >= grab[0] && frame <= grab[1];
  const scale = held ? 0.88 : 1 - press * 0.14;

  return (
    <>
      {clicks.map((click) => {
        const d = frame - click;
        if (d < 0 || d > 18) return null;
        const t = kf(d, [0, 18], [0, 1], easeOut);
        const origin = at(click);
        return (
          <div
            key={click}
            style={{
              position: "absolute",
              left: origin.x - 22 - t * 16,
              top: origin.y - 22 - t * 16,
              width: 44 + t * 32,
              height: 44 + t * 32,
              borderRadius: "50%",
              backgroundColor: "rgba(9,9,11,0.08)",
              border: "1.5px solid rgba(9,9,11,0.35)",
              opacity: 1 - t,
              zIndex: 49,
            }}
          />
        );
      })}
      <div
        style={{ position: "absolute", left: x, top: y, opacity, zIndex: 50 }}
      >
        <svg
          width="34"
          height="40"
          viewBox="0 0 34 40"
          style={{
            position: "absolute",
            left: -4,
            top: -3,
            scale: String(scale),
            transformOrigin: "4px 3px",
          }}
        >
          <path
            d="M4 3 L4 31 L11.5 24.5 L16.5 36 L21.5 33.8 L16.6 22.6 L26.5 22.6 Z"
            fill={colors.ink}
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))" }}
          />
        </svg>
      </div>
    </>
  );
};

export type FocusRect = { x: number; y: number; w: number; h: number };
export type FocusStop = FocusRect & { f: number; amount: number };

/**
 * Focus light in window coordinates. Everything outside the rectangle dims,
 * the rectangle itself stays at full brightness.
 */
export const Spotlight: React.FC<
  FocusRect & { amount: number; radius?: number }
> = ({ x, y, w, h, amount, radius = 16 }) =>
  amount <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: x - 12,
        top: y - 12,
        width: w + 24,
        height: h + 24,
        borderRadius: radius,
        boxShadow: `0 0 0 4000px rgba(24,24,27,${0.4 * amount})`,
        zIndex: 40,
      }}
    />
  );

/**
 * A spotlight that travels between areas. Each stop sets the lit rectangle
 * and how strongly the rest dims; moves between stops use the camera ease.
 */
export const FocusTrack: React.FC<{ stops: readonly FocusStop[] }> = ({
  stops,
}) => {
  const frame = useCurrentFrame();
  const frames = stops.map((stop) => stop.f);
  const pick = (key: keyof FocusStop) =>
    kf(
      frame,
      frames,
      stops.map((stop) => stop[key]),
      easeCam
    );
  return (
    <Spotlight
      x={pick("x")}
      y={pick("y")}
      w={pick("w")}
      h={pick("h")}
      amount={pick("amount")}
    />
  );
};

/** Text caret for typing animations. */
export const Caret: React.FC<{ height?: number }> = ({ height = 22 }) => {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height,
        marginLeft: 2,
        backgroundColor: colors.ink,
        verticalAlign: "middle",
        opacity: 1,
      }}
    />
  );
};

const sounds = {
  click: { src: "audio/sfx/mouse-click.wav", volume: 0.2 },
  whoosh: { src: "audio/sfx/whoosh.wav", volume: 0.12 },
  switch: { src: "audio/sfx/switch.wav", volume: 0.16 },
} as const;

/** One-shot sound effect at frame `at` of the current sequence. */
export const Sfx: React.FC<{ at: number; kind: keyof typeof sounds }> = ({
  at,
  kind,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Audio
      src={staticFile(sounds[kind].src)}
      from={at}
      volume={sounds[kind].volume}
      premountFor={fps}
    />
  );
};

/** Small square chip used for timecodes and counts. Never a pill. */
export const Chip: React.FC<{
  children: ReactNode;
  tone?: string;
  style?: CSSProperties;
}> = ({ children, tone = colors.canvas, style }) => (
  <span
    style={{
      fontFamily: fonts.mono,
      fontSize: 12,
      padding: "2px 6px",
      borderRadius: 4,
      backgroundColor: tone,
      color: colors.ink,
      ...style,
    }}
  >
    {children}
  </span>
);

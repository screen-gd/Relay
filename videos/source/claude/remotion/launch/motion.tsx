import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import {
  countUp,
  easeCam,
  easeIn,
  easeInOut,
  easeOut,
  kf,
  money,
} from "./anim";
import { Headline } from "./primitives";
import { colors, fonts, stages } from "./theme";

/**
 * Section opener: a headline over a small motion graphic that explains the
 * feature in shapes. Both leave upward at `out`, as the product shot rises in.
 */
export const TitleCard: React.FC<{
  line: string;
  graphic: ReactNode;
  out: number;
}> = ({ line, graphic, out }) => {
  const frame = useCurrentFrame();
  const leave = kf(frame, [out, out + 12], [0, 1], easeIn);
  if (leave >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - leave,
        translate: `0 ${-leave * 80}px`,
      }}
    >
      <Headline lines={[line]} start={2} size={104} top={300} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 520,
          height: 280,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: fonts.sans,
          color: colors.ink,
        }}
      >
        {graphic}
      </div>
    </div>
  );
};

/** Deterministic 0 → 1 noise so scattered layouts render the same every time. */
const noise = (i: number, k: number) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const Bar: React.FC<{ w: number; tone?: string }> = ({
  w,
  tone = colors.strong,
}) => (
  <span
    style={{
      display: "block",
      width: w,
      height: 9,
      borderRadius: 5,
      backgroundColor: tone,
    }}
  />
);

/** Dashboard: scattered project tiles fly in and lock into one tidy grid. */
export const GridAssemble: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const TILE = { w: 168, h: 62, gap: 16 };
  return (
    <div
      style={{
        position: "relative",
        width: TILE.w * 4 + TILE.gap * 3,
        height: TILE.h * 3 + TILE.gap * 2,
      }}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const p = kf(
          frame,
          [start + i * 2, start + i * 2 + 28],
          [0, 1],
          easeOut
        );
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left:
                col * (TILE.w + TILE.gap) +
                (noise(i, 1) - 0.5) * 1000 * (1 - p),
              top:
                row * (TILE.h + TILE.gap) + (noise(i, 2) - 0.5) * 420 * (1 - p),
              width: TILE.w,
              height: TILE.h,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 16px",
              borderRadius: 12,
              backgroundColor: colors.panel,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 18px 36px -22px rgba(24,24,27,0.35)",
              rotate: `${(noise(i, 3) - 0.5) * 36 * (1 - p)}deg`,
              opacity: Math.min(1, p * 2),
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: stages[i % stages.length].color,
                flexShrink: 0,
              }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <Bar w={84} tone="#a1a1aa" />
              <Bar w={52} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** New project: a template stamps out the six workflow stages along a drawn line. */
export const TemplateStamp: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const line = kf(frame, [start, start + 26], [0, 1], easeCam);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 30,
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 2,
          backgroundColor: colors.strong,
          transformOrigin: "left center",
          scale: `${line} 1`,
        }}
      />
      {stages.map((stage, index) => {
        const p = kf(
          frame,
          [start + 4 + index * 4, start + 4 + index * 4 + 16],
          [0, 1],
          easeOut
        );
        return (
          <div
            key={stage.name}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 22px",
              borderRadius: 12,
              backgroundColor: colors.panel,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 18px 36px -22px rgba(24,24,27,0.35)",
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              opacity: p,
              scale: String(0.86 + p * 0.14),
              translate: `0 ${(1 - p) * 18}px`,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 3,
                backgroundColor: stage.color,
              }}
            />
            {stage.name}
          </div>
        );
      })}
    </div>
  );
};

/** Board: a project card hops from stage to stage along the workflow track. */
export const StageTrack: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const STEP = 200;
  const reach = kf(frame, [start, start + 18], [0, 1], easeOut);
  const t = kf(
    frame,
    [start + 10, start + 24, start + 30, start + 44],
    [0, 1, 1, 2],
    easeInOut
  );
  const hop = Math.sin((t % 1) * Math.PI) * 34;
  return (
    <div style={{ position: "relative", width: STEP * 5, height: 220 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 130,
          width: STEP * 5 * reach,
          height: 3,
          backgroundColor: colors.strong,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 130,
          width: STEP * t,
          height: 3,
          backgroundColor: colors.ink,
        }}
      />
      {stages.map((stage, index) => {
        const reached = t >= index - 0.05;
        return (
          <div
            key={stage.name}
            style={{
              position: "absolute",
              left: index * STEP - 80,
              top: 118,
              width: 160,
              textAlign: "center",
              opacity: kf(reach, [index / 6, index / 6 + 0.2], [0, 1]),
            }}
          >
            <span
              style={{
                display: "block",
                margin: "0 auto",
                width: 26,
                height: 26,
                boxSizing: "border-box",
                borderRadius: "50%",
                backgroundColor: reached ? stage.color : colors.panel,
                border: `3px solid ${reached ? stage.color : colors.strong}`,
              }}
            />
            <span
              style={{
                display: "block",
                marginTop: 16,
                fontSize: 22,
                fontWeight: 600,
                color: reached ? colors.ink : colors.zinc,
              }}
            >
              {stage.name}
            </span>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: t * STEP - 130,
          top: 30 - hop,
          width: 260,
          height: 64,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          borderRadius: 12,
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 ${18 + hop / 2}px ${36 + hop}px -18px rgba(24,24,27,0.4)`,
          rotate: `${Math.sin((t % 1) * Math.PI) * 4}deg`,
          opacity: kf(frame, [start + 4, start + 12], [0, 1]),
          fontSize: 21,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: 3,
            backgroundColor: stages[Math.round(t)].color,
          }}
        />
        Summer launch film
      </div>
    </div>
  );
};

/** Client review: a playhead sweeps a timeline and comments pin to the moments it passes. */
export const TimelineMarkers: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const W = 1040;
  const playhead = kf(frame, [start, start + 48], [0, 0.95], easeInOut);
  const notes = [
    { at: 0.16, time: "00:04", text: "Hold this shot longer" },
    { at: 0.5, time: "00:12", text: "Love the pace here" },
    { at: 0.84, time: "00:20", text: "Brighten the midtones" },
  ] as const;
  return (
    <div style={{ position: "relative", width: W, height: 230 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 170,
          width: W,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.border,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 170,
          width: W * playhead,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.ink,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W * playhead - 3,
          top: 150,
          width: 6,
          height: 52,
          borderRadius: 3,
          backgroundColor: colors.ink,
        }}
      />
      {notes.map((note) => {
        const hit = (note.at / 0.95) * 48 + start;
        const p = kf(frame, [hit, hit + 14], [0, 1], easeOut);
        return (
          <div key={note.time}>
            <div
              style={{
                position: "absolute",
                left: W * note.at - 11,
                top: 165,
                width: 22,
                height: 22,
                boxSizing: "border-box",
                borderRadius: 5,
                backgroundColor: colors.lime,
                border: `2px solid ${colors.ink}`,
                scale: String(p),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: W * note.at - 150,
                top: 40,
                width: 300,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                borderRadius: 12,
                backgroundColor: colors.panel,
                border: `1px solid ${colors.border}`,
                boxShadow: "0 18px 36px -22px rgba(24,24,27,0.35)",
                fontSize: 19,
                fontWeight: 500,
                opacity: p,
                translate: `0 ${(1 - p) * 22}px`,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 15,
                  padding: "2px 7px",
                  borderRadius: 5,
                  backgroundColor: colors.lime,
                }}
              >
                {note.time}
              </span>
              {note.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Money: earned splits into what's collected and what's still owed. */
export const MoneySplit: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const W = 1040;
  const collectedShare = 11450 / 14200;
  const grow = kf(frame, [start + 6, start + 32], [0, 1], easeCam);
  const owed = kf(frame, [start + 26, start + 42], [0, 1], easeCam);
  const labels = kf(frame, [start + 30, start + 44], [0, 1], easeOut);
  return (
    <div style={{ position: "relative", width: W, height: 230 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, color: colors.muted }}>
          Earned
        </span>
        <span
          style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.04em" }}
        >
          {money(countUp(frame, start, start + 36, 14200))}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 96,
          width: W,
          height: 26,
          borderRadius: 8,
          backgroundColor: colors.border,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: W * collectedShare * grow,
            backgroundColor: colors.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: W * collectedShare + 4,
            top: 0,
            bottom: 0,
            width: (W * (1 - collectedShare) - 4) * owed,
            backgroundColor: colors.warning,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 146,
          opacity: labels,
          translate: `0 ${(1 - labels) * 12}px`,
        }}
      >
        <div style={{ fontSize: 22, color: colors.muted, fontWeight: 600 }}>
          Collected
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            marginTop: 4,
          }}
        >
          $11,450
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 146,
          textAlign: "right",
          opacity: labels,
          translate: `0 ${(1 - labels) * 12}px`,
        }}
      >
        <div style={{ fontSize: 22, color: colors.warning, fontWeight: 600 }}>
          Outstanding
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            marginTop: 4,
          }}
        >
          $2,750
        </div>
      </div>
    </div>
  );
};

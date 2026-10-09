import { ArrowRight } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam, easeOut, kf, reveal } from "../anim";
import { beat } from "../beats";
import {
  Backdrop,
  Cursor,
  Headline,
  RelayMark,
  Sfx,
  Wordmark,
} from "../primitives";
import { colors, fonts } from "../theme";

const CLICK = beat(5);
const MARK = 104;
const LOCKUP_W = 340;
// CTA button centre in frame coordinates.
const BUTTON = { x: 960, y: 720 } as const;

/** Closing card: lockup, promise, a "Get started free" click, and where to find it. */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const markIn = reveal(frame, 0, 20);
  const slide = kf(frame, [beat(0.5), beat(1.5)], [0, 1], easeCam);
  const markX = 960 - (LOCKUP_W / 2 - MARK / 2) * slide;
  const button = reveal(frame, beat(2.5), 22);
  const pressed = frame >= CLICK - 2 && frame <= CLICK + 5;
  const footer = reveal(frame, beat(3), 16);

  return (
    <AbsoluteFill style={{ fontFamily: fonts.sans, color: colors.ink }}>
      <Backdrop light={[50, 45]} />
      <div
        style={{
          position: "absolute",
          left: markX - MARK / 2,
          top: 250,
          opacity: markIn,
          scale: String(0.86 + markIn * 0.14),
        }}
      >
        <RelayMark size={MARK} />
      </div>
      <div
        style={{
          position: "absolute",
          left: markX + MARK / 2 + 24,
          top: 250,
          height: MARK,
          display: "flex",
          alignItems: "center",
          clipPath: `inset(0 ${(1 - slide) * 100}% 0 0)`,
        }}
      >
        <Wordmark height={MARK} />
      </div>
      <Headline
        lines={["Manage editing projects."]}
        start={beat(1)}
        size={116}
        top={420}
      />
      <div
        style={{
          position: "absolute",
          left: BUTTON.x - 200,
          top: BUTTON.y - 42,
          width: 400,
          height: 84,
          borderRadius: 6,
          backgroundColor: colors.ink,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          boxShadow: "0 30px 60px -30px rgba(24,24,27,0.5)",
          opacity: button,
          translate: `0 ${(1 - kf(frame, [beat(2.5), beat(2.5) + 22], [0, 1], easeOut)) * 24}px`,
          scale: pressed ? "0.96" : "1",
        }}
      >
        Get started free <ArrowRight size={32} strokeWidth={2.4} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 830,
          textAlign: "center",
          opacity: footer,
        }}
      >
        <div style={{ fontFamily: fonts.mono, fontSize: 38, fontWeight: 500 }}>
          workrelay.dev
        </div>
        <div style={{ fontSize: 28, marginTop: 14, color: colors.text2 }}>
          Free plan. 7-day Creator trial, no card needed.
        </div>
      </div>
      <Cursor
        path={[
          { f: beat(3), x: 1360, y: 1000 },
          { f: beat(4.25), x: BUTTON.x + 70, y: BUTTON.y + 8 },
          { f: beat(8), x: BUTTON.x + 76, y: BUTTON.y + 14 },
        ]}
        clicks={[CLICK]}
      />
      <Sfx at={0} kind="whoosh" />
      <Sfx at={CLICK} kind="click" />
    </AbsoluteFill>
  );
};

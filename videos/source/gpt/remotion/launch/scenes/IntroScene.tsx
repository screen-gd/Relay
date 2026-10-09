import {
  CalendarClock,
  FolderOpen,
  Mail,
  MessageSquare,
  MessagesSquare,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam, easeOut, kf, reveal } from "../anim";
import { beat } from "../beats";
import { Backdrop, Headline, RelayMark, Sfx, Wordmark } from "../primitives";
import { colors, fonts } from "../theme";

// The scattered pieces of an editor's week, before Relay pulls them together.
const fragments: readonly {
  icon: LucideIcon;
  title: string;
  note: string;
  x: number;
  y: number;
  tilt: number;
}[] = [
  {
    icon: Mail,
    title: "Re: final_v3_FINAL.mp4",
    note: "Client email",
    x: -540,
    y: -250,
    tilt: -3,
  },
  {
    icon: CalendarClock,
    title: "Due May 5, 5:00 PM",
    note: "Calendar",
    x: 500,
    y: -270,
    tilt: 2.5,
  },
  {
    icon: MessageSquare,
    title: "00:04 Hold this shot longer",
    note: "Review note",
    x: -600,
    y: 50,
    tilt: 2,
  },
  {
    icon: Receipt,
    title: "Invoice 014 · $1,500 unpaid",
    note: "Spreadsheet",
    x: 590,
    y: 40,
    tilt: -2,
  },
  {
    icon: FolderOpen,
    title: "Raw footage / Day 2",
    note: "Drive folder",
    x: -400,
    y: 300,
    tilt: -1.5,
  },
  {
    icon: MessagesSquare,
    title: "Any update on the cut?",
    note: "Chat",
    x: 400,
    y: 300,
    tilt: 3,
  },
];

const MARK = 150;
const LOCKUP_W = 486;

/** Two lines of setup, the scattered tools of the job, then everything collapses into the Relay lockup. */
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const converge = kf(frame, [beat(9), beat(10)], [0, 1], easeCam);
  const markIn = reveal(frame, beat(9.5), 20);
  const slide = kf(frame, [beat(10), beat(10.75)], [0, 1], easeCam);
  const markX = 960 - (LOCKUP_W / 2 - MARK / 2) * slide;

  return (
    <AbsoluteFill style={{ fontFamily: fonts.sans, color: colors.ink }}>
      <Backdrop />
      <Headline
        lines={["You make the edit."]}
        start={0}
        out={beat(5.5)}
        size={128}
        top={350}
      />
      <Headline
        lines={["Relay runs everything around it."]}
        start={beat(2)}
        out={beat(5.5)}
        size={104}
        top={525}
      />

      {frame >= beat(6) &&
        converge < 1 &&
        fragments.map((fragment, index) => {
          const appear = reveal(frame, beat(6 + index * 0.2), 20);
          const drift = kf(frame, [beat(6), beat(9)], [0, 1], (t) => t);
          const Icon = fragment.icon;
          return (
            <div
              key={fragment.title}
              style={{
                position: "absolute",
                left:
                  960 + fragment.x * (1 + drift * 0.04) * (1 - converge) - 190,
                top:
                  540 + fragment.y * (1 + drift * 0.04) * (1 - converge) - 44,
                width: 380,
                height: 88,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 20px",
                boxSizing: "border-box",
                borderRadius: 16,
                backgroundColor: colors.panel,
                border: `1px solid ${colors.border}`,
                boxShadow: "0 30px 60px -30px rgba(24,24,27,0.3)",
                opacity: appear * (1 - kf(converge, [0.6, 1], [0, 1])),
                scale: String((0.92 + appear * 0.08) * (1 - converge * 0.75)),
                rotate: `${fragment.tilt * (1 - converge)}deg`,
                translate: `0 ${(1 - appear) * 24}px`,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: colors.canvas,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={22} />
              </span>
              <span>
                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fragment.title}
                </div>
                <div
                  style={{ fontSize: 16, color: colors.muted, marginTop: 2 }}
                >
                  {fragment.note}
                </div>
              </span>
            </div>
          );
        })}

      {frame >= beat(9.5) && (
        <>
          <div
            style={{
              position: "absolute",
              left: markX - MARK / 2,
              top: 470 - MARK / 2,
              opacity: markIn,
              scale: String(0.86 + markIn * 0.14),
            }}
          >
            <RelayMark size={MARK} />
          </div>
          <div
            style={{
              position: "absolute",
              left: markX + MARK / 2 + 34,
              top: 470 - MARK / 2,
              height: MARK,
              display: "flex",
              alignItems: "center",
              clipPath: `inset(0 ${(1 - slide) * 100}% 0 0)`,
            }}
          >
            <Wordmark height={MARK} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 600,
              textAlign: "center",
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: colors.text2,
              opacity: reveal(frame, beat(10.5), 20),
              translate: `0 ${(1 - kf(frame, [beat(10.5), beat(10.5) + 20], [0, 1], easeOut)) * 14}px`,
            }}
          >
            The workspace for video editors.
          </div>
        </>
      )}
      <Sfx at={beat(9)} kind="whoosh" />
    </AbsoluteFill>
  );
};

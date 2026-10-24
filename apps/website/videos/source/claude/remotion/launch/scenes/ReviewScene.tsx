import {
  Check,
  Clock,
  KeyRound,
  Maximize2,
  Pause,
  Play,
  Send,
  Volume2,
} from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam, easeOut, kf, reveal, typed } from "../anim";
import { AppWindow, Avatar, StageBadge } from "../app-ui";
import { beat, TITLE_OUT, UI_IN } from "../beats";
import { reviewComments } from "../data";
import { TimelineMarkers, TitleCard } from "../motion";
import {
  Backdrop,
  Camera,
  Caret,
  Cursor,
  entrance,
  FocusTrack,
  RelayMark,
  Sfx,
  useShots,
} from "../primitives";
import { colors, fonts, WINDOW } from "../theme";

// Portal geometry in window coordinates.
const TOP = WINDOW.chrome;
const PLAYER = { x: 40, y: TOP + 150, w: 1000, h: 562 };
const SIDE = { x: 1072, y: TOP + 92, w: 496, h: 792 };
const COMPOSER = {
  x: SIDE.x + 20,
  y: SIDE.y + SIDE.h - 132,
  w: SIDE.w - 40,
  h: 112,
};
const APPROVE = { x: SIDE.x + SIDE.w - 20 - 190, y: TOP + 22, w: 190, h: 44 };

const DURATION_S = 24;
const PLAY_START = beat(3.5);
const PLAY_END = beat(9.5);
const CLICK_COMPOSER = beat(9.5);
const TYPE = [beat(9.75), beat(12)] as const;
const CLICK_SEND = beat(12.5);
const CLICK_APPROVE = beat(14.5);
const NEW_COMMENT = "Perfect. Ship this cut.";

const clock = (seconds: number) =>
  `00:${String(Math.floor(seconds)).padStart(2, "0")}`;
/** Frame at which the playhead reaches position `at` (0 → 1). */
const playedAt = (at: number) =>
  Math.round(PLAY_START + ((at - 0.04) / 0.42) * (PLAY_END - PLAY_START));

/** Client Portal: the client watches, leaves a timestamped comment, and approves the version. */
export const ReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const playhead = kf(frame, [PLAY_START, PLAY_END], [0.04, 0.46], (t) => t);
  const paused = frame >= CLICK_COMPOSER;
  const draft = typed(NEW_COMMENT, frame, TYPE[0], TYPE[1]);
  const sent = frame >= CLICK_SEND + 2;
  const approved = frame >= CLICK_APPROVE + 2;
  const markers = [
    ...reviewComments.map((comment) => comment.at),
    ...(sent ? [playhead] : []),
  ];
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 480, scale: 1.02, ry: 3 }, TITLE_OUT, UI_IN),
      { f: beat(5.5), fx: 560, fy: 470, scale: 1.25, ry: 5 },
      { f: beat(7.25), fx: 590, fy: 470, scale: 1.3, ry: 3 },
      { f: beat(8.25), fx: 1310, fy: 470, scale: 1.5, ry: -4 },
      { f: beat(9.25), fx: 1260, fy: 560, scale: 1.45, ry: -4 },
      { f: beat(13.25), fx: 1260, fy: 550, scale: 1.52, ry: -3 },
      { f: beat(14.25), fx: 1370, fy: 210, scale: 1.7, ry: -2 },
      { f: beat(16), fx: 1360, fy: 230, scale: 1.62, ry: -4 },
    ],
    easeCam
  );

  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Feedback on the exact frame."
        graphic={<TimelineMarkers start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Sfx at={0} kind="whoosh" />
      <Sfx at={CLICK_COMPOSER} kind="click" />
      <Sfx at={CLICK_SEND} kind="click" />
      <Sfx at={CLICK_APPROVE} kind="click" />
      <Sfx at={CLICK_APPROVE + 2} kind="switch" />
      <Camera {...camera}>
        <AppWindow
          url="workrelay.dev/p/aperture-summer-launch"
          page="Portal"
          active="reviews"
          chromeless
          overlay={
            <>
              <FocusTrack
                stops={[
                  { f: beat(14), ...APPROVE, amount: 0 },
                  { f: beat(14.75), ...APPROVE, amount: 1 },
                  { f: beat(15.25), ...APPROVE, amount: 1 },
                  { f: beat(16), ...APPROVE, amount: 0.6 },
                ]}
              />
              <Cursor
                path={[
                  { f: beat(8), x: 1200, y: 920 },
                  { f: beat(9.25), x: COMPOSER.x + 200, y: COMPOSER.y + 36 },
                  { f: beat(12), x: COMPOSER.x + 214, y: COMPOSER.y + 42 },
                  {
                    f: beat(12.25),
                    x: COMPOSER.x + COMPOSER.w - 52,
                    y: COMPOSER.y + COMPOSER.h - 30,
                  },
                  {
                    f: beat(13.25),
                    x: COMPOSER.x + COMPOSER.w - 60,
                    y: COMPOSER.y + COMPOSER.h - 40,
                  },
                  {
                    f: beat(14.25),
                    x: APPROVE.x + APPROVE.w / 2,
                    y: APPROVE.y + 26,
                  },
                  {
                    f: beat(16),
                    x: APPROVE.x + APPROVE.w / 2 - 70,
                    y: APPROVE.y + 150,
                  },
                ]}
                clicks={[CLICK_COMPOSER, CLICK_SEND, CLICK_APPROVE]}
              />
            </>
          }
        >
          <div
            style={{ position: "absolute", inset: 0, fontFamily: fonts.sans }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 88,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 40px",
                backgroundColor: colors.panel,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <RelayMark size={34} />
              <div>
                <div style={{ fontSize: 14, color: colors.muted }}>
                  Aperture Coffee
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Summer launch film
                </div>
              </div>
              <span
                style={{
                  marginLeft: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  color: colors.text2,
                }}
              >
                <KeyRound size={15} /> PIN protected
              </span>
              <span
                style={{
                  marginLeft: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  color: colors.text2,
                }}
              >
                <Clock size={15} /> Link expires May 12
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: APPROVE.x,
                top: APPROVE.y - TOP,
                width: APPROVE.w,
                height: APPROVE.h,
                borderRadius: 8,
                backgroundColor: approved ? colors.successBg : colors.ink,
                color: approved ? colors.success : "#fff",
                border: `1px solid ${approved ? "#bbf7d0" : colors.ink}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                scale:
                  frame >= CLICK_APPROVE - 2 && frame <= CLICK_APPROVE + 4
                    ? "0.95"
                    : "1",
              }}
            >
              {approved && <Check size={18} strokeWidth={3} />}
              {approved ? "Approved" : "Approve version"}
            </div>

            <div
              style={{
                position: "absolute",
                left: PLAYER.x,
                top: 112,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 600 }}>Main video</span>
              <span
                style={{
                  fontSize: 14,
                  fontFamily: fonts.mono,
                  color: colors.muted,
                }}
              >
                v4 · current
              </span>
              <StageBadge
                stage={approved ? "Approved" : "Client Review"}
                size={14}
              />
            </div>

            <div
              style={{
                position: "absolute",
                left: PLAYER.x,
                top: PLAYER.y - TOP,
                width: PLAYER.w,
                height: PLAYER.h,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <FilmFrame time={playhead} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 64,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "0 20px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
                  color: "#fff",
                  fontSize: 15,
                  fontFamily: fonts.mono,
                }}
              >
                {paused ? (
                  <Play size={20} fill="#fff" />
                ) : (
                  <Pause size={20} fill="#fff" />
                )}
                <span>
                  {clock(playhead * DURATION_S)} / {clock(DURATION_S)}
                </span>
                <Volume2 size={20} style={{ marginLeft: "auto" }} />
                <Maximize2 size={18} />
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: PLAYER.x,
                top: PLAYER.y - TOP + PLAYER.h + 22,
                width: PLAYER.w,
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.border,
                }}
              >
                <div
                  style={{
                    width: `${playhead * 100}%`,
                    height: "100%",
                    borderRadius: 4,
                    backgroundColor: colors.ink,
                  }}
                />
                {markers.map((at, index) => (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      left: `calc(${at * 100}% - 9px)`,
                      top: -24,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: colors.lime,
                      border: `2px solid ${colors.ink}`,
                      scale: String(
                        index === 2
                          ? kf(
                              frame,
                              [CLICK_SEND + 2, CLICK_SEND + 10],
                              [0, 1],
                              easeOut
                            )
                          : 1
                      ),
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 10,
                  fontSize: 13,
                  color: colors.muted,
                  fontFamily: fonts.mono,
                }}
              >
                <span>00:00</span>
                <span>00:24</span>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: SIDE.x,
                top: SIDE.y - TOP,
                width: SIDE.w,
                height: SIDE.h,
                borderRadius: 12,
                backgroundColor: colors.panel,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  padding: "18px 20px",
                  fontSize: 18,
                  fontWeight: 600,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                Comments{" "}
                <span
                  style={{ fontSize: 14, color: colors.muted, fontWeight: 500 }}
                >
                  {reviewComments.filter(
                    (comment) => frame >= playedAt(comment.at)
                  ).length + (sent ? 1 : 0)}
                </span>
              </div>
              <div style={{ padding: "6px 20px" }}>
                {reviewComments.map((comment) => (
                  <Comment
                    key={comment.time}
                    initials={comment.initials}
                    author={comment.author}
                    time={comment.time}
                    text={comment.text}
                    shown={reveal(frame, playedAt(comment.at), 16)}
                  />
                ))}
                {sent && (
                  <Comment
                    initials="MC"
                    author="Maya Chen"
                    time={clock(playhead * DURATION_S)}
                    text={NEW_COMMENT}
                    shown={reveal(frame, CLICK_SEND + 2, 16)}
                    lift={kf(
                      frame,
                      [
                        CLICK_SEND + 2,
                        CLICK_SEND + 12,
                        beat(13.75),
                        beat(14.5),
                      ],
                      [0, 1, 1, 0]
                    )}
                  />
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: COMPOSER.x - SIDE.x,
                  top: COMPOSER.y - SIDE.y,
                  width: COMPOSER.w,
                  height: COMPOSER.h,
                  boxSizing: "border-box",
                  borderRadius: 10,
                  border: `1px solid ${colors.strong}`,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 16,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      padding: "2px 6px",
                      borderRadius: 4,
                      backgroundColor: colors.canvas,
                      color: colors.text2,
                    }}
                  >
                    {clock(playhead * DURATION_S)}
                  </span>
                  {sent ? (
                    <span style={{ color: colors.zinc }}>Add a comment</span>
                  ) : draft ? (
                    <span>
                      {draft}
                      <Caret height={20} />
                    </span>
                  ) : (
                    <span style={{ color: colors.zinc }}>
                      Add a comment
                      {frame >= CLICK_COMPOSER && <Caret height={20} />}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 12,
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    backgroundColor: colors.ink,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    scale:
                      frame >= CLICK_SEND - 2 && frame <= CLICK_SEND + 4
                        ? "0.94"
                        : "1",
                  }}
                >
                  <Send size={14} /> Comment
                </div>
              </div>
            </div>
          </div>
        </AppWindow>
      </Camera>
    </AbsoluteFill>
  );
};

/** One review comment. `lift` raises it off the list for a moment after it is posted. */
const Comment: React.FC<{
  initials: string;
  author: string;
  time: string;
  text: string;
  shown: number;
  lift?: number;
}> = ({ initials, author, time, text, shown, lift = 0 }) => (
  <div
    style={{
      display: "flex",
      gap: 12,
      padding: `16px ${lift * 14}px`,
      margin: `0 ${-lift * 14}px`,
      borderBottom: `1px solid ${colors.border}`,
      borderRadius: lift * 12,
      backgroundColor: colors.panel,
      boxShadow: `0 ${18 * lift}px ${40 * lift}px -10px rgba(24,24,27,${0.22 * lift})`,
      opacity: shown,
      translate: `0 ${(1 - shown) * 16 - lift * 6}px`,
      scale: String(1 + lift * 0.03),
      position: "relative",
      zIndex: lift > 0 ? 2 : 0,
    }}
  >
    <Avatar initials={initials} size={34} />
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{author}</span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            padding: "1px 6px",
            borderRadius: 4,
            backgroundColor: colors.lime,
            color: colors.ink,
          }}
        >
          {time}
        </span>
      </div>
      <div style={{ fontSize: 15, marginTop: 4, color: colors.text2 }}>
        {text}
      </div>
    </div>
  </div>
);

/** Stand-in for the client's video: a warm sunrise landscape drawn in SVG that drifts with playback. */
const FilmFrame: React.FC<{ time: number }> = ({ time }) => {
  const drift = time * 220;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 562"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="0.55" stopColor="#ffd9a0" />
          <stop offset="1" stopColor="#fff1d6" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="562" fill="url(#sky)" />
      <circle
        cx={620 - drift * 0.2}
        cy={300 - time * 80}
        r="190"
        fill="url(#sun)"
      />
      <circle
        cx={620 - drift * 0.2}
        cy={300 - time * 80}
        r="62"
        fill="#fff6d8"
      />
      <path
        transform={`translate(${-drift * 0.3} 0)`}
        d="M-100 380 C 80 300 200 340 320 310 S 560 250 700 300 S 960 280 1300 320 L1300 562 L-100 562 Z"
        fill="#e98d5b"
        opacity="0.75"
      />
      <path
        transform={`translate(${-drift * 0.6} 0)`}
        d="M-100 430 C 120 380 260 420 420 390 S 700 350 860 400 S 1120 380 1400 410 L1400 562 L-100 562 Z"
        fill="#b8573a"
        opacity="0.85"
      />
      <path
        transform={`translate(${-drift} 0)`}
        d="M-100 490 C 160 450 320 480 520 460 S 820 440 1000 470 S 1300 460 1500 480 L1500 562 L-100 562 Z"
        fill="#5b2a22"
      />
      <g transform={`translate(${430 - drift * 1.4} 0)`}>
        <rect x="0" y="380" width="14" height="96" rx="3" fill="#3a1a15" />
        <circle cx="7" cy="372" r="34" fill="#3a1a15" />
        <circle cx="-14" cy="390" r="24" fill="#3a1a15" />
        <circle cx="28" cy="392" r="22" fill="#3a1a15" />
      </g>
    </svg>
  );
};

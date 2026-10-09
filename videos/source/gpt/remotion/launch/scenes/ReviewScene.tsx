import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Maximize2,
  Pause,
  Play,
  Plus,
  Volume2,
} from "lucide-react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeCam, kf, reveal, typed } from "../anim";
import { AppWindow, Avatar } from "../app-ui";
import { sceneBeat, TITLE_OUT, UI_START, UI_IN } from "../beats";
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
import { colors, fonts } from "../theme";

const beat = (n: number) => sceneBeat("review", n);
const PLAY_START = beat(4.5);
const PAUSE = beat(10);
const POST = beat(14);
const EDITOR = beat(16);
const STATE = beat(17);
const APPROVED = beat(19);
const TEXT = "Perfect. Ship this cut.";
const notes = [
  {
    name: "Maya Chen",
    initials: "MC",
    seconds: 4,
    text: "Hold this shot a little longer.",
  },
  {
    name: "Jordan Patel",
    initials: "JP",
    seconds: 5,
    text: "Love the pace here.",
  },
] as const;
const clock = (s: number) => `00:${String(Math.floor(s)).padStart(2, "0")}`;
const STATE_TARGET = { x: 1200, y: 380 };
const APPROVED_TARGET = { x: 1180, y: 552 };

/** Client comments on a hosted video, then the editor records approval in Outputs and Versions. */
export const ReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = 3 + Math.max(0, Math.min(frame, PAUSE) - PLAY_START) / fps;
  const draft = typed(
    TEXT,
    frame,
    beat(10),
    beat(10) + Math.round((TEXT.length / 15) * fps)
  );
  const sent = frame >= POST;
  const editor = frame >= EDITOR;
  const approved = frame >= APPROVED;
  const scroll = kf(
    frame,
    [beat(6.5), beat(8), beat(8.5), beat(9.5), POST, beat(15)],
    [0, 400, 400, 850, 850, 650],
    easeCam
  );
  const swap = kf(frame, [EDITOR, EDITOR + 16], [0, 1], easeCam);
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 480, scale: 1.02 }, UI_START, UI_IN),
      { f: beat(5.5), fx: 800, fy: 490, scale: 1.25 },
      { f: beat(7.5), fx: 800, fy: 494, scale: 1.28 },
      { f: beat(9.5), fx: 800, fy: 480, scale: 1.3 },
      { f: beat(13.5), fx: 803, fy: 485, scale: 1.32 },
      { f: beat(15), fx: 800, fy: 440, scale: 1.25 },
      { f: EDITOR, fx: 800, fy: 480, scale: 1.02 },
      { f: EDITOR + 16, fx: 800, fy: 480, scale: 1.02 },
      { f: beat(18), fx: 800, fy: 380, scale: 1.2 },
      { f: beat(20), fx: 804, fy: 384, scale: 1.22 },
    ],
    easeCam
  );
  const composer = { x: 660, y: 1370 + 44 - 850 };
  const post = { x: 1170, y: 1427 + 44 - 850 };
  return (
    <AbsoluteFill style={{ fontFamily: fonts.sans }}>
      <Backdrop />
      <TitleCard
        line="Review the exact frame."
        graphic={<TimelineMarkers start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Camera {...camera}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            translate: editor ? `${-swap * 1700}px 0` : "0 0",
          }}
        >
          <AppWindow
            url="workrelay.dev/client-portal/aperture-summer"
            page="Client portal"
            active="reviews"
            chromeless
            overlay={
              !editor ? (
                <Cursor
                  path={[
                    { f: beat(8.5), x: 1240, y: 850 },
                    { f: beat(9.75), ...composer },
                    { f: beat(12.5), ...composer },
                    { f: beat(13.75), ...post },
                    { f: beat(14.5), ...post },
                    { f: beat(16), x: 1200, y: 600 },
                  ]}
                  clicks={[PAUSE, POST]}
                />
              ) : undefined
            }
          >
            <div
              style={{
                position: "absolute",
                left: 300,
                width: 1000,
                top: 0,
                translate: `0 ${-scroll}px`,
                color: colors.ink,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "22px 0",
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <RelayMark size={30} />
                <span style={{ fontSize: 26, fontWeight: 600 }}>Relay</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 16,
                    color: colors.muted,
                  }}
                >
                  Client portal
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 98,
                  fontSize: 44,
                  fontWeight: 600,
                  letterSpacing: "-.035em",
                }}
              >
                Summer launch film
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 155,
                  fontSize: 19,
                  color: colors.muted,
                }}
              >
                For Aperture Coffee · Due May 5 · Review
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 200,
                  width: 1000,
                  height: 562,
                  overflow: "hidden",
                  borderRadius: 6,
                }}
              >
                <CoffeeFilm seconds={seconds} />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "0 20px",
                    background: "rgba(255,255,255,.94)",
                    fontFamily: fonts.mono,
                    fontSize: 15,
                  }}
                >
                  {frame < PAUSE ? <Pause size={20} /> : <Play size={20} />}
                  <span>{clock(seconds)} / 00:24</span>
                  <Volume2 size={19} style={{ marginLeft: "auto" }} />
                  <Maximize2 size={18} />
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 782,
                  width: 1000,
                  height: 6,
                  background: colors.border,
                }}
              >
                <div
                  style={{
                    width: `${(seconds / 24) * 100}%`,
                    height: 6,
                    background: colors.ink,
                  }}
                />
                {notes.map((n) => (
                  <span
                    key={n.seconds}
                    style={{
                      position: "absolute",
                      left: (n.seconds / 24) * 1000,
                      top: -6,
                      width: 8,
                      height: 18,
                      borderRadius: 3,
                      background: colors.lime,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 818,
                  fontSize: 23,
                  fontWeight: 600,
                }}
              >
                Comments
              </div>
              {notes.map((n, i) => (
                <Comment
                  key={n.seconds}
                  y={862 + i * 86}
                  name={n.name}
                  initials={n.initials}
                  time={clock(n.seconds)}
                  text={n.text}
                  shown={reveal(frame, PLAY_START + (n.seconds - 3) * fps, 10)}
                />
              ))}
              {sent && (
                <Comment
                  y={1034}
                  name="Maya Chen"
                  initials="MC"
                  time={clock(seconds)}
                  text={TEXT}
                  shown={reveal(frame, POST, 10)}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  top: 1140,
                  width: 1000,
                  height: 304,
                  boxSizing: "border-box",
                  padding: 18,
                  background: colors.canvas,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  Display name
                </div>
                <Input top={48}>Maya Chen</Input>
                <div
                  style={{
                    position: "absolute",
                    top: 100,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  Timestamp (optional)
                </div>
                <Input top={126} width={210}>
                  {clock(seconds)}
                </Input>
                <div
                  style={{
                    position: "absolute",
                    left: 244,
                    top: 126,
                    height: 38,
                    border: `1px solid ${colors.strong}`,
                    borderRadius: 6,
                    padding: "0 12px",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 15,
                  }}
                >
                  Use current time
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 178,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  Comment
                </div>
                <Input top={204} height={52}>
                  {sent ? (
                    <span style={{ color: colors.muted }}>
                      Leave a comment on this version
                    </span>
                  ) : (
                    <>
                      {draft}
                      {frame >= PAUSE && <Caret />}
                    </>
                  )}
                </Input>
                <div
                  style={{
                    position: "absolute",
                    right: 18,
                    top: 268,
                    width: 156,
                    height: 38,
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    background: colors.ink,
                    color: "white",
                    fontSize: 16,
                    fontWeight: 500,
                    scale: frame >= POST - 2 && frame <= POST + 4 ? ".96" : "1",
                  }}
                >
                  Add comment
                </div>
              </div>
            </div>
          </AppWindow>
        </div>
        {editor && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${(1 - swap) * 1700}px 0`,
            }}
          >
            <AppWindow
              url="workrelay.dev/projects/summer-launch"
              page="Projects / Summer launch film"
              active="projects"
              overlay={
                <>
                  <FocusTrack
                    stops={[
                      {
                        f: APPROVED,
                        ...{ x: 1090, y: 356, w: 220, h: 48 },
                        amount: 0,
                      },
                      {
                        f: APPROVED + 8,
                        ...{ x: 1090, y: 356, w: 220, h: 48 },
                        amount: 1,
                      },
                    ]}
                  />
                  <Cursor
                    path={[
                      { f: EDITOR, x: 1370, y: 600 },
                      { f: STATE - 4, ...STATE_TARGET },
                      { f: STATE + 8, ...STATE_TARGET },
                      { f: APPROVED - 4, ...APPROVED_TARGET },
                      { f: beat(20), ...APPROVED_TARGET },
                    ]}
                    clicks={[STATE, APPROVED]}
                  />
                </>
              }
            >
              <div style={{ padding: 32 }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    letterSpacing: "-.03em",
                  }}
                >
                  Summer launch film
                </div>
                <div
                  style={{ fontSize: 18, marginTop: 8, color: colors.muted }}
                >
                  Aperture Coffee · Due May 5
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 32,
                    marginTop: 28,
                    paddingBottom: 18,
                    borderBottom: `1px solid ${colors.border}`,
                    fontSize: 17,
                  }}
                >
                  {[
                    "Overview",
                    "Outputs and Versions",
                    "Client Review",
                    "Files and Links",
                    "Activity",
                  ].map((t) => (
                    <span
                      key={t}
                      style={{
                        fontWeight: t === "Outputs and Versions" ? 600 : 400,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 30, fontSize: 25, fontWeight: 600 }}>
                  Outputs and Versions
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 32,
                    top: 255,
                    right: 32,
                    padding: "22px 18px",
                    borderTop: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ fontSize: 21, fontWeight: 600 }}>
                    Final master{" "}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        marginLeft: 10,
                        padding: "4px 8px",
                        background: colors.canvas,
                        borderRadius: 4,
                      }}
                    >
                      Deliverable
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 16, color: colors.muted, marginTop: 10 }}
                  >
                    Due May 5 · Next:{" "}
                    {approved
                      ? "Deliver the approved version"
                      : "Await Client review"}
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: STATE_TARGET.x - 110 - 52,
                    top: STATE_TARGET.y - 24 - 100,
                    width: 220,
                    height: 48,
                    border: `1px solid ${colors.strong}`,
                    background: approved ? colors.successBg : colors.panel,
                    color: approved ? colors.success : colors.ink,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 12px",
                    boxSizing: "border-box",
                    fontSize: 17,
                  }}
                >
                  {approved ? (
                    <>
                      <Check size={18} />
                      Approved
                    </>
                  ) : (
                    "Sent to Client"
                  )}
                  <ChevronDown size={17} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 1320 - 52,
                    top: 356 - 100,
                    height: 48,
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 6,
                    background: colors.selected,
                    fontSize: 16,
                  }}
                >
                  <Plus size={17} />
                  Media Version
                </div>
                <div
                  style={{
                    marginTop: 140,
                    padding: 18,
                    background: colors.canvas,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>
                      Current: Version 1
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 15,
                        color: colors.muted,
                      }}
                    >
                      Version 1 · Vimeo
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: 8,
                      fontSize: 16,
                    }}
                  >
                    Open <ArrowUpRight size={18} />
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 30 }}>
                  Version comments
                </div>
                <div style={{ marginTop: 20, fontSize: 18 }}>
                  Maya Chen{" "}
                  <span
                    style={{
                      marginLeft: 12,
                      fontSize: 15,
                      fontFamily: fonts.mono,
                    }}
                  >
                    00:06
                  </span>
                </div>
                <div style={{ fontSize: 19, marginTop: 8 }}>{TEXT}</div>
                {frame >= STATE && !approved && (
                  <div
                    style={{
                      position: "absolute",
                      left: 1090 - 52,
                      top: 406 - 100,
                      width: 220,
                      padding: 5,
                      borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      background: colors.panel,
                      boxShadow: "0 18px 50px rgba(24,24,27,.16)",
                      fontSize: 17,
                      opacity: reveal(frame, STATE, 6),
                    }}
                  >
                    {[
                      "Draft",
                      "Sent to Client",
                      "Changes Requested",
                      "Approved",
                      "Final Delivered",
                    ].map((t) => (
                      <div
                        key={t}
                        style={{
                          height: 42,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 10px",
                        }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AppWindow>
          </div>
        )}
      </Camera>
      <Sfx at={0} kind="whoosh" />
      {[PAUSE, POST, STATE, APPROVED].map((at) => (
        <Sfx key={at} at={at} kind="click" />
      ))}
      <Sfx at={EDITOR} kind="whoosh" />
      <Sfx at={APPROVED} kind="switch" />
    </AbsoluteFill>
  );
};
/** Current public comment row, with the timecode kept small and square. */
const Comment: React.FC<{
  y: number;
  name: string;
  initials: string;
  time: string;
  text: string;
  shown: number;
}> = ({ y, name, initials, time, text, shown }) => (
  <div
    style={{
      position: "absolute",
      top: y,
      width: 1000,
      height: 74,
      display: "flex",
      gap: 14,
      padding: "12px 0",
      boxSizing: "border-box",
      borderBottom: `1px solid ${colors.border}`,
      opacity: shown,
      translate: `0 ${(1 - shown) * 10}px`,
    }}
  >
    <Avatar initials={initials} size={36} />
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 17,
          fontWeight: 600,
        }}
      >
        {name}
        <span
          style={{
            fontSize: 13,
            fontFamily: fonts.mono,
            fontWeight: 400,
            padding: "3px 6px",
            borderRadius: 4,
            background: colors.lime,
          }}
        >
          {time}
        </span>
      </div>
      <div style={{ fontSize: 18, marginTop: 5 }}>{text}</div>
    </div>
  </div>
);
/** Form surfaces match the current portal's stored display-name and timestamp fields. */
const Input: React.FC<{
  top: number;
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ top, children, width = 964, height = 38 }) => (
  <div
    style={{
      position: "absolute",
      left: 18,
      top,
      width,
      height,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      border: `1px solid ${colors.strong}`,
      borderRadius: 6,
      background: colors.panel,
      fontSize: 17,
    }}
  >
    {children}
  </div>
);
/** A fictional Aperture Coffee client film, drawn entirely in SVG and driven by playback time. */
const CoffeeFilm: React.FC<{ seconds: number }> = ({ seconds }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1000 562"
    style={{ display: "block" }}
  >
    <defs>
      <linearGradient id="coffee-back" x2=".8" y2="1">
        <stop stopColor="#e8e2d8" />
        <stop offset="1" stopColor="#beb4a6" />
      </linearGradient>
      <linearGradient id="cup" x2="1">
        <stop stopColor="#faf8f1" />
        <stop offset=".55" stopColor="#ded8cc" />
        <stop offset="1" stopColor="#b3a99b" />
      </linearGradient>
      <radialGradient id="shadow">
        <stop stopColor="#4b453b" stopOpacity=".4" />
        <stop offset="1" stopColor="#4b453b" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1000" height="562" fill="url(#coffee-back)" />
    <g transform={`translate(${(seconds - 3) * 8} ${(seconds - 3) * -2})`}>
      <ellipse cx="704" cy="447" rx="215" ry="55" fill="url(#shadow)" />
      <ellipse cx="698" cy="430" rx="155" ry="28" fill="#eee9df" />
      <path
        d="M797 251 C914 213 914 359 807 353"
        fill="none"
        stroke="#d9d1c5"
        strokeWidth="31"
      />
      <path
        d="M573 231 L599 385 Q698 451 797 385 L823 231 Z"
        fill="url(#cup)"
      />
      <ellipse cx="698" cy="231" rx="125" ry="40" fill="#ede8dc" />
      <ellipse cx="698" cy="232" rx="107" ry="28" fill="#563b27" />
      <ellipse cx="698" cy="230" rx="100" ry="23" fill="#976e46" />
      <path
        d="M652 230 Q698 194 744 230 Q705 219 698 246 Q690 219 652 230"
        fill="#eee2c5"
      />
      <path
        d="M674 181 Q653 154 684 126 Q714 98 690 72"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        opacity=".35"
        transform={`translate(0 ${(seconds - 3) * -5})`}
      />
    </g>
    <text
      x="76"
      y="258"
      fontFamily={fonts.sans}
      fontSize="54"
      fontWeight="600"
      letterSpacing="-2"
    >
      Aperture Coffee
    </text>
    <text x="80" y="300" fontFamily={fonts.sans} fontSize="22" fill="#50493f">
      Summer launch film
    </text>
  </svg>
);

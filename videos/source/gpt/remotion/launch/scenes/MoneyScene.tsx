import { ArrowUpRight, Check, Download, TrendingUp } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { countUp, easeCam, easeOut, kf, money, reveal } from "../anim";
import { AppWindow, MetricLabel, Panel, Progress, StageBadge } from "../app-ui";
import { sceneBeat, TITLE_OUT, UI_START, UI_IN } from "../beats";
import { MoneySplit, TitleCard } from "../motion";
import {
  Backdrop,
  Camera,
  Cursor,
  entrance,
  FocusTrack,
  Sfx,
  useShots,
  type FocusStop,
} from "../primitives";
import { colors, CONTENT, fonts } from "../theme";

const beat = (n: number) => sceneBeat("money", n);

const months = [
  { label: "Dec", value: 6200 },
  { label: "Jan", value: 7400 },
  { label: "Feb", value: 6900 },
  { label: "Mar", value: 9100 },
  { label: "Apr", value: 10800 },
  { label: "May", value: 14200 },
] as const;
const MAX = 15000;

const batchProjects = [
  "Campaign cutdowns",
  "Brand film v3",
  "Launch teaser",
  "Q1 recap",
  "Orbit promo reel",
] as const;
// The key moment of either ending lands on the track's peak (bar 23).
const PEAK = beat(8);
const OPEN_PROJECT = beat(6);
const RETURN_REPORT = beat(9);

// Report layout in window coordinates (see the grid below).
const STATS_Y = CONTENT.y + 32 + 44 + 22;
const STAT_W = (CONTENT.width - 64 - 32) / 3;
const SIDE = {
  x: CONTENT.x + 32 + ((CONTENT.width - 64 - 16) * 1.7) / 2.7 + 16,
  y: STATS_Y + 150 + 16,
  w: (CONTENT.width - 64 - 16) / 2.7,
};

// Delivered projects still waiting on payment. Together they make the $2,750 outstanding.
const unpaid = [
  {
    name: "Campaign cutdowns",
    client: "Orbit Labs",
    delivered: "Delivered May 2",
    value: 1500,
  },
  {
    name: "Brand film v3",
    client: "Aperture Coffee",
    delivered: "Delivered Apr 28",
    value: 1250,
  },
] as const;
const ROW_TOP = 160;
const ROW_H = 96;
const PAY_BUTTON = { w: 116, h: 36 };
/** Window-coordinate centre of the first row's "Mark paid" button. */
const payTarget = {
  x: CONTENT.x + 32 + CONTENT.width - 64 - 320 - 24 - 20,
  y: CONTENT.y + 195 + 110 + 18 + 100 + 18 + 50,
};
const projectTarget = { x: SIDE.x + 150, y: SIDE.y + ROW_TOP + 30 };

export type MoneyEnding = "payment" | "salary";

// Content starts animating once the window has risen in.
const UI_DELAY = UI_IN;

const PANEL = { x: SIDE.x, y: SIDE.y, w: SIDE.w, h: 560 };
const COLLECTED_AND_OWED = {
  x: CONTENT.x + 32 + STAT_W + 16,
  y: STATS_Y,
  w: STAT_W * 2 + 16,
  h: 150,
};

// The focus light only marks the result: the totals that moved, or the finished batch.
const focusFor: Record<MoneyEnding, FocusStop[]> = {
  payment: [
    { f: beat(10), ...COLLECTED_AND_OWED, amount: 0 },
    { f: beat(10.75), ...COLLECTED_AND_OWED, amount: 1 },
  ],
  salary: [
    { f: beat(8.25), ...PANEL, amount: 0 },
    { f: beat(9), ...PANEL, amount: 1 },
  ],
};

const shotsFor = {
  payment: [
    ...entrance({ fx: 800, fy: 480, scale: 1.02 }, UI_START, UI_IN),
    { f: beat(5.5), fx: 832, fy: 290, scale: 1.2 },
    { f: beat(6), fx: 840, fy: 292, scale: 1.2 },
    { f: beat(7.5), fx: 800, fy: 500, scale: 1.2 },
    { f: beat(8.75), fx: 804, fy: 504, scale: 1.22 },
    { f: beat(10), fx: 920, fy: 390, scale: 1.12 },
    { f: beat(12), fx: 930, fy: 392, scale: 1.16 },
  ],
  salary: [
    ...entrance({ fx: 800, fy: 480, scale: 1.02 }, UI_START, UI_IN),
    { f: beat(5.5), fx: 832, fy: 290, scale: 1.2 },
    { f: beat(6.25), fx: 840, fy: 292, scale: 1.22 },
    { f: beat(7.5), fx: 1290, fy: 540, scale: 1.6 },
    { f: beat(12), fx: 1280, fy: 550, scale: 1.68 },
  ],
} as const;

/**
 * Reports: Earned, Collected and Outstanding count up and the trend grows.
 * `payment` ending: an unpaid delivery is marked paid and the totals move.
 * `salary` ending: a Salary Plan reaches 5 of 5 and its batch is ready.
 */
export const MoneyScene: React.FC<{ ending?: MoneyEnding }> = ({
  ending = "payment",
}) => {
  const frame = useCurrentFrame();
  const camera = useShots(shotsFor[ending], easeCam);
  const openProject =
    ending === "payment" && frame >= OPEN_PROJECT && frame < RETURN_REPORT + 16;
  const enterProject = kf(
    frame,
    [OPEN_PROJECT, OPEN_PROJECT + 16],
    [0, 1],
    easeCam
  );
  const returnReport = kf(
    frame,
    [RETURN_REPORT, RETURN_REPORT + 16],
    [0, 1],
    easeCam
  );
  const paid =
    ending === "payment"
      ? kf(frame, [beat(10), beat(10.5)], [0, 1500], easeOut)
      : 0;

  const stats = [
    {
      label: "Earned",
      value: countUp(frame, beat(4.5), beat(5.5), 14200),
      note: "+18% vs last quarter",
      tone: colors.success,
    },
    {
      label: "Collected",
      value: countUp(frame, beat(4.5), beat(5.5), 11450) + Math.round(paid),
      note: "Delivered and paid",
      tone: colors.muted,
    },
    {
      label: "Outstanding",
      value: countUp(frame, beat(4.5), beat(5.5), 2750) - Math.round(paid),
      note: "Delivered, not yet paid",
      tone: colors.warning,
    },
  ] as const;

  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Know what you're owed."
        graphic={<MoneySplit start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Sfx at={0} kind="whoosh" />
      {ending === "payment" && <Sfx at={PEAK} kind="click" />}
      {ending === "payment" && (
        <>
          <Sfx at={OPEN_PROJECT} kind="click" />
          <Sfx at={OPEN_PROJECT} kind="whoosh" />
          <Sfx at={RETURN_REPORT} kind="whoosh" />
        </>
      )}
      <Sfx at={PEAK} kind="switch" />
      <Camera {...camera}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            translate:
              ending === "payment"
                ? `${(-enterProject + returnReport) * 1700}px 0`
                : "0 0",
          }}
        >
          <AppWindow
            url="workrelay.dev/reports"
            page="Reports"
            active="reports"
            overlay={
              <>
                <FocusTrack stops={focusFor[ending]} />
              </>
            }
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: 32,
                fontFamily: fonts.sans,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  height: 44,
                }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    letterSpacing: "-0.035em",
                  }}
                >
                  Reports
                </span>
                <div
                  style={{
                    marginLeft: 12,
                    display: "flex",
                    border: `1px solid ${colors.strong}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    fontSize: 15,
                  }}
                >
                  {["This month", "Quarter", "Year", "All time"].map(
                    (label) => (
                      <span
                        key={label}
                        style={{
                          padding: "8px 14px",
                          backgroundColor:
                            label === "Quarter"
                              ? colors.selected
                              : "transparent",
                          fontWeight: label === "Quarter" ? 500 : 400,
                          color:
                            label === "Quarter" ? colors.ink : colors.muted,
                        }}
                      >
                        {label}
                      </span>
                    )
                  )}
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 14px",
                    border: `1px solid ${colors.strong}`,
                    borderRadius: 8,
                    backgroundColor: colors.panel,
                    fontSize: 15,
                  }}
                >
                  <Download size={16} /> Invoice drafts CSV
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                  marginTop: 22,
                }}
              >
                {stats.map((stat, index) => (
                  <Panel
                    key={stat.label}
                    style={{
                      padding: 22,
                      height: 150,
                      boxSizing: "border-box",
                      opacity: reveal(frame, UI_DELAY + index * 4),
                    }}
                  >
                    <MetricLabel>{stat.label}</MetricLabel>
                    <div
                      style={{
                        fontSize: 52,
                        fontWeight: 600,
                        letterSpacing: "-0.04em",
                        marginTop: 14,
                      }}
                    >
                      {money(stat.value)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                        fontSize: 14,
                        color: stat.tone,
                      }}
                    >
                      {index === 0 && <TrendingUp size={15} />}
                      {stat.note}
                    </div>
                  </Panel>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.7fr 1fr",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <Panel
                  style={{ padding: 22, height: 560, boxSizing: "border-box" }}
                >
                  <div style={{ fontSize: 17, fontWeight: 600 }}>
                    Earnings trend
                  </div>
                  <div
                    style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}
                  >
                    Earned by month, delivered projects only
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 400,
                      marginTop: 30,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 28,
                      padding: "0 10px",
                    }}
                  >
                    {[0.25, 0.5, 0.75, 1].map((line) => (
                      <div
                        key={line}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: `${line * 100}%`,
                          borderTop: `1px dashed ${colors.border}`,
                        }}
                      />
                    ))}
                    {months.map((month, index) => {
                      const grow = kf(
                        frame,
                        [UI_DELAY + 12 + index * 4, UI_DELAY + 42 + index * 4],
                        [0, 1],
                        easeOut
                      );
                      const last = index === months.length - 1;
                      return (
                        <div
                          key={month.label}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 10,
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                        >
                          {last && (
                            <span
                              style={{
                                fontSize: 14,
                                fontFamily: fonts.mono,
                                fontWeight: 500,
                                opacity: reveal(frame, UI_DELAY + 46),
                              }}
                            >
                              {money(month.value)}
                            </span>
                          )}
                          <div
                            style={{
                              width: "100%",
                              height: `${(month.value / MAX) * 88 * grow}%`,
                              borderRadius: 6,
                              backgroundColor: last
                                ? colors.ink
                                : colors.strong,
                              position: "relative",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              color: colors.muted,
                              position: "absolute",
                              bottom: -28,
                            }}
                          >
                            {month.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                {ending === "payment" ? (
                  <UnpaidPanel outstanding={stats[2].value} />
                ) : (
                  <SalaryPanel />
                )}
              </div>
            </div>
          </AppWindow>
        </div>
        {openProject && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${(1 - enterProject - returnReport) * 1700}px 0`,
            }}
          >
            <AppWindow
              url="workrelay.dev/projects/campaign-cutdowns"
              page="Projects / Campaign cutdowns"
              active="projects"
            >
              <PaymentWorkspace paid={frame >= PEAK} />
            </AppWindow>
          </div>
        )}
        {ending === "payment" && (
          <Cursor
            path={[
              { f: beat(4.5), x: 1280, y: 850 },
              { f: beat(5.75), ...projectTarget },
              { f: beat(6.25), ...projectTarget },
              { f: beat(7.75), ...payTarget },
              { f: beat(8.5), ...payTarget },
              { f: beat(9.5), x: 1380, y: 720 },
              { f: beat(12), x: 1390, y: 730 },
            ]}
            clicks={[OPEN_PROJECT, PEAK]}
          />
        )}
      </Camera>
    </AbsoluteFill>
  );
};

/** Delivered, unpaid projects. The first one is marked paid on the peak and leaves the list. */
const UnpaidPanel: React.FC<{ outstanding: number }> = ({ outstanding }) => {
  const frame = useCurrentFrame();
  const isPaid = frame >= PEAK;
  // The paid row leaves first, then the next row moves up into its place.
  const leave = kf(frame, [beat(9.25), beat(9.75)], [0, 1], easeCam);
  const collapse = kf(frame, [beat(9.75), beat(10.5)], [0, 1], easeCam);
  const remaining = leave >= 1 ? 1 : 2;

  return (
    <Panel
      style={{
        position: "relative",
        height: 560,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 22,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 600 }}>Delivered, unpaid</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 4,
            backgroundColor: colors.canvas,
          }}
        >
          {remaining}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 58,
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        {money(outstanding)}
      </div>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 116,
          fontSize: 14,
          color: colors.muted,
        }}
      >
        {remaining} {remaining === 1 ? "project" : "projects"} waiting on
        payment
      </div>
      {unpaid.map((row, index) => {
        const first = index === 0;
        const top = ROW_TOP + (first ? 0 : ROW_H * (1 - collapse));
        const shown = reveal(frame, UI_DELAY + 16 + index * 4);
        return (
          <div
            key={row.name}
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              top,
              height: ROW_H,
              borderTop: `1px solid ${colors.border}`,
              opacity: shown * (first ? 1 - leave : 1),
              translate: first ? `${leave * 40}px 0` : "0 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 18,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {row.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 44,
                fontSize: 14,
                color: colors.muted,
              }}
            >
              {row.client} · {row.delivered}
            </div>
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 18,
                fontSize: 16,
                fontFamily: fonts.mono,
                fontWeight: 500,
              }}
            >
              {money(row.value)}
            </div>
            {first && isPaid ? (
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  top: 48,
                  width: PAY_BUTTON.w,
                  height: PAY_BUTTON.h,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid #bbf7d0",
                  backgroundColor: colors.successBg,
                  color: colors.success,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  scale: String(
                    kf(frame, [PEAK + 4, PEAK + 12], [0.9, 1], easeOut)
                  ),
                }}
              >
                <Check size={15} strokeWidth={3} /> Paid
              </span>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  top: 48,
                  width: 28,
                  height: PAY_BUTTON.h,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  backgroundColor: colors.panel,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 500,
                  scale:
                    first && frame >= PEAK - 2 && frame <= PEAK + 3
                      ? "0.95"
                      : "1",
                }}
              >
                <ArrowUpRight size={17} />
              </span>
            )}
          </div>
        );
      })}
    </Panel>
  );
};

/** The current project's Overview exposes client payment as a switch after delivery. */
const PaymentWorkspace: React.FC<{ paid: boolean }> = ({ paid }) => (
  <div style={{ padding: 32, fontFamily: fonts.sans }}>
    <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-.03em" }}>
      Campaign cutdowns
    </div>
    <div style={{ marginTop: 8, fontSize: 18, color: colors.muted }}>
      Orbit Labs · Delivered May 2
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
        <span key={t} style={{ fontWeight: t === "Overview" ? 600 : 400 }}>
          {t}
        </span>
      ))}
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: 20,
        position: "absolute",
        left: 32,
        right: 32,
        top: 195,
      }}
    >
      <div>
        <Panel style={{ padding: 24, height: 110, boxSizing: "border-box" }}>
          <div style={{ fontSize: 21, fontWeight: 600 }}>Workflow</div>
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              marginTop: 24,
            }}
          >
            {[
              "Planned",
              "Editing",
              "Client Review",
              "Revisions",
              "Approved",
              "Delivered",
            ].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  gap: 8,
                  fontSize: 15,
                  alignItems: "center",
                }}
              >
                <Check size={16} />
                {t}
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          style={{
            padding: 24,
            marginTop: 18,
            height: 100,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 600 }}>Internal notes</div>
          <div style={{ marginTop: 15, fontSize: 18 }}>
            Final cutdowns delivered to Orbit Labs.
          </div>
        </Panel>
        <Panel
          style={{
            padding: 24,
            marginTop: 18,
            height: 100,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 21, fontWeight: 600 }}>Client payment</div>
            <div
              style={{
                fontSize: 18,
                color: paid ? colors.success : colors.muted,
                marginTop: 10,
              }}
            >
              {paid ? "Paid" : "Delivered, not paid"}
            </div>
          </div>
          <div
            style={{
              width: 40,
              height: 24,
              borderRadius: 6,
              background: paid ? colors.ink : colors.strong,
              padding: 3,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "white",
                translate: paid ? "16px 0" : "0 0",
              }}
            />
          </div>
        </Panel>
      </div>
      <Panel style={{ padding: 24 }}>
        <div style={{ fontSize: 21, fontWeight: 600 }}>Details</div>
        <div style={{ marginTop: 24 }}>
          <StageBadge stage="Delivered" size={16} />
        </div>
        <div style={{ marginTop: 25, fontSize: 16, color: colors.muted }}>
          Client
        </div>
        <div style={{ marginTop: 6, fontSize: 19 }}>Orbit Labs</div>
        <div style={{ marginTop: 25, fontSize: 16, color: colors.muted }}>
          Project value
        </div>
        <div style={{ marginTop: 6, fontSize: 32, fontWeight: 600 }}>
          $1,500
        </div>
        <div style={{ marginTop: 25, fontSize: 16, color: colors.muted }}>
          Payment
        </div>
        <div style={{ marginTop: 6, fontSize: 19 }}>
          {paid ? "Paid" : "Unpaid"}
        </div>
      </Panel>
    </div>
  </div>
);

/** Salary Plan progress. The fifth delivery completes the batch on the peak. */
const SalaryPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const complete = frame >= PEAK;
  return (
    <Panel style={{ padding: 22, height: 560, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Salary plan</span>
        {complete && (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              borderRadius: 4,
              backgroundColor: colors.successBg,
              color: colors.success,
              fontSize: 13,
              fontWeight: 600,
              scale: String(kf(frame, [PEAK, PEAK + 8], [0.6, 1], easeOut)),
            }}
          >
            <Check size={14} strokeWidth={3} /> Batch ready
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginTop: 16,
        }}
      >
        Orbit Labs retainer
      </div>
      <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
        5 delivered projects · $3,000 batch
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginTop: 22,
        }}
      >
        <span
          style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.04em" }}
        >
          {complete ? 5 : 4}
        </span>
        <span style={{ fontSize: 16, color: colors.muted }}>/ 5 delivered</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <Progress
          value={kf(
            frame,
            [UI_DELAY + 6, UI_DELAY + 36, PEAK, PEAK + 10],
            [0, 80, 80, 100],
            easeOut
          )}
          height={10}
        />
      </div>
      <div style={{ marginTop: 22 }}>
        {batchProjects.map((name, index) => {
          const done = index < 4 || complete;
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderTop: index ? `1px solid ${colors.border}` : "none",
                fontSize: 15,
                opacity: reveal(frame, UI_DELAY + 16 + index * 4),
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `1.5px solid ${done ? colors.ink : colors.strong}`,
                  backgroundColor: done ? colors.ink : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span style={{ color: done ? colors.ink : colors.muted }}>
                {name}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                {done ? "Delivered" : "Approved"}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

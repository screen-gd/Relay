import { Clock, Columns3, List, Plus, Search } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam, easeInOut, easeOut, kf, reveal } from "../anim";
import { AppWindow, Avatar } from "../app-ui";
import { beat, TITLE_OUT, UI_IN } from "../beats";
import { StageTrack, TitleCard } from "../motion";
import {
  Backdrop,
  Camera,
  Cursor,
  entrance,
  FocusTrack,
  Sfx,
  useShots,
} from "../primitives";
import {
  colors,
  CONTENT,
  fonts,
  stageColor,
  stages,
  type StageName,
} from "../theme";

type Card = { title: string; client: string; due: string; owner: string };

const columns: Record<StageName, Card[]> = {
  Planned: [
    {
      title: "Product ad 30s",
      client: "Northwind Audio",
      due: "May 14",
      owner: "SK",
    },
    {
      title: "Wedding teaser",
      client: "Lumen Events",
      due: "May 20",
      owner: "AR",
    },
  ],
  Editing: [
    {
      title: "Podcast episode 31",
      client: "Northwind Audio",
      due: "May 10",
      owner: "SK",
    },
  ],
  "Client Review": [
    {
      title: "Founder story cutdown",
      client: "Orbit Labs",
      due: "May 7",
      owner: "SK",
    },
  ],
  Revisions: [
    {
      title: "Field Notes episode 12",
      client: "Field Notes",
      due: "May 8",
      owner: "AR",
    },
  ],
  Approved: [
    {
      title: "Spring menu reels",
      client: "Aperture Coffee",
      due: "May 9",
      owner: "AR",
    },
  ],
  Delivered: [
    {
      title: "Campaign cutdowns",
      client: "Orbit Labs",
      due: "May 2",
      owner: "SK",
    },
    {
      title: "Brand film v3",
      client: "Aperture Coffee",
      due: "Apr 28",
      owner: "AR",
    },
  ],
};

const dragged: Card = {
  title: "Summer launch film",
  client: "Aperture Coffee",
  due: "May 5",
  owner: "AR",
};

// Board geometry in window coordinates.
const COL_W = 234;
const GAP = 12;
const COL_TOP = CONTENT.y + 96;
const CARD_H = 108;
const CARD_GAP = 12;
const colX = (index: number) => CONTENT.x + 32 + index * (COL_W + GAP);
const cardY = (slot: number) => COL_TOP + 50 + slot * (CARD_H + CARD_GAP);

const GRAB = beat(6);
const DROP = beat(8);
const from = { x: colX(1) + 10, y: cardY(0) };
const to = { x: colX(2) + 10, y: cardY(1) };
/** The Editing and Client Review columns, lit while the card moves between them. */
const DRAG_ZONE = {
  x: colX(1),
  y: COL_TOP,
  w: COL_W * 2 + GAP,
  h: cardY(2) - COL_TOP,
};

/** Projects board: the cursor drags "Summer launch film" from Editing into Client Review. */
export const BoardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 470, scale: 1.02, ry: -4 }, TITLE_OUT, UI_IN),
      { f: beat(5.5), fx: 600, fy: 380, scale: 1.4, rx: 4, ry: -6 },
      { f: beat(8.5), fx: 650, fy: 390, scale: 1.48, rx: 4, ry: -3 },
      { f: beat(10), fx: 860, fy: 430, scale: 1.04, rx: 4, ry: 10 },
      { f: beat(12), fx: 860, fy: 430, scale: 1.08, rx: 3, ry: 8 },
    ],
    easeCam
  );

  const t = kf(frame, [GRAB, DROP], [0, 1], easeInOut);
  const settle = kf(frame, [DROP, DROP + 8], [0, 1], easeOut);
  const cardX = from.x + (to.x - from.x) * t;
  const cardTop = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 30;
  const lifted = frame >= GRAB && frame < DROP ? 1 : 1 - settle;
  const hoverTarget = kf(frame, [GRAB + 18, GRAB + 30], [0, 1]);
  const editingShift = kf(frame, [GRAB + 6, GRAB + 18], [0, 1], easeOut);
  const dropped = frame >= DROP;

  const grabOffset = { x: 118, y: 40 };

  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Move work stage by stage."
        graphic={<StageTrack start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Sfx at={0} kind="whoosh" />
      <Sfx at={GRAB} kind="click" />
      <Sfx at={DROP} kind="switch" />
      <Camera {...camera}>
        <AppWindow
          url="workrelay.dev/projects?view=board"
          page="Projects"
          active="projects"
          overlay={
            <>
              {stages.map((stage, index) => {
                const base = columns[stage.name];
                const isEditing = stage.name === "Editing";
                const isReview = stage.name === "Client Review";
                const count =
                  base.length +
                  (isEditing && !dropped ? 1 : 0) +
                  (isReview && dropped ? 1 : 0);
                return (
                  <div key={stage.name}>
                    <div
                      style={{
                        position: "absolute",
                        left: colX(index),
                        top: COL_TOP,
                        width: COL_W,
                        height: 700,
                        borderRadius: 12,
                        backgroundColor: "rgba(9,9,11,0.035)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: colX(index) + 14,
                        top: COL_TOP + 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: fonts.sans,
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          backgroundColor: stage.color,
                        }}
                      />
                      {stage.name}
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: colors.muted,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    {base.map((card, slot) => {
                      const shift = isEditing ? 1 - editingShift : 0;
                      return (
                        <BoardCard
                          key={card.title}
                          card={card}
                          x={colX(index) + 10}
                          y={cardY(slot + shift)}
                          stage={stage.name}
                          opacity={reveal(
                            frame,
                            beat(3.5) + index * 3 + slot * 2,
                            14
                          )}
                        />
                      );
                    })}
                    {isReview && !dropped && (
                      <div
                        style={{
                          position: "absolute",
                          left: to.x,
                          top: to.y,
                          width: COL_W - 20,
                          height: CARD_H,
                          borderRadius: 10,
                          border: `2px dashed ${colors.strong}`,
                          boxSizing: "border-box",
                          opacity: hoverTarget,
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <div
                style={{
                  position: "absolute",
                  left: cardX,
                  top: cardTop,
                  rotate: `${lifted * kf(frame, [GRAB, GRAB + 8, DROP - 8, DROP], [0, 3, 3, 0])}deg`,
                  scale: String(1 + lifted * 0.04),
                  zIndex: 20,
                }}
              >
                <BoardCard
                  card={dragged}
                  x={0}
                  y={0}
                  stage={t > 0.55 ? "Client Review" : "Editing"}
                  shadow={lifted}
                  opacity={1}
                />
              </div>
              <FocusTrack
                stops={[
                  { f: beat(5.25), ...DRAG_ZONE, amount: 0 },
                  { f: beat(6), ...DRAG_ZONE, amount: 1 },
                  { f: beat(8.75), ...DRAG_ZONE, amount: 1 },
                  { f: beat(9.5), ...DRAG_ZONE, amount: 0 },
                ]}
              />
              <Cursor
                path={[
                  { f: beat(4.5), x: 560, y: 760 },
                  {
                    f: beat(5.75),
                    x: from.x + grabOffset.x,
                    y: from.y + grabOffset.y,
                  },
                  {
                    f: GRAB,
                    x: from.x + grabOffset.x,
                    y: from.y + grabOffset.y,
                  },
                  { f: DROP, x: to.x + grabOffset.x, y: to.y + grabOffset.y },
                  {
                    f: beat(9.5),
                    x: to.x + grabOffset.x + 260,
                    y: to.y + grabOffset.y + 220,
                  },
                  {
                    f: beat(12),
                    x: to.x + grabOffset.x + 300,
                    y: to.y + grabOffset.y + 240,
                  },
                ]}
                grab={[GRAB, DROP]}
              />
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
                Projects
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
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    color: colors.muted,
                  }}
                >
                  <List size={16} /> List
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    backgroundColor: colors.selected,
                    fontWeight: 500,
                  }}
                >
                  <Columns3 size={16} /> Board
                </span>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  width: 280,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 12px",
                  border: `1px solid ${colors.strong}`,
                  borderRadius: 8,
                  backgroundColor: colors.panel,
                  fontSize: 15,
                  color: colors.muted,
                }}
              >
                <Search size={16} /> Search projects
              </div>
              <div
                style={{
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 16px",
                  borderRadius: 8,
                  backgroundColor: colors.ink,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <Plus size={16} /> New project
              </div>
            </div>
          </div>
        </AppWindow>
      </Camera>
    </AbsoluteFill>
  );
};

const BoardCard: React.FC<{
  card: Card;
  x: number;
  y: number;
  stage: StageName;
  opacity: number;
  shadow?: number;
}> = ({ card, x, y, stage, opacity, shadow = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: COL_W - 20,
      height: CARD_H,
      boxSizing: "border-box",
      padding: 14,
      borderRadius: 10,
      backgroundColor: colors.panel,
      border: `1px solid ${colors.border}`,
      boxShadow: `0 ${20 * shadow}px ${44 * shadow}px rgba(24,24,27,${0.22 * shadow})`,
      fontFamily: fonts.sans,
      opacity,
      translate: `0 ${(1 - opacity) * 12}px`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {card.title}
      </span>
      <span
        style={{
          marginLeft: "auto",
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: stageColor(stage),
        }}
      />
    </div>
    <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
      {card.client}
    </div>
    <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          color: colors.text2,
        }}
      >
        <Clock size={13} /> {card.due}
      </span>
      <Avatar initials={card.owner} size={26} style={{ marginLeft: "auto" }} />
    </div>
  </div>
);

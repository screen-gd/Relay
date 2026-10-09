import {
  CalendarDays,
  Check,
  ChevronDown,
  Film,
  Heart,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam, easeIn, easeOut, kf, reveal, typed } from "../anim";
import { AppWindow, QUICK_CREATE } from "../app-ui";
import { beat, TITLE_OUT, UI_IN } from "../beats";
import { TemplateStamp, TitleCard } from "../motion";
import {
  Backdrop,
  Camera,
  Caret,
  Cursor,
  entrance,
  Sfx,
  useShots,
} from "../primitives";
import { colors, fonts, stages, WINDOW } from "../theme";
import { DashboardContent } from "./DashboardContent";

// Dialog geometry in window coordinates. Children use dialog-local coordinates.
const D = { x: 470, y: 160, w: 660, h: 640, pad: 32 } as const;
const nameInput = { x: D.pad, y: 104, w: D.w - D.pad * 2, h: 50 };
const clientInput = { x: D.pad, y: 204, w: 290, h: 50 };
const dueInput = { x: D.pad + 306, y: 204, w: 290, h: 50 };
const tileY = 304;
const tileW = (D.w - D.pad * 2 - 24) / 3;
const workflowY = tileY + 150;
const createBtn = { x: D.w - D.pad - 160, y: D.h - D.pad - 50, w: 160, h: 50 };

/** Converts a dialog-local point to window coordinates for cursor targets. */
const win = (x: number, y: number) => ({ x: D.x + x, y: D.y + y });

const CLICK_NAME = beat(5.75);
const TYPE = [beat(6), beat(8)] as const;
const CLICK_CLIENT = beat(8.75);
const CLICK_OPTION = beat(9.75);
const CLICK_TEMPLATE = beat(11);
const CLICK_CREATE = beat(13.5);

// Built-in templates from docs/APP-OVERVIEW.md.
const templates: readonly { name: string; meta: string; icon: LucideIcon }[] = [
  { name: "YouTube Video", meta: "6 stages · 14 days", icon: Film },
  { name: "Instagram Reel", meta: "5 stages · 5 days", icon: Smartphone },
  { name: "Wedding Film", meta: "6 stages · 30 days", icon: Heart },
];

/** New project dialog: type a name, pick a client, choose a template, create. The row lands in the ledger. */
export const CreateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const open = reveal(frame, beat(4.25), 12);
  const close = kf(
    frame,
    [CLICK_CREATE + 6, CLICK_CREATE + 14],
    [0, 1],
    easeIn
  );
  const name = typed("Summer launch film", frame, TYPE[0], TYPE[1]);
  const menu = frame >= CLICK_CLIENT + 2 && frame < CLICK_OPTION + 2;
  const clientChosen = frame >= CLICK_OPTION + 2;
  const templateChosen = frame >= CLICK_TEMPLATE + 1;
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 470, scale: 1.25 }, TITLE_OUT, UI_IN),
      { f: beat(5.5), fx: 800, fy: 300, scale: 1.55 },
      { f: beat(8), fx: 800, fy: 300, scale: 1.58 },
      { f: beat(9), fx: 800, fy: 420, scale: 1.5 },
      { f: beat(12), fx: 800, fy: 470, scale: 1.48 },
      { f: beat(13), fx: 900, fy: 620, scale: 1.45 },
      { f: beat(14), fx: 900, fy: 620, scale: 1.45 },
      { f: beat(15.25), fx: 760, fy: 430, scale: 1.18, ry: -4 },
      { f: beat(16), fx: 760, fy: 432, scale: 1.2, ry: -4 },
    ],
    easeCam
  );

  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Start from a template."
        graphic={<TemplateStamp start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Camera {...camera}>
        <AppWindow
          url="workrelay.dev/dashboard"
          page="Dashboard"
          active="dashboard"
          overlay={
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: WINDOW.chrome,
                  bottom: 0,
                  backgroundColor: "rgba(24,24,27,0.45)",
                  opacity: open * (1 - close),
                }}
              />
              {close < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: D.x,
                    top: D.y,
                    width: D.w,
                    height: D.h,
                    borderRadius: 16,
                    backgroundColor: colors.panel,
                    boxShadow: "0 40px 90px -20px rgba(24,24,27,0.35)",
                    fontFamily: fonts.sans,
                    opacity: open * (1 - close),
                    // Opens out of the Quick create button it was launched from.
                    transformOrigin: `${QUICK_CREATE.x - D.x}px ${QUICK_CREATE.y - D.y}px`,
                    scale: String(0.88 + open * 0.12 - close * 0.03),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: D.pad,
                      top: 30,
                      fontSize: 26,
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    New project
                  </div>
                  <Label x={nameInput.x} y={nameInput.y - 28}>
                    Project name
                  </Label>
                  <Field box={nameInput}>
                    {name ||
                      (frame < CLICK_NAME ? (
                        <span style={{ color: colors.zinc }}>
                          Untitled project
                        </span>
                      ) : null)}
                    {frame >= CLICK_NAME && frame < CLICK_CLIENT && (
                      <Caret height={24} />
                    )}
                  </Field>

                  <Label x={clientInput.x} y={clientInput.y - 28}>
                    Client
                  </Label>
                  <Field
                    box={clientInput}
                    trailing={<ChevronDown size={18} color={colors.muted} />}
                  >
                    {clientChosen ? (
                      "Aperture Coffee"
                    ) : (
                      <span style={{ color: colors.zinc }}>
                        Choose a client
                      </span>
                    )}
                  </Field>
                  <Label x={dueInput.x} y={dueInput.y - 28}>
                    Due date
                  </Label>
                  <Field
                    box={dueInput}
                    trailing={<CalendarDays size={18} color={colors.muted} />}
                  >
                    {templateChosen ? (
                      <span
                        style={{
                          opacity: reveal(frame, CLICK_TEMPLATE + 6, 12),
                        }}
                      >
                        May 5 · in 14 days
                      </span>
                    ) : (
                      <span style={{ color: colors.zinc }}>Pick a date</span>
                    )}
                  </Field>

                  <Label x={D.pad} y={tileY - 28}>
                    Template
                  </Label>
                  {templates.map((template, index) => {
                    const selected = templateChosen && index === 0;
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.name}
                        style={{
                          position: "absolute",
                          left: D.pad + index * (tileW + 12),
                          top: tileY,
                          width: tileW,
                          height: 104,
                          boxSizing: "border-box",
                          padding: 16,
                          borderRadius: 12,
                          border: `${selected ? 2 : 1}px solid ${selected ? colors.ink : colors.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Icon size={22} />
                          {selected && (
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 5,
                                backgroundColor: colors.ink,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                scale: String(
                                  kf(
                                    frame,
                                    [CLICK_TEMPLATE, CLICK_TEMPLATE + 8],
                                    [0.6, 1],
                                    easeOut
                                  )
                                ),
                              }}
                            >
                              <Check size={15} color="#fff" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 600,
                            marginTop: 14,
                          }}
                        >
                          {template.name}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: colors.muted,
                            marginTop: 2,
                          }}
                        >
                          {template.meta}
                        </div>
                      </div>
                    );
                  })}

                  <Label x={D.pad} y={workflowY - 28}>
                    Workflow
                  </Label>
                  <div
                    style={{
                      position: "absolute",
                      left: D.pad,
                      top: workflowY,
                      width: D.w - D.pad * 2,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {stages.map((stage, index) => {
                      const shown = templateChosen
                        ? reveal(
                            frame,
                            CLICK_TEMPLATE + beat(0.25 * (index + 1)),
                            14
                          )
                        : 0;
                      return (
                        <span
                          key={stage.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 11px",
                            borderRadius: 5,
                            border: `1px solid ${colors.border}`,
                            fontSize: 15,
                            fontWeight: 500,
                            opacity: shown,
                            translate: `0 ${(1 - shown) * 8}px`,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              backgroundColor: stage.color,
                            }}
                          />
                          {stage.name}
                        </span>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: createBtn.x - 112,
                      top: createBtn.y,
                      width: 100,
                      height: createBtn.h,
                      borderRadius: 9,
                      border: `1px solid ${colors.strong}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: createBtn.x,
                      top: createBtn.y,
                      width: createBtn.w,
                      height: createBtn.h,
                      borderRadius: 9,
                      backgroundColor: colors.ink,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 500,
                      scale:
                        frame >= CLICK_CREATE - 2 && frame <= CLICK_CREATE + 5
                          ? "0.95"
                          : "1",
                    }}
                  >
                    Create project
                  </div>

                  {menu && (
                    <div
                      style={{
                        position: "absolute",
                        left: clientInput.x,
                        top: clientInput.y + clientInput.h + 6,
                        width: clientInput.w,
                        borderRadius: 12,
                        backgroundColor: colors.panel,
                        border: `1px solid ${colors.border}`,
                        boxShadow: "0 20px 50px rgba(24,24,27,0.16)",
                        padding: 6,
                        fontSize: 16,
                        zIndex: 5,
                        transformOrigin: "top left",
                        opacity: reveal(frame, CLICK_CLIENT + 2, 8),
                        scale: String(
                          0.97 + reveal(frame, CLICK_CLIENT + 2, 8) * 0.03
                        ),
                      }}
                    >
                      {["Aperture Coffee", "Orbit Labs", "Field Notes"].map(
                        (client) => (
                          <div key={client} style={{ padding: "11px 12px" }}>
                            {client}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              <Cursor
                path={[
                  { f: beat(4), x: QUICK_CREATE.x - 8, y: QUICK_CREATE.y + 4 },
                  { f: beat(5.5), ...win(nameInput.x + 240, nameInput.y + 30) },
                  { f: beat(8), ...win(nameInput.x + 250, nameInput.y + 34) },
                  {
                    f: beat(8.5),
                    ...win(clientInput.x + 170, clientInput.y + 28),
                  },
                  {
                    f: beat(9.5),
                    ...win(
                      clientInput.x + 110,
                      clientInput.y + clientInput.h + 30
                    ),
                  },
                  {
                    f: beat(10.75),
                    ...win(D.pad + tileW / 2 + 10, tileY + 56),
                  },
                  {
                    f: beat(13),
                    ...win(createBtn.x + createBtn.w / 2, createBtn.y + 28),
                  },
                  {
                    f: beat(14.5),
                    ...win(createBtn.x + 40, createBtn.y + 120),
                  },
                ]}
                clicks={[
                  CLICK_NAME,
                  CLICK_CLIENT,
                  CLICK_OPTION,
                  CLICK_TEMPLATE,
                  CLICK_CREATE,
                ]}
              />
            </>
          }
        >
          <DashboardContent settled newRow={reveal(frame, beat(14), 22)} />
        </AppWindow>
      </Camera>
      {[
        CLICK_NAME,
        CLICK_CLIENT,
        CLICK_OPTION,
        CLICK_TEMPLATE,
        CLICK_CREATE,
      ].map((at) => (
        <Sfx key={at} at={at} kind="click" />
      ))}
      <Sfx at={0} kind="whoosh" />
    </AbsoluteFill>
  );
};

const Label: React.FC<{ x: number; y: number; children: ReactNode }> = ({
  x,
  y,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      fontSize: 15,
      fontWeight: 500,
      color: colors.text2,
    }}
  >
    {children}
  </div>
);

const Field: React.FC<{
  box: { x: number; y: number; w: number; h: number };
  children: ReactNode;
  trailing?: ReactNode;
}> = ({ box, children, trailing }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      boxSizing: "border-box",
      borderRadius: 9,
      border: `1px solid ${colors.strong}`,
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      fontSize: 18,
    }}
  >
    <span style={{ display: "flex", alignItems: "center" }}>{children}</span>
    {trailing && (
      <span style={{ marginLeft: "auto", display: "flex" }}>{trailing}</span>
    )}
  </div>
);

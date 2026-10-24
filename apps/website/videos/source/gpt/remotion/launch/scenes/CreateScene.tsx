import { CalendarDays, ChevronDown, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeCam, easeIn, kf, reveal, typed } from "../anim";
import { AppWindow, QUICK_CREATE } from "../app-ui";
import { sceneBeat, TITLE_OUT, UI_START, UI_IN } from "../beats";
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

const beat = (n: number) => sceneBeat("create", n);
const D = { x: 470, y: 112, w: 660, h: 750, pad: 32 } as const;
const point = (x: number, y: number) => ({ x: D.x + x, y: D.y + y });
const NAME = beat(5);
const CLIENT = beat(9);
const CLIENT_OPTION = beat(11);
const TEMPLATE = beat(13);
const TEMPLATE_OPTION = beat(15);
const CREATE = beat(17);
const targets = {
  name: point(300, 133),
  client: point(320, 207),
  clientOption: point(190, 266),
  template: point(320, 383),
  templateOption: point(220, 442),
  create: point(540, 709),
};

/** The current New Project form, with client and workflow dropdowns and copied stages. */
export const CreateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = reveal(frame, beat(4.5), 8);
  const close = kf(frame, [CREATE + 5, CREATE + 14], [0, 1], easeIn);
  const name = typed(
    "Summer launch film",
    frame,
    NAME,
    NAME + Math.round((17 / 15) * fps)
  );
  const clientChosen = frame >= CLIENT_OPTION;
  const templateChosen = frame >= TEMPLATE_OPTION;
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 480, scale: 1.02 }, UI_START, UI_IN),
      { f: beat(4.5), fx: 800, fy: 480, scale: 1.02 },
      { f: beat(6), fx: 800, fy: 485, scale: 1.23 },
      { f: beat(12), fx: 803, fy: 488, scale: 1.25 },
      { f: beat(13.5), fx: 800, fy: 485, scale: 1.23 },
      { f: beat(17.5), fx: 801, fy: 488, scale: 1.25 },
      { f: beat(17.8), fx: 800, fy: 488, scale: 1.25 },
      { f: beat(18.6), fx: 760, fy: 550, scale: 1.2 },
      { f: beat(20), fx: 764, fy: 554, scale: 1.22 },
    ],
    easeCam
  );
  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Start with a workflow."
        graphic={<TemplateStamp start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Camera {...camera}>
        <AppWindow
          url="workrelay.dev"
          page="Dashboard"
          active="dashboard"
          overlay={
            <>
              <div
                style={{
                  position: "absolute",
                  inset: `${WINDOW.chrome}px 0 0`,
                  background: "rgba(24,24,27,.45)",
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
                    borderRadius: 8,
                    background: colors.panel,
                    boxShadow: "0 18px 50px rgba(24,24,27,.16)",
                    fontFamily: fonts.sans,
                    opacity: open * (1 - close),
                    transformOrigin: `${QUICK_CREATE.x - D.x}px ${QUICK_CREATE.y - D.y}px`,
                    scale: String(0.92 + open * 0.08 - close * 0.03),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      top: 25,
                      fontSize: 26,
                      fontWeight: 600,
                    }}
                  >
                    New Project
                  </div>
                  <X
                    size={20}
                    style={{ position: "absolute", right: 24, top: 28 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      top: 62,
                      fontSize: 14,
                      color: colors.muted,
                    }}
                  >
                    Set the schedule and production details.
                  </div>
                  <Field y={112} label="Project name">
                    {name}
                    {frame >= NAME && frame < CLIENT && <Caret />}
                  </Field>
                  <Field y={186} label="Client" dropdown>
                    {clientChosen ? "Aperture Coffee" : "Choose a Client"}
                  </Field>
                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      top: 234,
                      fontSize: 14,
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                    }}
                  >
                    <Plus size={14} />
                    Create new Client
                  </div>
                  <Field y={280} label="Project Group" dropdown>
                    No Project Group
                  </Field>
                  <Field y={362} label="Workflow Template" dropdown>
                    {templateChosen ? "Relay Default Workflow" : "No Template"}
                  </Field>
                  <Field
                    y={444}
                    label="Due date"
                    width={284}
                    trailing={<CalendarDays size={17} />}
                  >
                    {templateChosen ? "May 5" : "Pick a date"}
                  </Field>
                  <Field
                    y={444}
                    label="Financial type"
                    x={332}
                    width={296}
                    dropdown
                  >
                    Client Project
                  </Field>
                  <Field y={526} label="Project value" width={284}>
                    $1,800
                  </Field>
                  <Field y={526} label="Work type" x={332} width={296} dropdown>
                    Video production
                  </Field>
                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      top: 596,
                      fontSize: 14,
                      color: colors.muted,
                    }}
                  >
                    Workflow
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      top: 620,
                      width: 596,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {stages.map((stage, index) => (
                      <span
                        key={stage.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          padding: "5px 8px",
                          border: `1px solid ${colors.border}`,
                          borderRadius: 4,
                          opacity: templateChosen
                            ? reveal(frame, TEMPLATE_OPTION + index * 2, 8)
                            : 0,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 2,
                            background: stage.color,
                          }}
                        />
                        {stage.name}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 190,
                      top: 690,
                      width: 90,
                      height: 38,
                      display: "grid",
                      placeItems: "center",
                      border: `1px solid ${colors.strong}`,
                      borderRadius: 6,
                      fontSize: 15,
                    }}
                  >
                    Cancel
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 32,
                      top: 690,
                      width: 146,
                      height: 38,
                      display: "grid",
                      placeItems: "center",
                      background: colors.ink,
                      color: "white",
                      borderRadius: 6,
                      fontSize: 15,
                      fontWeight: 500,
                      scale:
                        frame >= CREATE - 2 && frame <= CREATE + 4
                          ? ".96"
                          : "1",
                    }}
                  >
                    Create Project
                  </div>
                  {frame >= CLIENT && frame < CLIENT_OPTION && (
                    <Menu
                      y={234}
                      items={["Aperture Coffee", "Orbit Labs", "Field Notes"]}
                      at={CLIENT}
                    />
                  )}
                  {frame >= TEMPLATE && frame < TEMPLATE_OPTION && (
                    <Menu
                      y={410}
                      items={[
                        "Relay Default Workflow",
                        "YouTube Video",
                        "Instagram Reel",
                      ]}
                      at={TEMPLATE}
                    />
                  )}
                </div>
              )}
              <Cursor
                path={[
                  { f: beat(4.5), ...QUICK_CREATE },
                  { f: beat(5.75), ...targets.name },
                  { f: beat(7.5), ...targets.name },
                  { f: beat(8.75), ...targets.client },
                  { f: beat(9.5), ...targets.client },
                  { f: beat(10.75), ...targets.clientOption },
                  { f: beat(11.5), ...targets.clientOption },
                  { f: beat(12.75), ...targets.template },
                  { f: beat(13.5), ...targets.template },
                  { f: beat(14.75), ...targets.templateOption },
                  { f: beat(15.5), ...targets.templateOption },
                  { f: beat(16.75), ...targets.create },
                  { f: beat(17.5), ...targets.create },
                  { f: beat(20), x: 1140, y: 850 },
                ]}
                clicks={[
                  CLIENT,
                  CLIENT_OPTION,
                  TEMPLATE,
                  TEMPLATE_OPTION,
                  CREATE,
                ]}
              />
            </>
          }
        >
          <DashboardContent settled newRow={reveal(frame, CREATE + 14, 12)} />
        </AppWindow>
      </Camera>
      <Sfx at={0} kind="whoosh" />
      {[CLIENT, CLIENT_OPTION, TEMPLATE, TEMPLATE_OPTION, CREATE].map((at) => (
        <Sfx key={at} at={at} kind="click" />
      ))}
      <Sfx at={TEMPLATE_OPTION} kind="switch" />
      <Sfx at={CREATE} kind="switch" />
    </AbsoluteFill>
  );
};

/** Light-theme form control; geometry is shared with cursor targets. */
const Field: React.FC<{
  y: number;
  label: string;
  children: ReactNode;
  x?: number;
  width?: number;
  dropdown?: boolean;
  trailing?: ReactNode;
}> = ({
  y,
  label,
  children,
  x = 32,
  width = 596,
  dropdown = false,
  trailing,
}) => (
  <>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 24,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: 42,
        padding: "0 13px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 17,
        border: `1px solid ${colors.strong}`,
        borderRadius: 6,
      }}
    >
      {children}
      <span style={{ marginLeft: "auto", display: "flex" }}>
        {dropdown ? <ChevronDown size={17} /> : trailing}
      </span>
    </div>
  </>
);
/** The app uses square menu rows, with no animated hover decoration. */
const Menu: React.FC<{ y: number; items: readonly string[]; at: number }> = ({
  y,
  items,
  at,
}) => {
  const frame = useCurrentFrame();
  const p = reveal(frame, at, 7);
  return (
    <div
      style={{
        position: "absolute",
        left: 32,
        top: y,
        width: 596,
        padding: 5,
        boxSizing: "border-box",
        fontSize: 17,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        background: colors.panel,
        boxShadow: "0 18px 50px rgba(24,24,27,.16)",
        zIndex: 4,
        opacity: p,
        transformOrigin: "top left",
        scale: String(0.98 + p * 0.02),
      }}
    >
      {items.map((item) => (
        <div
          key={item}
          style={{
            height: 43,
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

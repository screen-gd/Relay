import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeCam } from "../anim";
import { AppWindow, QUICK_CREATE } from "../app-ui";
import { sceneBeat, TITLE_OUT, UI_START, UI_IN } from "../beats";
import { GridAssemble, TitleCard } from "../motion";
import {
  Backdrop,
  Camera,
  Cursor,
  entrance,
  FocusTrack,
  Sfx,
  useShots,
} from "../primitives";
import { CONTENT } from "../theme";
import { DashboardContent } from "./DashboardContent";

const beat = (n: number) => sceneBeat("dashboard", n);

// Dashboard geometry in window coordinates (see DashboardContent layout).
const METRICS = {
  x: CONTENT.x + 32,
  y: CONTENT.y + 96,
  w: CONTENT.width - 64,
  h: 96,
};
const CLICK = beat(11);

/**
 * Title card, then the whole dashboard rises in at full size. The focus light
 * picks out the metrics before the cursor opens Quick create.
 */
export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useShots(
    [
      ...entrance({ fx: 800, fy: 480, scale: 1.02 }, UI_START, UI_IN),
      { f: beat(7), fx: 800, fy: 476, scale: 1.04 },
      { f: beat(8), fx: 730, fy: 610, scale: 1.22 },
      { f: beat(9.5), fx: 734, fy: 615, scale: 1.24 },
      { f: beat(10.75), fx: 1380, fy: 110, scale: 1.85 },
      { f: beat(12), fx: 1400, fy: 104, scale: 1.88 },
    ],
    easeCam
  );

  return (
    <AbsoluteFill>
      <Backdrop />
      <TitleCard
        line="Your week, in view."
        graphic={<GridAssemble start={beat(0.5)} />}
        out={TITLE_OUT}
      />
      <Camera {...camera}>
        <AppWindow
          url="workrelay.dev"
          page="Dashboard"
          active="dashboard"
          quickCreatePressed={frame >= CLICK - 2 && frame <= CLICK + 5}
          overlay={
            <>
              <FocusTrack
                stops={[
                  { f: beat(6), ...METRICS, amount: 0 },
                  { f: beat(6.5), ...METRICS, amount: 1 },
                  { f: beat(7), ...METRICS, amount: 1 },
                  { f: beat(7.5), ...METRICS, amount: 0 },
                ]}
              />
              <Cursor
                path={[
                  { f: beat(9.25), x: 1060, y: 560 },
                  {
                    f: beat(10.75),
                    x: QUICK_CREATE.x - 8,
                    y: QUICK_CREATE.y + 4,
                  },
                  { f: beat(12), x: QUICK_CREATE.x - 8, y: QUICK_CREATE.y + 4 },
                ]}
                clicks={[CLICK]}
              />
            </>
          }
        >
          <DashboardContent delay={beat(5)} />
        </AppWindow>
      </Camera>
      <Sfx at={0} kind="whoosh" />
      <Sfx at={CLICK} kind="click" />
    </AbsoluteFill>
  );
};

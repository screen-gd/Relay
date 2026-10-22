import { Composition, Folder } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { sceneFrames, TOTAL_FRAMES } from "./launch/beats";
import { RelayLaunch } from "./launch/RelayLaunch";
import { BoardScene } from "./launch/scenes/BoardScene";
import { CreateScene } from "./launch/scenes/CreateScene";
import { DashboardScene } from "./launch/scenes/DashboardScene";
import { IntroScene } from "./launch/scenes/IntroScene";
import { MoneyScene } from "./launch/scenes/MoneyScene";
import { OutroScene } from "./launch/scenes/OutroScene";
import { ReviewScene } from "./launch/scenes/ReviewScene";
import { VIDEO } from "./launch/theme";
import type { HelloWorldProps } from "./types";

const defaultProps: HelloWorldProps = {
  titleText: "Hello from Electron",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RelayLaunch"
        component={RelayLaunch}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Folder name="RelayScenes">
        <Composition
          id="Intro"
          component={IntroScene}
          durationInFrames={sceneFrames("intro")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
        <Composition
          id="Dashboard"
          component={DashboardScene}
          durationInFrames={sceneFrames("dashboard")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
        <Composition
          id="NewProject"
          component={CreateScene}
          durationInFrames={sceneFrames("create")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
        <Composition
          id="Board"
          component={BoardScene}
          durationInFrames={sceneFrames("board")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
        <Composition
          id="ClientReview"
          component={ReviewScene}
          durationInFrames={sceneFrames("review")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
        <Composition
          id="Money"
          component={MoneyScene}
          durationInFrames={sceneFrames("money")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ ending: "payment" as const }}
        />
        <Composition
          id="MoneySalaryEnding"
          component={MoneyScene}
          durationInFrames={sceneFrames("money")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ ending: "salary" as const }}
        />
        <Composition
          id="Outro"
          component={OutroScene}
          durationInFrames={sceneFrames("outro")}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
      </Folder>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={120}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultProps}
      />
    </>
  );
};

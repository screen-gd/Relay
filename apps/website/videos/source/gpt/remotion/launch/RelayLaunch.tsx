import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BAR, MUSIC_TRIM, sceneFrames, TOTAL_FRAMES } from "./beats";
import { BoardScene } from "./scenes/BoardScene";
import { CreateScene } from "./scenes/CreateScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { IntroScene } from "./scenes/IntroScene";
import { MoneyScene } from "./scenes/MoneyScene";
import { OutroScene } from "./scenes/OutroScene";
import { ReviewScene } from "./scenes/ReviewScene";
import {
  sceneTransition,
  TRANSITION_FRAMES,
  transitionTiming,
} from "./transitions";
import { Backdrop } from "./primitives";

// Each scene runs TRANSITION_FRAMES past its bar line so the next scene still starts on the beat.
const T = TRANSITION_FRAMES;

/**
 * Relay launch film. Scenes start on bar lines of the soundtrack and hand over
 * with lift / push / settle transitions; `beats.ts` holds the grid and scene lengths.
 */
export const RelayLaunch: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence
          name="Intro"
          durationInFrames={sceneFrames("intro") + T}
          premountFor={fps}
        >
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("lift")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="Dashboard"
          durationInFrames={sceneFrames("dashboard") + T}
          premountFor={fps}
        >
          <DashboardScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("push")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="New project"
          durationInFrames={sceneFrames("create") + T}
          premountFor={fps}
        >
          <CreateScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("lift")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="Board"
          durationInFrames={sceneFrames("board") + T}
          premountFor={fps}
        >
          <BoardScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("push")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="Client review"
          durationInFrames={sceneFrames("review") + T}
          premountFor={fps}
        >
          <ReviewScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("lift")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="Money"
          durationInFrames={sceneFrames("money") + T}
          premountFor={fps}
        >
          <MoneyScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={sceneTransition("settle")}
          timing={transitionTiming}
        />
        <TransitionSeries.Sequence
          name="Outro"
          durationInFrames={sceneFrames("outro")}
          premountFor={fps}
        >
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        name="Soundtrack"
        src={staticFile("audio/close-up.mp3")}
        trimBefore={MUSIC_TRIM}
        volume={interpolate(
          frame,
          [0, 8, TOTAL_FRAMES - BAR, TOTAL_FRAMES - 4],
          [0, 0.85, 0.85, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        )}
      />
    </>
  );
};

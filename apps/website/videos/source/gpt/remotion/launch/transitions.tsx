import {
  linearTiming,
  type TransitionPresentation,
  type TransitionPresentationComponentProps,
} from "@remotion/transitions";
import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import { easeCam } from "./anim";

/**
 * Scene-to-scene moves.
 * - lift: the outgoing scene becomes a card and slides up, revealing the next one underneath.
 * - push: the next scene slides in from the right as a card while the old one recedes left.
 * - settle: the outgoing scene shrinks back and fades while the next one settles in.
 */
export type TransitionKind = "lift" | "push" | "settle";

type Props = { kind: TransitionKind };

const cardShadow = (amount: number) =>
  `0 50px 140px -30px rgba(24,24,27,${0.35 * amount})`;

const Presentation: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const p = easeCam(presentationProgress);
  const exiting = presentationDirection === "exiting";
  const styles: Record<
    TransitionKind,
    { exit: CSSProperties; enter: CSSProperties }
  > = {
    lift: {
      exit: {
        translate: `0 ${-p * 108}%`,
        scale: String(1 - 0.08 * p),
        borderRadius: 56 * Math.min(1, p * 4),
        boxShadow: cardShadow(Math.min(1, p * 4)),
        zIndex: 2,
      },
      enter: { scale: String(1.08 - 0.08 * p), zIndex: 1 },
    },
    push: {
      exit: {
        translate: `${-28 * p}% 0`,
        scale: String(1 - 0.06 * p),
        zIndex: 1,
      },
      enter: {
        translate: `${(1 - p) * 104}% 0`,
        scale: String(0.94 + 0.06 * p),
        borderRadius: 56 * Math.min(1, (1 - p) * 4),
        boxShadow: cardShadow(Math.min(1, (1 - p) * 4)),
        zIndex: 2,
      },
    },
    // Sequential, so the two scenes never double-expose.
    settle: {
      exit: {
        scale: String(1 - 0.12 * p),
        opacity: 1 - Math.min(1, p * 2),
        borderRadius: 56 * Math.min(1, p * 4),
        boxShadow: cardShadow(Math.min(1, p * 4)),
        zIndex: 2,
      },
      enter: {
        scale: String(1.05 - 0.05 * p),
        opacity: Math.max(0, p * 2 - 1),
        zIndex: 1,
      },
    },
  };
  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        ...(exiting
          ? styles[passedProps.kind].exit
          : styles[passedProps.kind].enter),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const sceneTransition = (
  kind: TransitionKind
): TransitionPresentation<Props> => ({
  component: Presentation,
  props: { kind },
});

/** Transition length in frames. Each one starts on a bar line. */
export const TRANSITION_FRAMES = 16;
export const transitionTiming = linearTiming({
  durationInFrames: TRANSITION_FRAMES,
});

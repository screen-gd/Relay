"use client";

/**
 * Multi-step container adapted from the React Bits Stepper
 * (https://reactbits.dev/components/stepper, `@react-bits/Stepper-TS-TW`).
 *
 * Differences from the registry version:
 * - Controlled: the parent owns `step` so it can branch, gate, and resume.
 * - Uses Relay tokens and the owned `Button` instead of fixed colors.
 * - Content height follows a ResizeObserver, so errors or conditional fields
 *   inside a step resize the panel.
 * - Respects reduced motion.
 */

import {
  Children,
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { Button } from "@/components/ui/button";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StepperProps = {
  children: ReactNode;
  /** Current step, 1-based. */
  step: number;
  onStepChange: (step: number) => void;
  /** Called by the primary button on the last step. */
  onComplete: () => void;
  /** Disables the primary button, e.g. until a required choice is made. */
  canContinue?: boolean;
  nextLabel?: string;
  completeLabel?: string;
  backLabel?: string;
  /** Hides Back on steps where returning makes no sense. */
  hideBack?: boolean;
  className?: string;
};

export function Stepper({
  children,
  step,
  onStepChange,
  onComplete,
  canContinue = true,
  nextLabel = "Continue",
  completeLabel = "Finish",
  backLabel = "Back",
  hideBack = false,
  className,
}: StepperProps) {
  const reduceMotion = useHydratedReducedMotion();
  const steps = Children.toArray(children);
  const total = steps.length;
  const current = Math.min(Math.max(step, 1), total);
  const isLast = current === total;
  const [direction, setDirection] = useState(1);

  function goTo(next: number) {
    setDirection(next > current ? 1 : -1);
    onStepChange(next);
  }

  return (
    <div data-slot="stepper" className={cn("flex flex-col", className)}>
      <ol aria-label="Setup progress" className="flex items-center">
        {steps.map((_, index) => {
          const number = index + 1;
          const status =
            number === current
              ? "active"
              : number < current
                ? "complete"
                : "inactive";
          return (
            <Fragment key={number}>
              <li className="shrink-0">
                <StepIndicator
                  number={number}
                  status={status}
                  reduceMotion={reduceMotion}
                  onSelect={
                    status === "complete" ? () => goTo(number) : undefined
                  }
                />
              </li>
              {number < total ? (
                <StepConnector
                  complete={current > number}
                  reduceMotion={reduceMotion}
                />
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <StepContent
        stepKey={current}
        direction={direction}
        reduceMotion={reduceMotion}
      >
        {steps[current - 1]}
      </StepContent>

      <div className="mt-6 flex items-center justify-between gap-3">
        {current > 1 && !hideBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => goTo(current - 1)}
          >
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => (isLast ? onComplete() : goTo(current + 1))}
        >
          {isLast ? completeLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}

/** One step's body. Children of `Stepper` are rendered one at a time. */
export function Step({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: number) => ({
    x: direction >= 0 ? "50%" : "-50%",
    opacity: 0,
  }),
};

function StepContent({
  stepKey,
  direction,
  reduceMotion,
  children,
}: {
  stepKey: number;
  direction: number;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const [height, setHeight] = useState<number | "auto">("auto");

  return (
    <motion.div
      className="relative mt-6 overflow-hidden"
      animate={{ height }}
      transition={
        reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.4 }
      }
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <SlideTransition
          key={stepKey}
          direction={direction}
          reduceMotion={reduceMotion}
          onHeight={setHeight}
        >
          {children}
        </SlideTransition>
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  direction,
  reduceMotion,
  onHeight,
  children,
}: {
  direction: number;
  reduceMotion: boolean;
  onHeight: (height: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    onHeight(node.offsetHeight);
    const observer = new ResizeObserver(() => onHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeight]);

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
      // Absolute so the entering and exiting steps overlap during the slide.
      className="absolute inset-x-0 top-0"
    >
      {children}
    </motion.div>
  );
}

function StepIndicator({
  number,
  status,
  reduceMotion,
  onSelect,
}: {
  number: number;
  status: "active" | "complete" | "inactive";
  reduceMotion: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!onSelect}
      aria-label={
        status === "complete" ? `Go back to step ${number}` : `Step ${number}`
      }
      aria-current={status === "active" ? "step" : undefined}
      onClick={onSelect}
      className={cn(
        "grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        status === "inactive"
          ? "border border-[var(--app-border)] text-[var(--app-muted)]"
          : "bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
      )}
    >
      {status === "complete" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="size-3.5"
        >
          <motion.path
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              delay: 0.1,
              type: "tween",
              ease: "easeOut",
              duration: reduceMotion ? 0 : 0.3,
            }}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : status === "active" ? (
        <span className="size-2 rounded-full bg-[var(--app-accent-foreground)]" />
      ) : (
        number
      )}
    </button>
  );
}

function StepConnector({
  complete,
  reduceMotion,
}: {
  complete: boolean;
  reduceMotion: boolean;
}) {
  return (
    <li
      aria-hidden="true"
      className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded bg-[var(--app-border)]"
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-[var(--app-accent)]"
        initial={false}
        animate={{ width: complete ? "100%" : "0%" }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
      />
    </li>
  );
}

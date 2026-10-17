"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Children, type ReactNode } from "react";

type StepperProps = {
  children: ReactNode;
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  canContinue?: boolean;
  nextLabel?: string;
  completeLabel?: string;
  backLabel?: string;
  hideBack?: boolean;
  className?: string;
};

/** Controlled setup steps. Completed steps remain available for editing. */
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
  const steps = Children.toArray(children);
  const current = Math.min(Math.max(step, 1), steps.length);
  const isLast = current === steps.length;
  return (
    <div data-slot="stepper" className={cn("flex flex-col gap-6", className)}>
      <ol
        aria-label="Setup progress"
        className="flex flex-wrap items-center gap-2"
      >
        {steps.map((_, index) => {
          const number = index + 1;
          return (
            <li key={number}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={number >= current}
                aria-label={
                  number < current
                    ? `Go back to step ${number}`
                    : `Step ${number}`
                }
                aria-current={number === current ? "step" : undefined}
                className={cn(
                  "font-mono",
                  number === current && "bg-[var(--surface-active)]"
                )}
                onClick={() => onStepChange(number)}
              >
                {number}
              </Button>
            </li>
          );
        })}
      </ol>
      <div>{steps[current - 1]}</div>
      <div className="flex items-center justify-between gap-3">
        {current > 1 && !hideBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onStepChange(current - 1)}
          >
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => (isLast ? onComplete() : onStepChange(current + 1))}
        >
          {isLast ? completeLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}
export function Step({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

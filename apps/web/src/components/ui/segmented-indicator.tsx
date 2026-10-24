"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { segmentedSelectionClassName } from "./segmented";

/** Follows the selected link/tab/toggle, including keyboard and route changes. */
export function SegmentedIndicator() {
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const track = indicator?.parentElement;
    if (!indicator || !track) return;

    let frame: number | undefined;
    let observedTab: HTMLElement | null = null;

    function scheduleMeasure() {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);

    const measure = () => {
      const active = track.querySelector<HTMLElement>(
        ':scope > [data-segmented-item]:is([data-state="active"], [data-state="on"], [aria-current="page"], [aria-pressed="true"])'
      );
      if (observedTab !== active) {
        if (observedTab) resizeObserver?.unobserve(observedTab);
        if (active) resizeObserver?.observe(active);
        observedTab = active;
      }

      if (!active || !active.offsetWidth || !active.offsetHeight) {
        indicator.hidden = true;
        delete track.dataset.segmentedReady;
        return;
      }

      // Offset coordinates stay correct inside a scrolled or RTL tab list.
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.hidden = false;
      track.dataset.segmentedReady = "true";
    };

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(track, {
      attributes: true,
      attributeFilter: ["data-state", "aria-current", "aria-pressed"],
      childList: true,
      characterData: true,
      subtree: true,
    });
    resizeObserver?.observe(track);
    window.addEventListener("resize", scheduleMeasure);
    measure();

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      delete track.dataset.segmentedReady;
    };
  }, []);

  return (
    <span
      ref={indicatorRef}
      data-slot="segmented-indicator"
      aria-hidden="true"
      hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-0 transition-[transform,width,height] duration-(--dur-base) ease-(--ease-step) motion-reduce:transition-none",
        segmentedSelectionClassName
      )}
    />
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  playDemoTimeline,
  type DemoClock,
  type DemoTimeline,
} from "@/lib/marketing/demo-timeline";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

const BROWSER_CLOCK: DemoClock<number> = {
  now: () => performance.now(),
  setTimer: (run, delayMs) => window.setTimeout(run, delayMs),
  clearTimer: (timer) => window.clearTimeout(timer),
};

/** Steps the frame at each change in the timeline, and keeps its place when paused. */
export function useDemoFrame<F>(timeline: DemoTimeline<F>, running: boolean): F {
  const [frame, setFrame] = useState(() => timeline.frameAt(0));
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const stop = playDemoTimeline(timeline, BROWSER_CLOCK, elapsedRef.current, setFrame);
    return () => {
      elapsedRef.current = stop();
    };
  }, [running, timeline]);

  return frame;
}

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import {
  DEMO_CONTROLS,
  DEMO_STILL_AT_MS,
  playDemoTimeline,
  type DemoBaseState,
  type DemoClock,
  type DemoStep,
  type DemoTimeline,
} from "@/lib/marketing/demo-timeline";
import { cn } from "@/lib/utils";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
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
function useDemoFrame<F>(timeline: DemoTimeline<F>, running: boolean): F {
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

/**
 * The phone, caption, and controls every marketing demo shares. The demo
 * supplies its timeline and draws the screen for a frame.
 *
 * The loop pauses off screen and on request, and shows one still frame when
 * the visitor prefers reduced motion.
 */
export function DemoShell<F extends DemoBaseState>({
  timeline,
  steps,
  alt,
  note,
  tone = "light",
  className,
  children,
}: {
  timeline: DemoTimeline<F>;
  /** Three captions, one per step of the story. */
  steps: readonly DemoStep[];
  /** What the illustration shows, for screen readers. */
  alt: string;
  /** The line under the phone that says this is an illustration. */
  note: string;
  tone?: "light" | "dark";
  className?: string;
  children: (frame: F) => ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Wait until a good part of the phone is on screen so nobody joins mid-story.
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const live = useDemoFrame(timeline, inView && !paused && !reducedMotion);
  const still = useMemo(() => timeline.frameAt(DEMO_STILL_AT_MS), [timeline]);
  const frame = reducedMotion ? still : live;
  const step = steps[frame.step];
  const onDark = tone === "dark";

  return (
    <div ref={rootRef} className={cn("flex flex-col items-center", className)}>
      <div role="img" aria-label={alt}>
        <div
          aria-hidden="true"
          className="w-[288px] select-none rounded-[2.25rem] bg-slate-900 p-2 shadow-2xl ring-1 ring-white/15"
        >
          <div className="relative h-[436px] overflow-hidden rounded-[1.75rem] bg-warm-50 text-left">
            <div
              className={cn(
                "h-full transition-opacity duration-300",
                frame.resetting ? "opacity-0" : "opacity-100",
              )}
            >
              {children(frame)}
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="mt-5 flex h-11 flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {steps.map((item, index) => (
            <span
              key={item.label}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === frame.step
                  ? "w-6 bg-emerald"
                  : onDark
                    ? "w-1.5 bg-white/20"
                    : "w-1.5 bg-warm-200",
              )}
            />
          ))}
        </div>
        <p
          key={step.label}
          className={cn(
            "whitespace-nowrap font-display text-sm font-semibold",
            onDark ? "text-white" : "text-text-primary",
          )}
          style={{ animation: "fade-up 300ms ease-out" }}
        >
          {step.label}{" "}
          <span className={cn("font-body font-normal", onDark ? "text-slate-400" : "text-text-secondary")}>
            {step.detail}
          </span>
        </p>
      </div>

      <div className="mt-3 flex max-w-[288px] items-start gap-2.5">
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? DEMO_CONTROLS.play : DEMO_CONTROLS.pause}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
              onDark
                ? "border-white/15 text-slate-300 hover:border-white/40 hover:text-white"
                : "border-warm-200 text-text-secondary hover:border-emerald hover:text-emerald",
            )}
          >
            {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          </button>
        )}
        <p
          className={cn(
            "pt-1.5 font-body text-[11px] leading-relaxed",
            onDark ? "text-slate-500" : "text-text-muted",
          )}
        >
          {note}
        </p>
      </div>
    </div>
  );
}

/** Dims the screen behind a sheet. */
export function DemoBackdrop({ open }: { open: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-black/40 transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

/** A value that pops when it changes, like the app's count-up. */
export function DemoValue({ value, className }: { value: string; className?: string }) {
  return (
    <span key={value} className={cn("inline-block tabular-nums", className)} style={{ animation: "count-up 400ms ease-out" }}>
      {value}
    </span>
  );
}

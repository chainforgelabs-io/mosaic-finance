"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Delete, Flame, Landmark, Pause, Play, Wallet, X } from "lucide-react";
import { getScoreColor } from "@/components/app/HealthScore";
import { GUARANTEE_ACTIONS } from "@/lib/config/offer";
import {
  LOOP_DEMO_ALT,
  LOOP_DEMO_CONTROLS,
  LOOP_DEMO_DURATION_MS,
  LOOP_DEMO_NOTE,
  LOOP_DEMO_STILL_AT_MS,
  loopDemoFrame,
  msUntilLoopDemoChange,
  type LoopDemoFrame,
} from "@/lib/marketing/loop-demo";
import { formatAmountInput } from "@/lib/tracking/cash-capture";
import { SPENDING_CATEGORY_LABELS } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const STILL_FRAME = loopDemoFrame(LOOP_DEMO_STILL_AT_MS);

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;
const MODES = ["Out", "In", "Save"] as const;
const CHIPS = [
  SPENDING_CATEGORY_LABELS.groceries,
  SPENDING_CATEGORY_LABELS.dining,
  SPENDING_CATEGORY_LABELS.health,
] as const;

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

/** Steps the frame at each change in the timeline, and keeps its place when paused. */
function useLoopDemoFrame(running: boolean): LoopDemoFrame {
  const [frame, setFrame] = useState(() => loopDemoFrame(0));
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now() - elapsedRef.current;
    const elapsed = () => (performance.now() - startedAt) % LOOP_DEMO_DURATION_MS;
    let timer = 0;

    const schedule = () => {
      timer = window.setTimeout(() => {
        const now = elapsed();
        elapsedRef.current = now;
        setFrame(loopDemoFrame(now));
        schedule();
      }, msUntilLoopDemoChange(elapsed()));
    };
    schedule();

    return () => {
      window.clearTimeout(timer);
      elapsedRef.current = elapsed();
    };
  }, [running]);

  return frame;
}

/**
 * Looping illustration of the weekly loop: log a spend, snapshot net worth,
 * watch the Score. Not a user's data. Pauses off screen and on request, and
 * shows one still frame when the visitor prefers reduced motion.
 */
export function LoopDemo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Wait until most of the phone is on screen so nobody joins mid-keypad.
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const live = useLoopDemoFrame(inView && !paused && !reducedMotion);
  const frame = reducedMotion ? STILL_FRAME : live;
  const action = GUARANTEE_ACTIONS[frame.step];
  const onDark = tone === "dark";

  return (
    <div ref={rootRef} className={cn("flex flex-col items-center", className)}>
      <div role="img" aria-label={LOOP_DEMO_ALT}>
        <div
          aria-hidden="true"
          className="w-[288px] select-none rounded-[2.25rem] bg-slate-900 p-2 shadow-2xl ring-1 ring-white/15"
        >
          <div className="relative h-[436px] overflow-hidden rounded-[1.75rem] bg-warm-50">
            <div
              className={cn(
                "h-full transition-opacity duration-300",
                frame.resetting ? "opacity-0" : "opacity-100",
              )}
            >
              <DemoDashboard frame={frame} />
              <div
                className={cn(
                  "absolute inset-0 bg-black/40 transition-opacity duration-300",
                  frame.sheetOpen ? "opacity-100" : "opacity-0",
                )}
              />
              <DemoSheet frame={frame} />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="mt-5 flex h-11 flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {GUARANTEE_ACTIONS.map((item, index) => (
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
          key={action.label}
          className={cn(
            "font-display text-sm font-semibold",
            onDark ? "text-white" : "text-text-primary",
          )}
          style={{ animation: "fade-up 300ms ease-out" }}
        >
          {action.label}{" "}
          <span className={cn("font-body font-normal", onDark ? "text-slate-400" : "text-text-secondary")}>
            {action.cadence}
          </span>
        </p>
      </div>

      <div className="mt-3 flex max-w-[288px] items-start gap-2.5">
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? LOOP_DEMO_CONTROLS.play : LOOP_DEMO_CONTROLS.pause}
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
          {LOOP_DEMO_NOTE}
        </p>
      </div>
    </div>
  );
}

function DemoDashboard({ frame }: { frame: LoopDemoFrame }) {
  return (
    <div className="px-3 pt-4">
      <p className="px-1 font-body text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald">
        This week
      </p>
      <div className="mt-2 rounded-xl border border-warm-200 bg-white p-3">
        <div className="flex flex-col items-center">
          <DemoRing score={frame.score} />
          <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Health Score
          </p>
        </div>

        <div className="mt-3 space-y-2">
          <DemoStat
            icon={Wallet}
            label="Spent this week"
            value={formatMoneyExact(frame.spent)}
            detail={frame.logged ? "Logged" : "Nothing logged yet"}
            active={frame.logged}
          />
          <DemoStat
            icon={Flame}
            label="Weekly log"
            value={`${frame.weeks} weeks`}
            detail={frame.logged ? "Done this week" : "Not yet this week"}
            active={frame.logged}
          />
          <DemoStat
            icon={Landmark}
            label="Net worth snapshot"
            value={frame.snapshotSaved ? "Saved" : "Due"}
            detail={frame.snapshotSaved ? "Saved this month" : "Due this month"}
            active={frame.snapshotSaved}
            pressed={frame.pressed === "snapshot"}
          />
        </div>

        <div
          className={cn(
            "mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald font-display text-[13px] font-semibold text-white transition-transform duration-200",
            frame.pressed === "log" && "scale-[0.96] bg-emerald-dark",
          )}
        >
          {frame.logged ? "Add another spend" : "Log this week"}
          <ArrowRight className="size-3.5" />
        </div>
      </div>
    </div>
  );
}

function DemoRing({ score }: { score: number }) {
  const size = 92;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--warm-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (score / 100) * circumference}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <span
        key={score}
        className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold tabular-nums"
        style={{ color, animation: "count-up 400ms ease-out" }}
      >
        {score}
      </span>
    </div>
  );
}

function DemoStat({
  icon: Icon,
  label,
  value,
  detail,
  active,
  pressed = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  active: boolean;
  pressed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg bg-warm-50 px-3 py-2 transition-[transform,box-shadow] duration-200",
        pressed && "scale-[0.97] ring-2 ring-emerald/50",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("size-3 shrink-0", active ? "text-emerald" : "text-text-muted")} />
          <p className="whitespace-nowrap font-body text-[10px] font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
        </div>
        <p className="mt-0.5 font-body text-[11px] text-text-muted">{detail}</p>
      </div>
      <p
        key={value}
        className="shrink-0 font-display text-base font-bold tabular-nums text-text-primary"
        style={{ animation: "count-up 400ms ease-out" }}
      >
        {value}
      </p>
    </div>
  );
}

function DemoSheet({ frame }: { frame: LoopDemoFrame }) {
  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-2 rounded-2xl bg-warm-50 p-3 shadow-xl transition-transform duration-300 ease-out",
        frame.sheetOpen ? "translate-y-0" : "translate-y-[110%]",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-text-primary">Log this week</p>
        <X className="size-4 text-text-muted" />
      </div>

      <div className="mb-2 flex rounded-full border border-warm-200 bg-white p-0.5">
        {MODES.map((mode, index) => (
          <span
            key={mode}
            className={cn(
              "flex-1 rounded-full py-1 text-center font-display text-[11px] font-semibold",
              index === 0 ? "bg-slate-950 text-white" : "text-text-secondary",
            )}
          >
            {mode}
          </span>
        ))}
      </div>

      <div className="mb-2 flex gap-1 whitespace-nowrap">
        {CHIPS.map((chip, index) => (
          <span
            key={chip}
            className={cn(
              "rounded-full bg-slate-950 px-2 py-1.5 font-display text-[11px] font-semibold text-white transition-[transform,box-shadow] duration-200",
              index === 0 && frame.pressed === "category" && "scale-[0.94] ring-2 ring-emerald",
            )}
          >
            {chip}
          </span>
        ))}
        <span className="rounded-full border border-warm-200 bg-white px-2 py-1.5 font-display text-[11px] font-semibold text-text-secondary">
          More
        </span>
      </div>

      <div className="rounded-xl border border-warm-200 bg-white p-2.5">
        <p className="text-center font-display text-2xl font-bold tabular-nums text-text-primary">
          ${formatAmountInput(frame.digits)}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {PAD_KEYS.map((key) =>
            key === "" ? (
              <span key="spacer" />
            ) : (
              <span
                key={key}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg font-display text-sm font-semibold text-text-primary transition-colors duration-150",
                  frame.pressedKey === key ? "bg-emerald-soft" : "bg-warm-100",
                )}
              >
                {key === "back" ? <Delete className="size-4" /> : key}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

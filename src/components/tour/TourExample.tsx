"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { useDemoFrame, useReducedMotion } from "@/components/marketing/demo-playback";
import { DEMO_CONTROLS, DEMO_STILL_AT_MS, type DemoBaseState, type DemoStep, type DemoTimeline } from "@/lib/marketing/demo-timeline";
import {
  CHECK_IN_DEMO_STEPS,
  CHECK_IN_DEMO_TIMELINE,
  CHECK_IN_NOTE,
  LOG_DEMO_STEPS,
  LOG_DEMO_TIMELINE,
  PLAN_DEMO_STEPS,
  PLAN_DEMO_TIMELINE,
  TOGETHER_DEMO_STEPS,
  TOGETHER_DEMO_TIMELINE,
  TOGETHER_NOTE,
  TOUR_LOG_BUDGET,
  TOUR_PLAN_MONTHS,
  TOUR_PLAN_NOTE,
  TOUR_LOG_NOTE,
  type CheckInDemoFrame,
  type LogDemoFrame,
  type PlanDemoFrame,
  type TogetherDemoFrame,
} from "@/lib/onboarding/tour-demos";
import type { TourDemoId } from "@/lib/onboarding/tour";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";

function Playing<F extends DemoBaseState>({
  timeline,
  steps,
  note,
  children,
}: {
  timeline: DemoTimeline<F>;
  steps: readonly DemoStep[];
  note: string;
  children: (frame: F) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const live = useDemoFrame(timeline, !paused && !reduced);
  const still = useMemo(() => timeline.frameAt(DEMO_STILL_AT_MS), [timeline]);
  const frame = reduced ? still : live;
  const step = steps[frame.step];

  return (
    <div className="mt-3">
      <div aria-hidden="true" className={frame.resetting ? "opacity-0 transition-opacity" : "opacity-100 transition-opacity"}>
        {children(frame)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? DEMO_CONTROLS.play : DEMO_CONTROLS.pause}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--warm-200)] text-[var(--text-secondary)]"
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
        )}
        <p className="min-w-0 font-body text-[11px] text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{step.label}.</span> {step.detail}
        </p>
      </div>
      <p className="mt-1 font-body text-[10px] leading-relaxed text-[var(--text-muted)]">{note}</p>
    </div>
  );
}

function money(amount: number): string {
  return formatMoney(amount);
}

function PlanGrid({ frame }: { frame: PlanDemoFrame }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--warm-200)] bg-white text-left">
      <div className="grid grid-cols-5 bg-[var(--warm-50)] px-2 py-1 font-body text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
        <span />
        {TOUR_PLAN_MONTHS.map((month) => (
          <span key={month} className="text-right">{month}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 items-center border-t border-[var(--warm-100)] bg-[rgba(16,185,129,0.08)] px-2 py-1.5 font-body text-[11px]">
        <span className="font-semibold text-[var(--text-primary)]">Paycheque</span>
        {frame.months.map((amount, index) => (
          <span key={TOUR_PLAN_MONTHS[index]} className="text-right font-semibold tabular-nums text-[var(--emerald-dark)]">
            {money(amount)}
          </span>
        ))}
      </div>
      {frame.groceries != null && (
        <div className="grid grid-cols-5 items-center border-t border-[var(--warm-100)] bg-[rgba(239,68,68,0.06)] px-2 py-1.5 font-body text-[11px]">
          <span className="font-semibold text-[var(--text-primary)]">Groceries</span>
          {TOUR_PLAN_MONTHS.map((month) => (
            <span key={month} className="text-right tabular-nums text-[var(--error)]">{money(frame.groceries ?? 0)}</span>
          ))}
        </div>
      )}
      <p className="border-t border-[var(--warm-100)] px-2 py-1 font-body text-[10px] tabular-nums text-[var(--text-secondary)]">
        Left to allocate {money(frame.left)}
      </p>
    </div>
  );
}

function LogCard({ frame }: { frame: LogDemoFrame }) {
  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-2.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-bold tabular-nums text-[var(--text-primary)]">${frame.amount}</p>
        <span
          className={
            frame.chosen
              ? "rounded-full bg-[var(--emerald)] px-2 py-1 font-display text-[10px] font-semibold text-white"
              : "rounded-full border border-[var(--warm-200)] px-2 py-1 font-display text-[10px] font-semibold text-[var(--text-secondary)]"
          }
        >
          Groceries
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--warm-100)]">
        <div className="h-full rounded-full bg-[var(--emerald)] transition-all duration-500" style={{ width: `${frame.bar}%` }} />
      </div>
      <p className="mt-1 font-body text-[10px] tabular-nums text-[var(--text-secondary)]">
        {formatMoneyExact(frame.spent)} of {money(TOUR_LOG_BUDGET)} this month · {formatMoneyExact(frame.left)} left
      </p>
    </div>
  );
}

function CheckInCard({ frame }: { frame: CheckInDemoFrame }) {
  return (
    <div className="rounded-lg bg-[#0f1923] p-3 text-left text-white">
      <p className="font-body text-[9px] uppercase tracking-widest text-white/50">Net worth</p>
      <p className="font-display text-2xl font-bold tabular-nums text-[#10b981]">{money(frame.netWorth)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <p className="font-body text-[10px] text-white/70">Assets {money(frame.assets)}</p>
        <p className="font-body text-[10px] text-white/70">Debts {money(frame.debts)}</p>
      </div>
      <div className="mt-2 flex items-end gap-1">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className="w-2 rounded-sm bg-[#10b981]"
            style={{
              height: index < frame.points ? 8 + index * 4 : 2,
              opacity: index < frame.points ? 1 : 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TogetherCard({ frame }: { frame: TogetherDemoFrame }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-left">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-2">
        <p className="font-body text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Cash Flow</p>
        <p className="mt-1 font-body text-[11px] text-[var(--text-secondary)]">Set aside {money(frame.savings)}</p>
        <p className="font-body text-[11px] text-[var(--text-secondary)]">Paid down {money(frame.paydown)}</p>
      </div>
      <div className="rounded-lg bg-[#0f1923] p-2 text-white">
        <p className="font-body text-[9px] uppercase tracking-wider text-white/50">Next check-in</p>
        <p className="mt-1 font-display text-sm font-bold tabular-nums text-[#10b981]">{money(frame.netWorth)}</p>
        <p className="font-body text-[10px] text-white/60">Debts {money(frame.debts)}</p>
      </div>
    </div>
  );
}

export function TourExample({ demo }: { demo: TourDemoId }) {
  if (demo === "plan") {
    return (
      <Playing timeline={PLAN_DEMO_TIMELINE} steps={PLAN_DEMO_STEPS} note={TOUR_PLAN_NOTE}>
        {(frame) => <PlanGrid frame={frame} />}
      </Playing>
    );
  }
  if (demo === "log") {
    return (
      <Playing timeline={LOG_DEMO_TIMELINE} steps={LOG_DEMO_STEPS} note={TOUR_LOG_NOTE}>
        {(frame) => <LogCard frame={frame} />}
      </Playing>
    );
  }
  if (demo === "check-in") {
    return (
      <Playing timeline={CHECK_IN_DEMO_TIMELINE} steps={CHECK_IN_DEMO_STEPS} note={CHECK_IN_NOTE}>
        {(frame) => <CheckInCard frame={frame} />}
      </Playing>
    );
  }
  return (
    <Playing timeline={TOGETHER_DEMO_TIMELINE} steps={TOGETHER_DEMO_STEPS} note={TOGETHER_NOTE}>
      {(frame) => <TogetherCard frame={frame} />}
    </Playing>
  );
}

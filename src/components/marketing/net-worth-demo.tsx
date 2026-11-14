"use client";

import { useId } from "react";
import { CalendarCheck, Check } from "lucide-react";
import { DemoBackdrop, DemoShell, DemoValue } from "@/components/marketing/demo-shell";
import {
  NET_WORTH_DEMO_ALT,
  NET_WORTH_DEMO_AXIS,
  NET_WORTH_DEMO_HISTORY,
  NET_WORTH_DEMO_NOTE,
  NET_WORTH_DEMO_STEPS,
  NET_WORTH_DEMO_THIS_MONTH,
  NET_WORTH_DEMO_TIMELINE,
  type NetWorthDemoFrame,
} from "@/lib/marketing/net-worth-demo";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

/**
 * Looping illustration of Net Worth: a monthly check-in is saved, the total
 * updates, and the history gains a point. Not a user's data.
 */
export function NetWorthDemo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <DemoShell
      timeline={NET_WORTH_DEMO_TIMELINE}
      steps={NET_WORTH_DEMO_STEPS}
      alt={NET_WORTH_DEMO_ALT}
      note={NET_WORTH_DEMO_NOTE}
      tone={tone}
      className={className}
    >
      {(frame) => (
        <>
          <NetWorthScreen frame={frame} />
          <DemoBackdrop open={frame.sheetOpen} />
          <CheckInSheet frame={frame} />
        </>
      )}
    </DemoShell>
  );
}

function NetWorthScreen({ frame }: { frame: NetWorthDemoFrame }) {
  const { current } = frame;

  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-[15px] font-bold text-text-primary">Net Worth</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-lg bg-emerald px-2.5 py-1.5 font-display text-[10px] font-semibold text-white transition-[transform,box-shadow] duration-200",
            frame.pressed === "checkIn" && "scale-[0.95] ring-4 ring-emerald/30",
          )}
        >
          <CalendarCheck className="size-3" />
          Monthly check-in
        </span>
      </div>

      <div className="mt-2 rounded-xl bg-[#0f1923] px-3 pb-3 pt-3">
        <p className="font-body text-[9px] font-medium uppercase tracking-[0.12em] text-white/60">
          Net Worth
        </p>
        <p className="mt-0.5 leading-none">
          <DemoValue
            value={formatMoney(current.netWorth)}
            className="font-display text-[26px] font-bold leading-none text-white"
          />
        </p>
        <div className="mt-2 h-px w-14 bg-gradient-to-r from-[#c9aa71] to-[#c9aa71]/0" />
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <HeroStat label="Investments" value={formatMoney(current.investments)} color="text-[#10b981]" />
          <HeroStat label="Fixed assets" value={formatMoney(current.fixedAssets)} color="text-[#818cf8]" />
          <HeroStat label="Debts" value={formatMoney(current.debts)} color="text-[#ef4444]" />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-warm-200 bg-white px-3 pb-2 pt-2.5">
        <p className="font-display text-[12px] font-semibold text-text-primary">Net worth history</p>
        <p className="font-body text-[10px] text-text-muted">From your monthly check-ins</p>
        <HistoryChart points={frame.points} />
        <div className="mt-0.5 flex justify-between font-body text-[9px] text-text-muted">
          <span>{NET_WORTH_DEMO_AXIS.start}</span>
          <span>{NET_WORTH_DEMO_AXIS.end}</span>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-2 py-1.5">
      <p className="whitespace-nowrap font-body text-[8.5px] text-white/60">{label}</p>
      <p className="mt-0.5 leading-none">
        <DemoValue
          value={value}
          className={cn("font-display text-[13px] font-bold leading-none", color)}
        />
      </p>
    </div>
  );
}

const CHART = { width: 248, height: 140, padX: 6, padTop: 12, padBottom: 6 } as const;

/** Chart coordinates for every check-in, including the one saved in the demo. */
const CHART_POINTS = (() => {
  const values = NET_WORTH_DEMO_HISTORY.map((snapshot) => snapshot.netWorth);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // Leave room below the lowest point so the area does not look like it starts at zero.
  const floor = low - (high - low) * 0.6;
  const innerWidth = CHART.width - CHART.padX * 2;
  const innerHeight = CHART.height - CHART.padTop - CHART.padBottom;
  return values.map((value, index) => ({
    x: round(CHART.padX + (index / (values.length - 1)) * innerWidth),
    y: round(CHART.padTop + (1 - (value - floor) / (high - floor)) * innerHeight),
  }));
})();

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function linePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function areaPath(points: { x: number; y: number }[]): string {
  const base = CHART.height - CHART.padBottom;
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x} ${base} L${first.x} ${base} Z`;
}

const EARLIER_POINTS = CHART_POINTS.slice(0, -1);
const NEW_POINT = CHART_POINTS[CHART_POINTS.length - 1];
const NEW_SEGMENT = CHART_POINTS.slice(-2);
const NEW_SEGMENT_LENGTH = Math.ceil(
  Math.hypot(NEW_SEGMENT[1].x - NEW_SEGMENT[0].x, NEW_SEGMENT[1].y - NEW_SEGMENT[0].y),
);

function HistoryChart({ points }: { points: number }) {
  const plotted = points >= CHART_POINTS.length;
  const fillId = useId();

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="mt-1 block h-[140px] w-full"
      aria-hidden="true"
    >
      <defs>
        {/* User-space units so both area pieces share one continuous fade. */}
        <linearGradient
          id={fillId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={CHART.padTop}
          x2="0"
          y2={CHART.height - CHART.padBottom}
        >
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((share) => (
        <line
          key={share}
          x1={CHART.padX}
          x2={CHART.width - CHART.padX}
          y1={CHART.height * share}
          y2={CHART.height * share}
          stroke="#f1f0ec"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath(EARLIER_POINTS)} fill={`url(#${fillId})`} />
      <path
        d={areaPath(NEW_SEGMENT)}
        fill={`url(#${fillId})`}
        className="transition-opacity duration-500"
        style={{ opacity: plotted ? 1 : 0, transitionDelay: plotted ? "250ms" : "0ms" }}
      />
      <path
        d={linePath(EARLIER_POINTS)}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={linePath(NEW_SEGMENT)}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={NEW_SEGMENT_LENGTH}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
        style={{ strokeDashoffset: plotted ? 0 : NEW_SEGMENT_LENGTH, opacity: plotted ? 1 : 0 }}
      />
      {EARLIER_POINTS.map((point) => (
        <circle key={point.x} cx={point.x} cy={point.y} r="3" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
      ))}
      <circle
        cx={NEW_POINT.x}
        cy={NEW_POINT.y}
        r="4.5"
        fill="#10b981"
        stroke="#fff"
        strokeWidth="2"
        className="transition-transform duration-300 ease-out"
        style={{
          transform: plotted ? "scale(1)" : "scale(0)",
          transformBox: "fill-box",
          transformOrigin: "center",
          transitionDelay: plotted ? "550ms" : "0ms",
        }}
      />
    </svg>
  );
}

const SUMMARY: { label: string; value: number; tone?: "debt" | "total" }[] = [
  { label: "Investments", value: NET_WORTH_DEMO_THIS_MONTH.investments },
  { label: "Fixed assets", value: NET_WORTH_DEMO_THIS_MONTH.fixedAssets },
  { label: "Debts", value: NET_WORTH_DEMO_THIS_MONTH.debts, tone: "debt" },
  { label: "Net worth", value: NET_WORTH_DEMO_THIS_MONTH.netWorth, tone: "total" },
];

const CHECK_IN_STEPS = 4;

function CheckInSheet({ frame }: { frame: NetWorthDemoFrame }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-4 pt-2.5 shadow-[0_-12px_32px_rgba(15,25,35,0.18)] transition-transform duration-300 ease-out",
        frame.sheetOpen ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto h-1 w-9 rounded-full bg-warm-200" />
      <p className="mt-2.5 font-display text-[14px] font-bold text-text-primary">Monthly check-in</p>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: CHECK_IN_STEPS }, (_, index) => (
          <span key={index} className="h-1 flex-1 rounded-full bg-emerald" />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-warm-200 px-3 py-1">
        {SUMMARY.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-baseline justify-between py-1.5 transition-opacity duration-300",
              row.tone === "total" && "mt-1 border-t border-warm-200 pt-2",
              frame.sheetRows > index ? "opacity-100" : "opacity-0",
            )}
          >
            <span
              className={cn(
                "font-body text-[11.5px]",
                row.tone === "total" ? "font-semibold text-text-primary" : "text-text-secondary",
              )}
            >
              {row.label}
            </span>
            <span
              className={cn(
                "font-display tabular-nums",
                row.tone === "total"
                  ? "text-[15px] font-bold text-text-primary"
                  : "text-[12.5px] font-semibold",
                row.tone === "debt" && "text-red-600",
                !row.tone && "text-text-primary",
              )}
            >
              {formatMoneyExact(row.value)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 font-body text-[10px] leading-snug text-text-muted">
        This saves this month&apos;s snapshot and updates the balances on your overview.
      </p>

      <div className="mt-3 flex gap-2">
        <span className="flex-1 rounded-xl border border-warm-200 py-2 text-center font-display text-[12px] font-semibold text-text-secondary">
          Back
        </span>
        <span
          className={cn(
            "inline-flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald py-2 font-display text-[12px] font-semibold text-white transition-[transform,box-shadow] duration-200",
            frame.pressed === "save" && "scale-[0.96] ring-4 ring-emerald/30",
          )}
        >
          <Check className="size-3.5" />
          Save snapshot
        </span>
      </div>
    </div>
  );
}

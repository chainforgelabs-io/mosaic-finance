"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { DemoShell, DemoValue } from "@/components/marketing/demo-shell";
import {
  REVIEW_DEMO,
  REVIEW_DEMO_ALT,
  REVIEW_DEMO_NOTE,
  REVIEW_DEMO_STEPS,
  REVIEW_DEMO_TIMELINE,
  type ReviewDemoFrame,
} from "@/lib/marketing/review-demo";
import type { CategoryVariance, SavingsRateMode } from "@/lib/tracking/budget-kpis";
import { CATEGORY_KIND_LABELS, labelFor } from "@/lib/tracking/categories";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

const BLANK = "—";
const RATE_MODES: { mode: SavingsRateMode; label: string }[] = [
  { mode: "active", label: "Saved" },
  { mode: "passive", label: "Not spent" },
];

function pct(value: number | null): string {
  return value == null ? BLANK : `${(value * 100).toFixed(1)}%`;
}

/**
 * Looping illustration of the Cash Flow Review: a tracked month, each
 * category against its budget, and the savings rate. Not a user's data.
 */
export function ReviewDemo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <DemoShell
      timeline={REVIEW_DEMO_TIMELINE}
      steps={REVIEW_DEMO_STEPS}
      alt={REVIEW_DEMO_ALT}
      note={REVIEW_DEMO_NOTE}
      tone={tone}
      className={className}
    >
      {(frame) => <ReviewScreen frame={frame} />}
    </DemoShell>
  );
}

function ReviewScreen({ frame }: { frame: ReviewDemoFrame }) {
  const tracked = frame.tiles >= 1;
  const balanced = frame.tiles >= 2;
  const rated = frame.tiles >= 3;

  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-[15px] font-bold text-text-primary">Review</p>
        <span className="inline-flex items-center gap-1 rounded-lg border border-warm-200 bg-white px-2 py-1 font-display text-[10px] font-semibold text-text-primary">
          This month
          <ChevronDown className="size-3 text-text-muted" />
        </span>
      </div>

      <div className="mt-2 rounded-xl border border-warm-200 bg-white px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <TileLabel>Tracked</TileLabel>
          <DemoValue
            value={tracked ? "Complete" : BLANK}
            className="font-display text-sm font-bold text-text-primary"
          />
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-warm-100">
          <div
            className="h-full rounded-full bg-slate-950 transition-[width] duration-700 ease-out"
            style={{ width: tracked ? "100%" : "0%" }}
          />
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Tile
          label="Tracking balance"
          value={balanced ? formatMoney(REVIEW_DEMO.balance) : BLANK}
          tone={balanced ? "good" : undefined}
          hint="Income not yet spent or saved, for this full month."
        />
        <Tile
          label="Savings rate"
          value={rated ? pct(REVIEW_DEMO.rate[frame.rateMode]) : BLANK}
          hint={
            frame.rateMode === "active"
              ? "saved, as a share of income"
              : "not spent, as a share of income"
          }
        >
          <div className="mt-1 inline-flex rounded-full border border-warm-200 p-0.5">
            {RATE_MODES.map(({ mode, label }) => (
              <span
                key={mode}
                className={cn(
                  "whitespace-nowrap rounded-full px-1.5 py-0.5 font-display text-[9px] font-semibold transition-[transform,box-shadow] duration-200",
                  frame.rateMode === mode ? "bg-slate-950 text-white" : "text-text-secondary",
                  frame.pressed === mode && "scale-[0.94] ring-2 ring-emerald",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </Tile>
      </div>

      <ExpensesTable frame={frame} />
    </div>
  );
}

function TileLabel({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-nowrap font-body text-[9px] uppercase tracking-wider text-text-muted">
      {children}
    </p>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good";
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-warm-200 bg-white px-2.5 py-2">
      <TileLabel>{label}</TileLabel>
      <p className="mt-0.5 leading-none">
        <DemoValue
          value={value}
          className={cn(
            "font-display text-lg font-bold leading-none",
            tone === "good" ? "text-emerald-dark" : "text-text-primary",
          )}
        />
      </p>
      <p className="mt-1 font-body text-[9.5px] leading-snug text-text-muted">{hint}</p>
      {children}
    </div>
  );
}

function ExpensesTable({ frame }: { frame: ReviewDemoFrame }) {
  const { rows, totals } = REVIEW_DEMO.expenses;
  const allShown = frame.rows >= rows.length;

  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-warm-200 bg-white">
      <div className="flex items-center justify-between bg-red-50 px-3 py-1 text-red-800">
        <p className="font-display text-[11px] font-semibold">{CATEGORY_KIND_LABELS.expense}</p>
        <p className="font-body text-[8.5px]">Tracked · Budget · Remaining / excess</p>
      </div>
      <ul className="divide-y divide-warm-100">
        {rows.map((row, index) => (
          <ExpenseLine
            key={row.category}
            row={row}
            label={labelFor([], row.category)}
            shown={frame.rows > index}
            flagged={frame.flagged}
          />
        ))}
      </ul>
      <div className="border-t border-warm-200 bg-warm-50">
        <ExpenseLine row={totals} label="Total" shown={allShown} flagged={false} bold />
      </div>
    </div>
  );
}

function ExpenseLine({
  row,
  label,
  shown,
  flagged,
  bold = false,
}: {
  row: CategoryVariance;
  label: string;
  shown: boolean;
  flagged: boolean;
  bold?: boolean;
}) {
  const over = (row.excess ?? 0) > 0;
  const lastCell = over ? `−${formatMoney(row.excess ?? 0)}` : formatMoney(row.remaining ?? 0);
  const width = shown ? Math.min(100, Math.round((row.pctComplete ?? 0) * 100)) : 0;

  return (
    <li
      className={cn(
        "list-none px-3 py-1 transition-colors duration-300",
        bold && "font-semibold",
        shown && over && flagged && "bg-red-50",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_46px_46px_42px] items-center gap-1 font-body text-[10.5px] tabular-nums">
        <span className="truncate text-text-primary">{label}</span>
        <span className="text-right text-text-primary">{shown ? formatMoney(row.tracked) : BLANK}</span>
        <span className="text-right text-text-secondary">{formatMoney(row.budget ?? 0)}</span>
        <span
          className={cn(
            "text-right",
            !shown ? "text-text-muted" : over ? "font-semibold text-red-700" : "text-text-secondary",
          )}
        >
          {shown ? lastCell : BLANK}
        </span>
      </div>
      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-warm-100">
        <div
          className="h-full rounded-full bg-red-500 transition-[width] duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

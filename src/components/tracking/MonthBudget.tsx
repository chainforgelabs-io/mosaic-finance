"use client";

import { useMemo, useState } from "react";
import { categoryLabel } from "@/lib/tracking/categories";
import {
  kindMeter,
  monthBudgetPicture,
  type MonthBudgetLine,
  type MonthBudgetTotal,
} from "@/lib/tracking/budget-kpis";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, TransactionRow } from "@/types/tracking";

type BudgetKind = "income" | "expense" | "savings";

const FILL: Record<BudgetKind, string> = {
  income: "bg-[var(--emerald)]",
  expense: "bg-red-500",
  savings: "bg-sky-300",
};

const HEADLINE_TRACK: Record<BudgetKind, string> = {
  income: "bg-emerald-100",
  expense: "bg-red-100",
  savings: "bg-sky-100",
};

function reached(tracked: number, allocated: number) {
  return tracked >= allocated;
}

export function MonthBudget({
  txns,
  plan,
  schedules,
  budgets,
  month,
}: {
  txns: TransactionRow[];
  plan: BudgetPlanEntry[];
  schedules: Array<{ kind: string; category: string; spend_category?: string | null }>;
  budgets: Record<string, number | undefined>;
  month: string;
}) {
  const picture = useMemo(
    () => monthBudgetPicture(txns, plan, schedules, month, budgets),
    [txns, plan, schedules, month, budgets],
  );
  const [view, setView] = useState<"totals" | "itemized">("totals");
  const visible =
    picture.income.tracked > 0 ||
    picture.income.allocated > 0 ||
    picture.expense.tracked > 0 ||
    picture.expense.allocated > 0 ||
    picture.savings.tracked > 0 ||
    picture.savings.allocated > 0;

  if (!visible) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-[var(--warm-200)] bg-white p-0.5">
          <ViewButton active={view === "totals"} onClick={() => setView("totals")}>
            Totals
          </ViewButton>
          <ViewButton active={view === "itemized"} onClick={() => setView("itemized")}>
            Itemized
          </ViewButton>
        </div>
      </div>
      {view === "totals" ? (
        <div className="space-y-3">
          <KindRow kind="income" label="Income" row={picture.income} />
          <KindRow kind="expense" label="Expenses" row={picture.expense} />
          <KindRow kind="savings" label="Savings" row={picture.savings} />
        </div>
      ) : (
        <div className="space-y-4">
          <ItemizedSection label="Income" kind="income" row={picture.income} />
          <ItemizedSection label="Expenses" kind="expense" row={picture.expense} />
          <ItemizedSection label="Savings" kind="savings" row={picture.savings} />
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 font-display text-xs font-semibold",
        active ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
      )}
    >
      {children}
    </button>
  );
}

function KindRow({ kind, label, row }: { kind: BudgetKind; label: string; row: MonthBudgetTotal }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        <Score tracked={row.tracked} allocated={row.allocated} over={row.tone === "red"} />
      </div>
      <Bar kind={kind} width={row.width} full={reached(row.tracked, row.allocated)} prominent />
    </div>
  );
}

function ItemizedSection({
  label,
  kind,
  row,
}: {
  label: string;
  kind: BudgetKind;
  row: MonthBudgetTotal;
}) {
  return (
    <section className="space-y-2">
      <KindRow kind={kind} label={label} row={row} />
      {row.lines.length > 0 && (
        <ul className="space-y-2 border-l border-[var(--warm-200)] pl-3">
          {row.lines.map((line) => (
            <LineRow key={line.category} kind={kind} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LineRow({ kind, line }: { kind: BudgetKind; line: MonthBudgetLine }) {
  const meter = kindMeter(kind, line.tracked, line.allocated);
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-body text-xs text-[var(--text-secondary)]">{categoryLabel(line.category)}</span>
        <Score tracked={line.tracked} allocated={line.allocated} over={meter.tone === "red"} />
      </div>
      <Bar kind={kind} width={meter.width} full={reached(line.tracked, line.allocated)} />
    </li>
  );
}

function Score({ tracked, allocated, over }: { tracked: number; allocated: number; over: boolean }) {
  return (
    <span className={cn("shrink-0 font-body text-xs tabular-nums text-[var(--text-secondary)]", over && "font-semibold text-red-600")}>
      {formatMoney(tracked)} / {formatMoney(allocated)}
    </span>
  );
}

function Bar({
  kind,
  width,
  full,
  prominent = false,
}: {
  kind: BudgetKind;
  width: number;
  full: boolean;
  prominent?: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-1 overflow-hidden rounded-full",
        prominent ? cn("h-3", HEADLINE_TRACK[kind]) : "h-1.5 bg-[var(--warm-100)]",
      )}
    >
      <div className={cn("h-full rounded-full", FILL[kind], !full && "opacity-50")} style={{ width: `${width}%` }} />
    </div>
  );
}

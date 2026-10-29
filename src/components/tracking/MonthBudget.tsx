"use client";

import { useMemo, useState } from "react";
import { categoryLabel } from "@/lib/tracking/categories";
import {
  kindMeter,
  monthBudgetPicture,
  type BudgetTone,
  type MonthBudgetLine,
  type MonthBudgetTotal,
} from "@/lib/tracking/budget-kpis";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, TransactionRow } from "@/types/tracking";

const TONE_BAR: Record<BudgetTone, string> = {
  red: "bg-red-500",
  amber: "bg-sky-300",
  ok: "bg-[var(--emerald)]",
};

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
          <KindRow label="Income" row={picture.income} />
          <KindRow label="Expenses" row={picture.expense} />
          <KindRow label="Savings" row={picture.savings} />
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

function KindRow({ label, row }: { label: string; row: MonthBudgetTotal }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        <Score tracked={row.tracked} allocated={row.allocated} over={row.tone === "red"} />
      </div>
      <Bar tone={row.tone} width={row.width} />
    </div>
  );
}

function ItemizedSection({
  label,
  kind,
  row,
}: {
  label: string;
  kind: "income" | "expense" | "savings";
  row: MonthBudgetTotal;
}) {
  return (
    <section className="space-y-2">
      <KindRow label={label} row={row} />
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

function LineRow({ kind, line }: { kind: "income" | "expense" | "savings"; line: MonthBudgetLine }) {
  const meter = kindMeter(kind, line.tracked, line.allocated);
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-body text-xs text-[var(--text-secondary)]">{categoryLabel(line.category)}</span>
        <Score tracked={line.tracked} allocated={line.allocated} over={meter.tone === "red"} />
      </div>
      <Bar tone={meter.tone} width={meter.width} />
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

function Bar({ tone, width }: { tone: BudgetTone; width: number }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--warm-100)]">
      <div className={cn("h-full rounded-full", TONE_BAR[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}

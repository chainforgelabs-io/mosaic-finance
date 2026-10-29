"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { categoryLabel } from "@/lib/tracking/categories";
import { monthBudgetPicture, kindMeter, type BudgetTone, type MonthBudgetGroup } from "@/lib/tracking/budget-kpis";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, TransactionRow } from "@/types/tracking";

const TONE_BAR: Record<BudgetTone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
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
  const [open, setOpen] = useState<string | null>(null);
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
      <KindRow label="Money in" tracked={picture.income.tracked} allocated={picture.income.allocated} tone={picture.income.tone} width={picture.income.width} />
      <KindRow label="Spending" tracked={picture.expense.tracked} allocated={picture.expense.allocated} tone={picture.expense.tone} width={picture.expense.width} />
      <KindRow label="Set aside" tracked={picture.savings.tracked} allocated={picture.savings.allocated} tone={picture.savings.tone} width={picture.savings.width} />
      {picture.spending.length > 0 && <div className="h-px bg-[var(--warm-100)]" />}
      {picture.spending.map((group) => (
        <GroupRow
          key={group.category}
          group={group}
          open={open === group.category}
          onToggle={() => setOpen((current) => (current === group.category ? null : group.category))}
        />
      ))}
    </div>
  );
}

function KindRow({
  label,
  tracked,
  allocated,
  tone,
  width,
}: {
  label: string;
  tracked: number;
  allocated: number;
  tone: BudgetTone;
  width: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        <Score tracked={tracked} allocated={allocated} over={tone === "red"} />
      </div>
      <Bar tone={tone} width={width} />
    </div>
  );
}

function GroupRow({ group, open, onToggle }: { group: MonthBudgetGroup; open: boolean; onToggle: () => void }) {
  const expandable = group.lines.length > 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        {expandable ? (
          <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-1 text-left" aria-expanded={open}>
            <ChevronRight className={cn("size-3.5 shrink-0 text-[var(--text-muted)] transition-transform", open && "rotate-90")} />
            <span className="truncate font-body text-xs text-[var(--text-secondary)]">{categoryLabel(group.category)}</span>
          </button>
        ) : (
          <span className="truncate font-body text-xs text-[var(--text-secondary)]">{categoryLabel(group.category)}</span>
        )}
        <Score tracked={group.tracked} allocated={group.allocated} over={group.over} />
      </div>
      <Bar {...kindMeter("expense", group.tracked, group.allocated)} />
      {open && (
        <ul className="mt-2 space-y-2 pl-5">
          {group.lines.map((line) => (
            <li key={line.category}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-body text-[11px] text-[var(--text-muted)]">{categoryLabel(line.category)}</span>
                <Score tracked={line.tracked} allocated={line.allocated} over={line.tracked > line.allocated} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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

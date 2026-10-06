"use client";

import { KEYPAD_CATEGORIES, categoryLabel } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import { isOutflow } from "@/lib/tracking/cash-capture";
import type { TransactionRow } from "@/types/tracking";

export function SpendInbox({
  items,
  onAssign,
}: {
  items: TransactionRow[];
  onAssign: (id: string, category: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Inbox</h2>
        <p className="font-body text-xs text-[var(--text-muted)]">
          These entries have no confirmed category. Tap one when you want.
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((txn) => (
          <li key={txn.id} className="rounded-xl border border-[var(--warm-200)] bg-white px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-body text-sm text-[var(--text-primary)]">
                {txn.description || txn.note || (isOutflow(txn.direction) ? "Spend" : "Money in")}
              </p>
              <p className="font-display text-sm font-bold tabular-nums">
                {isOutflow(txn.direction) ? "" : "+"}
                {formatMoneyExact(Number(txn.amount))}
              </p>
            </div>
            <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">{txn.txn_date}</p>
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {KEYPAD_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onAssign(txn.id, category)}
                  className="shrink-0 rounded-full bg-[var(--warm-100)] px-2.5 py-1 font-display text-xs font-medium text-[var(--text-secondary)]"
                >
                  {categoryLabel(category)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

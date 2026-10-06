"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { categoryLabel } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import type { RepeatSuggestion, StatementBaseline } from "@/lib/tracking/statement-baseline";

export function StatementSummary({
  baseline,
  notice,
  saving,
  error,
  onConfirm,
  onReview,
  onClose,
}: {
  baseline: StatementBaseline;
  notice: string | null;
  saving: boolean;
  error: string | null;
  onConfirm: (repeats: RepeatSuggestion[]) => void;
  onReview: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(() => baseline.repeats.map(() => true));
  const accounts =
    baseline.hasCredit && baseline.hasDebit
      ? "Includes credit card and bank activity."
      : baseline.hasCredit
        ? "Includes credit card activity."
        : "Includes bank activity.";

  const figures = [
    ["Money in", baseline.incomeMonthly],
    ["Needs", baseline.needsMonthly],
    ["Flexible", baseline.flexibleMonthly],
    ["Left", baseline.leftMonthly],
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Your typical month</h2>
            <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
              {baseline.partial
                ? "This only covers the current month, so the average is early. Another statement would make it steadier."
                : `Based on ${baseline.monthLabels}.`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {figures.map(([label, amount]) => (
            <div key={label} className="rounded-lg bg-[var(--warm-100)] px-3 py-2">
              <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
              <p className="font-display text-lg font-semibold tabular-nums">{formatMoneyExact(amount)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">{accounts}</p>
        {baseline.flexibleByCategory.length > 0 && (
          <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
            Flexible spending was mostly{" "}
            {baseline.flexibleByCategory
              .slice(0, 3)
              .map((row) => categoryLabel(row.category))
              .join(", ")}
            .
          </p>
        )}
        {baseline.observation && (
          <p className="mt-3 rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] px-3 py-2 font-body text-sm text-[var(--text-secondary)]">
            {baseline.observation}
          </p>
        )}
        {baseline.repeats.length > 0 && (
          <div className="mt-4">
            <h3 className="font-display text-sm font-semibold">Repeats we can post for you</h3>
            <ul className="mt-2 space-y-2">
              {baseline.repeats.map((item, index) => (
                <li key={`${item.name}-${item.category}`}>
                  <label className="flex items-start gap-2 font-body text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected[index] ?? false}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = [...current];
                          next[index] = event.target.checked;
                          return next;
                        });
                      }}
                    />
                    <span>
                      {item.name} · {formatMoneyExact(item.amount)} ·{" "}
                      {item.direction === "in" ? "Money in" : categoryLabel(item.category)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        {notice && <p className="mt-3 font-body text-xs text-[var(--text-muted)]">{notice}</p>}
        {error && <p className="mt-3 font-body text-sm text-[var(--error)]">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() => onConfirm(baseline.repeats.filter((_, index) => selected[index]))}
          className="mt-4 w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Use this picture"}
        </button>
        <button
          type="button"
          onClick={onReview}
          className="mt-2 w-full py-2 font-display text-sm font-semibold text-[var(--text-secondary)]"
        >
          Review the lines
        </button>
      </div>
    </div>
  );
}

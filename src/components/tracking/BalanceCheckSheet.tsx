"use client";

import { useState } from "react";
import { AmountPad } from "@/components/tracking/AmountPad";
import { KEYPAD_CATEGORIES, categoryLabel } from "@/lib/tracking/categories";
import { amountFromDigits, balanceGap, roundMoney } from "@/lib/tracking/cash-capture";
import { formatMoneyExact } from "@/lib/tracking/format";
import type { CashDirection } from "@/types/tracking";

export function BalanceCheckSheet({
  expected,
  onClose,
  onBook,
}: {
  expected: number;
  onClose: () => void;
  onBook: (
    actual: number,
    book: "untracked" | "lines" | "none",
    lines?: { amount: number; category: string; direction: CashDirection }[],
  ) => Promise<boolean>;
}) {
  const [digits, setDigits] = useState("");
  const [negative, setNegative] = useState(false);
  const [compared, setCompared] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [lineDigits, setLineDigits] = useState("");
  const [lineCategory, setLineCategory] = useState("other");
  const [lines, setLines] = useState<{ amount: number; category: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const actual = (negative ? -1 : 1) * amountFromDigits(digits);
  const gap = balanceGap(actual, expected);
  const direction: CashDirection = gap < 0 ? "out" : "in";
  const explained = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const remaining = roundMoney(Math.abs(gap) - explained);

  async function book(
    mode: "untracked" | "lines" | "none",
    bookedLines?: { amount: number; category: string; direction: CashDirection }[],
  ) {
    setSaving(true);
    setError(null);
    const ok = await onBook(actual, mode, bookedLines);
    setSaving(false);
    if (!ok) setError("Could not save that balance check.");
  }

  const gapCopy =
    Math.abs(gap) < 0.005
      ? "That matches what was logged."
      : gap < 0
        ? `${formatMoneyExact(Math.abs(gap))} less than expected`
        : `${formatMoneyExact(gap)} more than expected`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Balance check</h2>
          <button type="button" onClick={onClose} className="font-display text-sm text-[var(--text-muted)]">
            Close
          </button>
        </div>
        <p className="mb-4 font-body text-sm text-[var(--text-secondary)]">
          Enter the balance in your bank. Expected from what you have logged: {formatMoneyExact(expected)}.
        </p>
        {!compared ? (
          <>
            <AmountPad digits={digits} onDigitsChange={setDigits} />
            <label className="mt-3 flex items-center gap-2 font-body text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={negative}
                onChange={(event) => setNegative(event.target.checked)}
              />
              This balance is negative
            </label>
            <button
              type="button"
              onClick={() => setCompared(true)}
              className="mt-4 w-full rounded-lg bg-[var(--slate-950)] py-2.5 font-display text-sm font-semibold text-white"
            >
              Compare
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-xl font-bold text-[var(--text-primary)]">{gapCopy}</p>
            <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
              You entered {formatMoneyExact(actual)}.
            </p>
            {Math.abs(gap) < 0.005 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => book("none")}
                className="mt-4 w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
              >
                Save check
              </button>
            ) : breaking ? (
              <div className="mt-4 space-y-3">
                <p className="font-body text-sm text-[var(--text-secondary)]">
                  Left to explain: {formatMoneyExact(Math.max(0, remaining))}
                </p>
                <AmountPad digits={lineDigits} onDigitsChange={setLineDigits} />
                <div className="flex flex-wrap gap-1.5">
                  {KEYPAD_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setLineCategory(category)}
                      className={
                        lineCategory === category
                          ? "rounded-full bg-[var(--slate-950)] px-2.5 py-1 font-display text-xs font-semibold text-white"
                          : "rounded-full bg-[var(--warm-100)] px-2.5 py-1 font-display text-xs font-medium text-[var(--text-secondary)]"
                      }
                    >
                      {categoryLabel(category)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const lineAmount = amountFromDigits(lineDigits);
                    if (lineAmount <= 0 || lineAmount - remaining > 0.001) return;
                    setLines((current) => [...current, { amount: lineAmount, category: lineCategory }]);
                    setLineDigits("");
                  }}
                  className="font-display text-sm font-semibold text-[var(--emerald-dark)]"
                >
                  Add line
                </button>
                <ul className="space-y-1">
                  {lines.map((line, index) => (
                    <li key={`${line.category}-${index}`} className="font-body text-sm">
                      {categoryLabel(line.category)} · {formatMoneyExact(line.amount)}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={saving || Math.abs(remaining) > 0.02}
                  onClick={() =>
                    book(
                      "lines",
                      lines.map((line) => ({ ...line, direction })),
                    )
                  }
                  className="w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save breakdown
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => book("untracked")}
                  className="w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
                >
                  Book as untracked
                </button>
                <button
                  type="button"
                  onClick={() => setBreaking(true)}
                  className="w-full rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
                >
                  Break it down
                </button>
              </div>
            )}
          </>
        )}
        {error && <p className="mt-3 font-body text-sm text-[var(--error)]">{error}</p>}
      </div>
    </div>
  );
}

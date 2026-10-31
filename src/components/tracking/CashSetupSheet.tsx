"use client";

import { useState } from "react";
import { todayIso } from "@/lib/tracking/dates";

export function CashSetupSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: {
    startingBalance: number;
    anchorDate: string;
    owedBalance: number | null;
  }) => Promise<void>;
}) {
  const [balance, setBalance] = useState("");
  const [owed, setOwed] = useState("");
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const startingBalance = Number(balance);
    if (!Number.isFinite(startingBalance)) {
      setError("Enter your bank balance.");
      return;
    }
    const owedTrimmed = owed.trim();
    const owedBalance = owedTrimmed === "" ? null : Number(owedTrimmed);
    if (owedBalance != null && (!Number.isFinite(owedBalance) || owedBalance < 0)) {
      setError("Enter what you owe as a number, or leave it blank.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ startingBalance, anchorDate, owedBalance });
    } catch {
      setError("Could not save that setup.");
      setSaving(false);
    }
  }

  return (
    <div className="phone-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <h2 className="font-display text-lg font-semibold">Start with your cash</h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
          Enter the bank balance at the end of this day. Income, expenses, and savings belong on the plan, one row for each.
        </p>
        <label className="mt-4 block font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Starting balance
          <input
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-display text-lg tabular-nums"
          />
        </label>
        <label className="mt-3 block font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Owed on cards and lines of credit
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={owed}
            onChange={(event) => setOwed(event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
        </label>
        <p className="mt-1 font-body text-[11px] text-[var(--text-muted)]">
          One total, if you want it. Update it when you check your bank balance.
        </p>
        <label className="mt-3 block font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Balance date
          <input
            type="date"
            value={anchorDate}
            onChange={(event) => setAnchorDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
        </label>
        {error && <p className="mt-3 font-body text-sm text-[var(--error)]">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save balance"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 font-display text-sm font-semibold text-[var(--text-muted)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

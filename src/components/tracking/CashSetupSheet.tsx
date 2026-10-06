"use client";

import { useState } from "react";
import { KEYPAD_CATEGORIES, categoryLabel } from "@/lib/tracking/categories";
import { todayIso } from "@/lib/tracking/dates";
import type { CashDirection, RecurringCadence } from "@/types/tracking";

const CADENCE_LABELS: Record<RecurringCadence, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export function CashSetupSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: {
    startingBalance: number;
    anchorDate: string;
    paycheque: {
      name: string;
      amount: number;
      cadence: RecurringCadence;
      nextDate: string;
    } | null;
    bill: {
      name: string;
      amount: number;
      category: string;
      cadence: RecurringCadence;
      nextDate: string;
      direction: CashDirection;
    } | null;
  }) => Promise<void>;
}) {
  const [balance, setBalance] = useState("");
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [payName, setPayName] = useState("Paycheque");
  const [payAmount, setPayAmount] = useState("");
  const [payCadence, setPayCadence] = useState<RecurringCadence>("biweekly");
  const [payDate, setPayDate] = useState(todayIso());
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCategory, setBillCategory] = useState("housing");
  const [billCadence, setBillCadence] = useState<RecurringCadence>("monthly");
  const [billDate, setBillDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const startingBalance = Number(balance);
    if (!Number.isFinite(startingBalance)) {
      setError("Enter your bank balance.");
      return;
    }
    const pay = Number(payAmount);
    const bill = Number(billAmount);
    setSaving(true);
    setError(null);
    try {
      await onSave({
        startingBalance,
        anchorDate,
        paycheque:
          payName.trim() && Number.isFinite(pay) && pay > 0
            ? { name: payName.trim(), amount: pay, cadence: payCadence, nextDate: payDate }
            : null,
        bill:
          billName.trim() && Number.isFinite(bill) && bill > 0
            ? {
                name: billName.trim(),
                amount: bill,
                category: billCategory,
                cadence: billCadence,
                nextDate: billDate,
                direction: "out",
              }
            : null,
      });
    } catch {
      setError("Could not save that setup.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <h2 className="font-display text-lg font-semibold">Start with your cash</h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
          One ledger for household spending. Enter the balance at the end of this day, then your paycheque and one fixed bill if you want. You can log variable spending right after.
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
          Balance date
          <input
            type="date"
            value={anchorDate}
            onChange={(event) => setAnchorDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
        </label>
        <h3 className="mt-5 font-display text-sm font-semibold">Paycheque</h3>
        <div className="mt-2 space-y-2">
          <input
            value={payName}
            onChange={(event) => setPayName(event.target.value)}
            className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
            placeholder="Amount, optional"
            className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
          <CadenceDate
            cadence={payCadence}
            date={payDate}
            onCadence={setPayCadence}
            onDate={setPayDate}
          />
        </div>
        <h3 className="mt-5 font-display text-sm font-semibold">Fixed bill</h3>
        <div className="mt-2 space-y-2">
          <input
            value={billName}
            onChange={(event) => setBillName(event.target.value)}
            placeholder="Rent, insurance, subscription"
            className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={billAmount}
            onChange={(event) => setBillAmount(event.target.value)}
            placeholder="Amount, optional"
            className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
          />
          <select
            value={billCategory}
            onChange={(event) => setBillCategory(event.target.value)}
            className="w-full rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
          >
            {KEYPAD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <CadenceDate
            cadence={billCadence}
            date={billDate}
            onCadence={setBillCadence}
            onDate={setBillDate}
          />
        </div>
        {error && <p className="mt-3 font-body text-sm text-[var(--error)]">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and start logging"}
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

function CadenceDate({
  cadence,
  date,
  onCadence,
  onDate,
}: {
  cadence: RecurringCadence;
  date: string;
  onCadence: (cadence: RecurringCadence) => void;
  onDate: (date: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        value={cadence}
        onChange={(event) => onCadence(event.target.value as RecurringCadence)}
        className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
      >
        {(Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((key) => (
          <option key={key} value={key}>
            {CADENCE_LABELS[key]}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        onChange={(event) => onDate(event.target.value)}
        className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CADENCE_LABELS,
  type AmountBasis,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import {
  monthAmountsFromRow,
  needsAnchorDate,
  PLAN_KINDS,
  type PlanKind,
} from "@/lib/tracking/budget-plan";
import { todayIso } from "@/lib/tracking/dates";
import { formatMoneyExact } from "@/lib/tracking/format";
import type { CashAnchor } from "@/types/tracking";

const KIND_TITLE: Record<PlanKind, string> = {
  income: "Income",
  expense: "Expenses",
  savings: "Savings",
};

const KIND_HINT: Record<PlanKind, string> = {
  income: "Paycheque, side work, benefits. Add one row for each source.",
  expense: "Rent, groceries, insurance, subscriptions. Add one row for each.",
  savings: "TFSA, RRSP, emergency fund, extra debt payments.",
};

export type HowOften = RecurringCadence | "variable";

export interface LedgerSetupRow {
  kind: PlanKind;
  name: string;
  amount: number;
  cadence: RecurringCadence | null;
  basis: AmountBasis;
  nextDate: string | null;
}

export interface LedgerSetupInput {
  startingBalance: number | null;
  anchorDate: string;
  owedBalance: number | null;
  rows: LedgerSetupRow[];
}

interface DraftRow {
  key: string;
  name: string;
  amount: string;
  cadence: HowOften;
  basis: AmountBasis;
  nextDate: string;
}

function blankRow(kind: PlanKind): DraftRow {
  return {
    key: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amount: "",
    cadence: kind === "income" ? "biweekly" : "monthly",
    basis: "each",
    nextDate: todayIso(),
  };
}

export function LedgerSetup({
  year,
  anchor,
  saving,
  error,
  onSave,
}: {
  year: number;
  anchor: CashAnchor | null;
  saving: boolean;
  error: string | null;
  onSave: (input: LedgerSetupInput) => Promise<void>;
}) {
  const [balance, setBalance] = useState(anchor ? String(anchor.starting_balance) : "");
  const [anchorDate, setAnchorDate] = useState(anchor?.anchor_date ?? todayIso());
  const [owed, setOwed] = useState(anchor?.owed_balance != null ? String(anchor.owed_balance) : "");
  const [rows, setRows] = useState<Record<PlanKind, DraftRow[]>>({
    income: [blankRow("income")],
    expense: [blankRow("expense")],
    savings: [blankRow("savings")],
  });
  const [formError, setFormError] = useState<string | null>(null);

  function update(kind: PlanKind, key: string, patch: Partial<DraftRow>) {
    setRows((current) => ({
      ...current,
      [kind]: current[kind].map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  }

  async function submit() {
    setFormError(null);
    const trimmed = balance.trim();
    const startingBalance = trimmed === "" ? null : Number(trimmed);
    if (startingBalance != null && !Number.isFinite(startingBalance)) {
      setFormError("Enter your bank balance as a number.");
      return;
    }
    if (anchor == null && startingBalance == null) {
      setFormError("Enter the bank balance your pay lands in.");
      return;
    }
    const owedTrimmed = owed.trim();
    const owedBalance = owedTrimmed === "" ? null : Number(owedTrimmed);
    if (owedBalance != null && (!Number.isFinite(owedBalance) || owedBalance < 0)) {
      setFormError("Enter what you owe as a number, or leave it blank.");
      return;
    }

    const parsed: LedgerSetupRow[] = [];
    for (const kind of PLAN_KINDS) {
      for (const row of rows[kind]) {
        if (!row.name.trim() && !row.amount.trim()) continue;
        const amount = Number(row.amount);
        if (!row.name.trim() || !Number.isFinite(amount) || amount <= 0) {
          setFormError(`Each ${KIND_TITLE[kind].toLowerCase()} row needs a name and an amount.`);
          return;
        }
        const cadence = row.cadence === "variable" ? null : row.cadence;
        if (needsAnchorDate(cadence) && !/^\d{4}-\d{2}-\d{2}$/.test(row.nextDate)) {
          setFormError("A repeating payment needs the last payment date.");
          return;
        }
        parsed.push({
          kind,
          name: row.name.trim(),
          amount,
          cadence: row.cadence === "variable" ? null : row.cadence,
          basis: row.basis,
          nextDate: needsAnchorDate(row.cadence === "variable" ? null : row.cadence) ? row.nextDate : null,
        });
      }
    }
    if (parsed.length === 0) {
      setFormError("Add at least one income, expense, or savings row.");
      return;
    }

    await onSave({
      startingBalance,
      anchorDate,
      owedBalance,
      rows: parsed,
    });
  }

  return (
    <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Set up your plan</h2>
      <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
        List each income source, expense, and savings row. Say how often it happens. A yearly salary can be entered as the full year, with how often you are paid.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Bank balance
          <input
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-display text-lg tabular-nums normal-case tracking-normal"
          />
        </label>
        <label className="block font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Balance date
          <input
            type="date"
            value={anchorDate}
            onChange={(event) => setAnchorDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm normal-case tracking-normal"
          />
        </label>
      </div>
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
          className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm normal-case tracking-normal"
        />
      </label>
      <p className="mt-1 font-body text-[11px] text-[var(--text-muted)]">
        One total, if you want it. Purchases on a card do not reduce the bank balance until you pay the card.
      </p>

      {PLAN_KINDS.map((kind) => (
        <div key={kind} className="mt-6">
          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">{KIND_TITLE[kind]}</h3>
          <p className="mt-0.5 font-body text-xs text-[var(--text-muted)]">{KIND_HINT[kind]}</p>
          <div className="mt-2 space-y-3">
            {rows[kind].map((row) => (
              <RowEditor
                key={row.key}
                year={year}
                row={row}
                onChange={(patch) => update(kind, row.key, patch)}
                onRemove={() =>
                  setRows((current) => ({
                    ...current,
                    [kind]: current[kind].filter((item) => item.key !== row.key),
                  }))
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((current) => ({ ...current, [kind]: [...current[kind], blankRow(kind)] }))}
            className="mt-2 inline-flex items-center gap-1 font-display text-sm font-semibold text-[var(--emerald-dark)]"
          >
            <Plus className="size-4" />
            Add {KIND_TITLE[kind].toLowerCase()}
          </button>
        </div>
      ))}

      {(formError || error) && <p className="mt-4 font-body text-sm text-[var(--error)]">{formError || error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save plan"}
      </button>
    </section>
  );
}

function shortMonth(month: string): string {
  return new Date(`${month}T00:00:00`).toLocaleDateString("en-CA", { month: "long" });
}

function RowEditor({
  year,
  row,
  onChange,
  onRemove,
}: {
  year: number;
  row: DraftRow;
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
}) {
  const amount = Number(row.amount);
  const cadence = row.cadence === "variable" ? null : row.cadence;
  const askDate = needsAnchorDate(cadence);
  const showPreview = row.name.trim() && Number.isFinite(amount) && amount > 0 && (!askDate || /^\d{4}-\d{2}-\d{2}$/.test(row.nextDate));
  const slots = showPreview ? monthAmountsFromRow(amount, cadence, row.basis, row.nextDate, year) : [];
  const two = slots.find((slot) => slot.count === 2);
  const three = slots.find((slot) => slot.count === 3);
  const monthly = slots[0]?.amount ?? 0;

  return (
    <div className="rounded-lg border border-[var(--warm-200)] p-3">
      <div className="flex gap-2">
        <input
          value={row.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Name"
          className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <button type="button" onClick={onRemove} aria-label="Remove row" className="rounded-md p-2 text-[var(--text-muted)]">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={row.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
          placeholder="Amount"
          className="rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <select
          value={row.basis}
          onChange={(event) => onChange({ basis: event.target.value as AmountBasis })}
          className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          <option value="each">Each time</option>
          <option value="year">Per year</option>
        </select>
      </div>
      <div className={askDate ? "mt-2 grid grid-cols-2 gap-2" : "mt-2"}>
        <select
          value={row.cadence}
          onChange={(event) => onChange({ cadence: event.target.value as HowOften })}
          className="w-full rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          <option value="variable">Same amount each month</option>
          {(Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((option) => (
            <option key={option} value={option}>
              {CADENCE_LABELS[option]}
            </option>
          ))}
        </select>
        {askDate && (
          <input
            type="date"
            value={row.nextDate}
            onChange={(event) => onChange({ nextDate: event.target.value })}
            aria-label="Last payment date"
            className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
          />
        )}
      </div>
      {askDate && (
        <p className="mt-1 font-body text-[11px] text-[var(--text-muted)]">Last payment date</p>
      )}
      {showPreview && two && three && (
        <p className="mt-2 font-body text-[11px] text-[var(--text-muted)]">
          {shortMonth(three.month)} has 3 payments ({formatMoneyExact(three.amount)}). {shortMonth(two.month)} has 2 (
          {formatMoneyExact(two.amount)}).
        </p>
      )}
      {showPreview && !(two && three) && (
        <p className="mt-2 font-body text-[11px] text-[var(--text-muted)]">
          About {formatMoneyExact(monthly)} a month.
        </p>
      )}
    </div>
  );
}

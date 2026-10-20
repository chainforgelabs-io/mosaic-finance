"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CADENCE_LABELS,
  monthlyPlanAmount,
  perOccurrenceAmount,
  type AmountBasis,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import { PLAN_KINDS, type PlanKind } from "@/lib/tracking/budget-plan";
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

export interface LedgerSetupRow {
  kind: PlanKind;
  name: string;
  amount: number;
  cadence: RecurringCadence;
  basis: AmountBasis;
  nextDate: string;
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
  cadence: RecurringCadence;
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
  anchor,
  saving,
  error,
  onSave,
}: {
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
        parsed.push({
          kind,
          name: row.name.trim(),
          amount,
          cadence: row.cadence,
          basis: row.basis,
          nextDate: row.nextDate,
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

function RowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: DraftRow;
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
}) {
  const amount = Number(row.amount);
  const showPreview = row.name.trim() && Number.isFinite(amount) && amount > 0;
  const monthly = showPreview ? monthlyPlanAmount(amount, row.cadence, row.basis) : 0;
  const each = showPreview ? perOccurrenceAmount(amount, row.cadence, row.basis) : 0;

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
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={row.cadence}
          onChange={(event) => onChange({ cadence: event.target.value as RecurringCadence })}
          className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          {(Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((cadence) => (
            <option key={cadence} value={cadence}>
              {CADENCE_LABELS[cadence]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={row.nextDate}
          onChange={(event) => onChange({ nextDate: event.target.value })}
          aria-label="Next date"
          className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        />
      </div>
      {showPreview && (
        <p className="mt-2 font-body text-[11px] text-[var(--text-muted)]">
          About {formatMoneyExact(monthly)} a month. {formatMoneyExact(each)} each time.
        </p>
      )}
    </div>
  );
}

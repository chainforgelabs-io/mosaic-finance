"use client";

import { useState } from "react";
import { KEYPAD_CATEGORIES, categoryLabel } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import { todayIso } from "@/lib/tracking/dates";
import type { CashDirection, RecurringCadence, RecurringItem } from "@/types/tracking";

const CADENCE_LABELS: Record<RecurringCadence, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export function RecurringPanel({
  items,
  today,
  onConfirm,
  onSkip,
  onCreate,
  onDelete,
}: {
  items: RecurringItem[];
  today: string;
  onConfirm: (id: string, amount: number) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onCreate: (input: {
    name: string;
    amount: number;
    category: string;
    direction: CashDirection;
    cadence: RecurringCadence;
    next_date: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const due = items.filter((item) => item.next_date <= today);

  return (
    <section className="space-y-3">
      {due.map((item) => (
        <DueCard key={item.id} item={item} onConfirm={onConfirm} onSkip={onSkip} />
      ))}
      <div className="rounded-xl border border-[var(--warm-200)] bg-white">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="font-display text-sm font-semibold">Bills and paycheques</span>
          <span className="font-body text-xs text-[var(--text-muted)]">{items.length}</span>
        </button>
        {open && (
          <div className="space-y-3 border-t border-[var(--warm-100)] px-4 py-3">
            <p className="font-body text-xs text-[var(--text-muted)]">
              One ledger for the household. Rent, insurance, subscriptions, and paycheques post on their dates.
            </p>
            {items.length === 0 && (
              <p className="font-body text-sm text-[var(--text-secondary)]">Nothing scheduled yet.</p>
            )}
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-body text-sm text-[var(--text-primary)]">
                      {item.name}
                      <span className="text-[var(--text-muted)]">
                        {" "}
                        · {item.direction === "in" ? "In" : "Out"} · {CADENCE_LABELS[item.cadence]}
                      </span>
                    </p>
                    <p className="font-body text-[11px] text-[var(--text-muted)]">
                      {formatMoneyExact(item.amount)} · next {item.next_date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="font-display text-xs font-semibold text-[var(--text-muted)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {adding ? (
              <AddSchedule
                onCancel={() => setAdding(false)}
                onCreate={async (input) => {
                  await onCreate(input);
                  setAdding(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="font-display text-sm font-semibold text-[var(--emerald-dark)]"
              >
                Add a bill or paycheque
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DueCard({
  item,
  onConfirm,
  onSkip,
}: {
  item: RecurringItem;
  onConfirm: (id: string, amount: number) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(item.amount));
  const [busy, setBusy] = useState(false);

  async function run(action: "confirm" | "skip") {
    const next = Number(amount);
    if (action === "confirm" && (!Number.isFinite(next) || next < 0)) return;
    setBusy(true);
    if (action === "confirm") await onConfirm(item.id, next);
    else await onSkip(item.id);
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-3">
      <p className="font-display text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
      <p className="mt-0.5 font-body text-xs text-[var(--text-muted)]">
        {item.direction === "in" ? "Money in" : categoryLabel(item.category)} · due {item.next_date}
      </p>
      <label className="mt-2 block font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Amount
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-display text-base tabular-nums"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("confirm")}
          className="flex-1 rounded-lg bg-[var(--emerald)] py-2 font-display text-sm font-semibold text-white disabled:opacity-60"
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("skip")}
          className="flex-1 rounded-lg border border-[var(--warm-200)] py-2 font-display text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-60"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AddSchedule({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    amount: number;
    category: string;
    direction: CashDirection;
    cadence: RecurringCadence;
    next_date: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<CashDirection>("out");
  const [category, setCategory] = useState("housing");
  const [cadence, setCadence] = useState<RecurringCadence>("monthly");
  const [nextDate, setNextDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = Number(amount);
        if (!name.trim() || !Number.isFinite(parsed) || parsed < 0) {
          setError("Add a name and an amount.");
          return;
        }
        void onCreate({
          name: name.trim(),
          amount: parsed,
          category: direction === "in" ? "paycheque" : category,
          direction,
          cadence,
          next_date: nextDate,
        });
      }}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Rent or paycheque"
        className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
      />
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Amount"
        className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={direction}
          onChange={(event) => setDirection(event.target.value as CashDirection)}
          className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          <option value="out">Out</option>
          <option value="in">In</option>
        </select>
        <select
          value={cadence}
          onChange={(event) => setCadence(event.target.value as RecurringCadence)}
          className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          {(Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((key) => (
            <option key={key} value={key}>
              {CADENCE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {direction === "out" && (
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          {KEYPAD_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {categoryLabel(option)}
            </option>
          ))}
        </select>
      )}
      <input
        type="date"
        value={nextDate}
        onChange={(event) => setNextDate(event.target.value)}
        className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
      />
      {error && <p className="font-body text-sm text-[var(--error)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-[var(--slate-950)] py-2 font-display text-sm font-semibold text-white"
        >
          Save schedule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[var(--warm-200)] py-2 font-display text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { AmountPad } from "@/components/tracking/AmountPad";
import {
  INCOME_CATEGORIES,
  KEYPAD_CATEGORIES,
  SAVINGS_CATEGORIES,
  SPENDING_CATEGORIES,
  categoryColor,
  categoryLabel,
  categorySlug,
  isSpendingCategory,
} from "@/lib/tracking/categories";
import {
  amountFromDigits,
  CADENCE_LABELS,
  predictCategories,
  predictSavingsCategories,
  splitLines,
  type CashDirection,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import { todayIso } from "@/lib/tracking/dates";
import { cn } from "@/lib/utils";
import type { CaptureInput, CaptureMode, TransactionRow } from "@/types/tracking";

const MODE_LABELS: Record<CaptureMode, string> = {
  out: "Out",
  in: "In",
  save: "Save",
};

function directionFor(mode: CaptureMode): CashDirection {
  return mode === "in" ? "in" : "out";
}

function captureFields(mode: CaptureMode): Pick<CaptureInput, "direction" | "lineRole" | "instrument"> {
  if (mode === "save") return { direction: "out", lineRole: "savings", instrument: "debit" };
  if (mode === "in") return { direction: "in", instrument: "debit" };
  return { direction: "out", lineRole: "purchase", instrument: "debit" };
}

/** Everyday categories behind More. Bill names stay on the due cards. */
function presetOptions(mode: CaptureMode): string[] {
  if (mode === "save") return [...SAVINGS_CATEGORIES];
  if (mode === "in") return [...INCOME_CATEGORIES];
  return [...SPENDING_CATEGORIES];
}

export function CashKeypad({
  history,
  catchUpDays,
  onAddCategory,
  onSave,
}: {
  history: TransactionRow[];
  catchUpDays: number | null;
  onAddCategory: (slug: string) => void;
  onSave: (input: CaptureInput) => Promise<boolean>;
}) {
  const [digits, setDigits] = useState("");
  const [mode, setMode] = useState<CaptureMode>("out");
  const fields = captureFields(mode);
  const direction = directionFor(mode);
  const [moreOpen, setMoreOpen] = useState(false);
  const [detailsCategory, setDetailsCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const amount = amountFromDigits(digits);

  const predicted = useMemo(
    () =>
      mode === "save"
        ? predictSavingsCategories(history)
        : predictCategories(history, new Date(), amount > 0 ? amount : null, direction),
    [history, amount, direction, mode],
  );
  const quickCategories = useMemo(() => {
    if (mode !== "out") return predicted;
    const spending = predicted.filter((category) => isSpendingCategory(category));
    for (const category of KEYPAD_CATEGORIES) {
      if (spending.length >= 4) break;
      if (!spending.includes(category)) spending.push(category);
    }
    return spending.slice(0, 4);
  }, [mode, predicted]);

  async function save(input: CaptureInput) {
    if (savingRef.current || input.amount <= 0) {
      if (input.amount <= 0) setError("Enter an amount first.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const ok = await onSave(input);
    savingRef.current = false;
    setSaving(false);
    if (!ok) {
      setError("Could not save that entry.");
      return;
    }
    setDigits("");
    setMoreOpen(false);
    setDetailsCategory(null);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  }

  function tapCategory(category: string, source: CaptureInput["source"] = "manual") {
    void save({
      amount,
      category,
      ...fields,
      categoryConfirmed: true,
      txnDate: todayIso(),
      source,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex rounded-full border border-[var(--warm-200)] bg-white p-1">
        {(Object.keys(MODE_LABELS) as CaptureMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setMoreOpen(false);
            }}
            className={cn(
              "flex-1 rounded-full py-2 font-display text-sm font-semibold",
              mode === option ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
            )}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {quickCategories.map((category) => (
          <CategoryChip
            key={category}
            label={categoryLabel(category)}
            disabled={saving}
            onTap={() => tapCategory(category)}
            onHold={() => setDetailsCategory(category)}
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className="shrink-0 rounded-full border border-[var(--warm-200)] bg-white px-3 py-2 font-display text-sm font-semibold text-[var(--text-secondary)]"
        >
          More
        </button>
      </div>
      <p className="mb-3 font-body text-[11px] text-[var(--text-muted)]">
        {mode === "save"
          ? "Tap the account the money went to. Savings leave the bank but never count as spending."
          : mode === "in"
            ? "Tap where the money came from. This increases the bank balance. Hold a category for a note or date."
            : "Tap a category to save. This changes the bank balance. Hold a category for a note, merchant, date, split, or repeat."}
      </p>

      {moreOpen && (
        <MoreCategories
          mode={mode}
          current={quickCategories}
          onAddCategory={onAddCategory}
          onPick={(category) => tapCategory(category)}
        />
      )}

      {mode === "out" && catchUpDays != null && catchUpDays >= 3 && (
        <div className="mb-3 rounded-lg border border-[var(--warm-200)] bg-white px-3 py-3">
          <p className="font-body text-sm text-[var(--text-secondary)]">
            It has been {catchUpDays} days since the last entry. Type one amount for those days, or log what you remember.
          </p>
          <button
            type="button"
            disabled={saving || amount <= 0}
            onClick={() => tapCategory("untracked", "catchup")}
            className="mt-2 font-display text-sm font-semibold text-[var(--emerald-dark)] disabled:opacity-40"
          >
            Save this amount as one catch-up
          </button>
        </div>
      )}

      {error && <p className="mb-2 font-body text-sm text-[var(--error)]">{error}</p>}

      <div className="rounded-2xl border border-[var(--warm-200)] bg-white p-4">
        <AmountPad digits={digits} onDigitsChange={setDigits} />
      </div>

      {detailsCategory && (
        <DetailsSheet
          category={detailsCategory}
          amount={amount}
          mode={mode}
          onClose={() => setDetailsCategory(null)}
          onSave={(input) => save(input)}
        />
      )}
    </div>
  );
}

function CategoryChip({
  label,
  disabled,
  onTap,
  onHold,
}: {
  label: string;
  disabled?: boolean;
  onTap: () => void;
  onHold: () => void;
}) {
  const suppressClick = useRef(false);
  const timer = useRef<number | null>(null);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={() => {
        suppressClick.current = false;
        timer.current = window.setTimeout(() => {
          suppressClick.current = true;
          onHold();
        }, 450);
      }}
      onPointerUp={() => {
        if (timer.current) window.clearTimeout(timer.current);
      }}
      onPointerLeave={() => {
        if (timer.current) window.clearTimeout(timer.current);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        suppressClick.current = true;
        onHold();
      }}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onTap();
      }}
      className="shrink-0 rounded-full bg-[var(--slate-950)] px-3 py-2 font-display text-sm font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function MoreCategories({
  mode,
  current,
  onAddCategory,
  onPick,
}: {
  mode: CaptureMode;
  current: string[];
  onAddCategory: (slug: string) => void;
  onPick: (category: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const options = presetOptions(mode).filter((category) => !current.includes(category));

  return (
    <div className="mb-3 rounded-xl border border-[var(--warm-200)] bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        {options.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onPick(category)}
            className="flex items-center gap-2 rounded-xl border border-[var(--warm-200)] bg-white px-3 py-2.5 text-left font-display text-sm font-semibold text-[var(--text-primary)]"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColor(category) }}
            />
            {categoryLabel(category)}
          </button>
        ))}
      </div>
      {mode === "out" && (
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          placeholder="Add a category"
          className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
        />
        <button
          type="button"
          onClick={() => {
            const slug = categorySlug(draft);
            if (!slug) {
              setInvalid(true);
              return;
            }
            onAddCategory(slug);
            onPick(slug);
          }}
          className="rounded-lg bg-[var(--slate-950)] px-3 py-1.5 font-display text-xs font-semibold text-white"
        >
          Add
        </button>
      </div>
      )}
      {invalid && (
        <p className="mt-1 font-body text-[11px] text-red-700">Use a short name, like rental condo fees.</p>
      )}
    </div>
  );
}

function DetailsSheet({
  category,
  amount,
  mode,
  onClose,
  onSave,
}: {
  category: string;
  amount: number;
  mode: CaptureMode;
  onClose: () => void;
  onSave: (input: CaptureInput) => void;
}) {
  const fields = captureFields(mode);
  const [chosen, setChosen] = useState(category);
  const [note, setNote] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(todayIso());
  const [split, setSplit] = useState(false);
  const [secondAmount, setSecondAmount] = useState("");
  const [secondCategory, setSecondCategory] = useState("other");
  const [repeat, setRepeat] = useState(false);
  const [repeatName, setRepeatName] = useState("");
  const [cadence, setCadence] = useState<RecurringCadence>("monthly");
  const [formError, setFormError] = useState<string | null>(null);
  const options = [...new Set([chosen, secondCategory, ...presetOptions(mode)])];

  function submit() {
    const lines = split
      ? splitLines(amount, chosen, Number(secondAmount), secondCategory)
      : undefined;
    if (split && !lines) {
      setFormError("The split needs two amounts that add up to the total.");
      return;
    }
    if (repeat && mode !== "save" && !repeatName.trim()) {
      setFormError("Name the bill or paycheque you want to repeat.");
      return;
    }
    onSave({
      amount,
      category: chosen,
      ...fields,
      categoryConfirmed: true,
      txnDate: date,
      note: note.trim() || undefined,
      description: merchant.trim() || undefined,
      source: "manual",
      lines: lines ?? undefined,
      recurring: repeat && mode !== "save" ? { name: repeatName.trim(), cadence } : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Entry details</h2>
          <button type="button" onClick={onClose} className="font-display text-sm text-[var(--text-muted)]">
            Close
          </button>
        </div>
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Category
        </label>
        <select
          value={chosen}
          onChange={(event) => {
            if (event.target.value === "__add") return;
            setChosen(event.target.value);
          }}
          className="mt-1 mb-3 w-full rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {categoryLabel(option)}
            </option>
          ))}
        </select>
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Merchant
        </label>
        <input
          value={merchant}
          onChange={(event) => setMerchant(event.target.value)}
          className="mt-1 mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Note
        </label>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-1 mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 mb-3 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="mb-3 flex items-center gap-2 font-body text-sm">
          <input type="checkbox" checked={split} onChange={(event) => setSplit(event.target.checked)} />
          Split
        </label>
        {split && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={secondAmount}
              onChange={(event) => setSecondAmount(event.target.value)}
              placeholder="Second amount"
              className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
            />
            <select
              value={secondCategory}
              onChange={(event) => setSecondCategory(event.target.value)}
              className="rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {categoryLabel(option)}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode !== "save" && (
        <label className="mb-3 flex items-center gap-2 font-body text-sm">
          <input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
          Repeat this
        </label>
        )}
        {repeat && mode !== "save" && (
          <div className="mb-3 space-y-2">
            <input
              value={repeatName}
              onChange={(event) => setRepeatName(event.target.value)}
              placeholder={mode === "in" ? "Paycheque" : "Rent"}
              className="w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
            />
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as RecurringCadence)}
              className="w-full rounded-lg border border-[var(--warm-200)] px-2 py-2 font-body text-sm"
            >
              {(Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((key) => (
                <option key={key} value={key}>
                  {CADENCE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        )}
        {formError && <p className="mb-3 font-body text-sm text-[var(--error)]">{formError}</p>}
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
  SPENDING_CATEGORIES,
  categoryLabel,
  categorySlug,
} from "@/lib/tracking/categories";
import { transactionKind, type TransactionKind } from "@/lib/tracking/cash-capture";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/types/tracking";

function categoryOptions(extras: string[], current: string | undefined, kind: TransactionKind): string[] {
  const base: readonly string[] =
    kind === "savings" ? SAVINGS_CATEGORIES : kind === "income" ? INCOME_CATEGORIES : SPENDING_CATEGORIES;
  const all: string[] = kind === "expense" ? [...base, ...extras] : [...base];
  if (current && !all.includes(current)) all.push(current);
  return [...new Set(all)];
}

export function CategoryPicker({
  value,
  onChange,
  extras,
  onAdd,
  variant,
  kind = "expense",
}: {
  value: string;
  onChange: (slug: string) => void;
  extras: string[];
  onAdd: (slug: string) => void;
  variant: "pills" | "select";
  /** Which list to show. Income and savings lists do not take custom additions yet. */
  kind?: TransactionKind;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const options = categoryOptions(extras, value, kind);
  const canAdd = kind === "expense";

  function commit() {
    const slug = categorySlug(draft);
    if (!slug) {
      setInvalid(true);
      return;
    }
    onAdd(slug);
    onChange(slug);
    setDraft("");
    setAdding(false);
    setInvalid(false);
  }

  return (
    <div>
      {variant === "select" ? (
        <select
          value={options.includes(value) ? value : "other"}
          onChange={(e) => {
            if (e.target.value === "__add") {
              setAdding(true);
              return;
            }
            onChange(e.target.value);
          }}
          className="w-full rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm"
        >
          {options.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
          {canAdd && <option value="__add">Add a category…</option>}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "rounded-full px-2.5 py-1 font-display text-xs font-medium",
                value === c
                  ? "bg-[var(--emerald)] text-white"
                  : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
              )}
            >
              {categoryLabel(c)}
            </button>
          ))}
          {canAdd && (
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="rounded-full border border-dashed border-[var(--warm-200)] px-2.5 py-1 font-display text-xs font-medium text-[var(--text-secondary)]"
          >
            Add a category
          </button>
          )}
        </div>
      )}
      {variant === "select" && canAdd && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 font-display text-[11px] font-semibold text-[var(--emerald-dark)]"
        >
          Add a category
        </button>
      )}
      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            placeholder="Rental condo fees"
            className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
          />
          <button
            type="button"
            onClick={commit}
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

export function EditSpendSheet({
  txn,
  extras,
  onAddCategory,
  onClose,
  onSave,
}: {
  txn: TransactionRow;
  extras: string[];
  onAddCategory: (slug: string) => void;
  onClose: () => void;
  onSave: (payload: {
    txn_date: string;
    amount: number;
    category: string;
    description: string;
    note?: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(txn.amount));
  const [category, setCategory] = useState(txn.category);
  const [date, setDate] = useState(txn.txn_date);
  const [description, setDescription] = useState(txn.description ?? "");
  const [note, setNote] = useState(txn.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const kind = transactionKind(txn);

  async function submit() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        txn_date: date,
        amount: n,
        category,
        description,
        note: note || undefined,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this spend.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            {kind === "income" ? "Edit income" : kind === "savings" ? "Edit savings" : "Edit spend"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        {txn.category_confirmed === false && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 font-body text-sm text-amber-900">
            This category was suggested from your upload. Saving marks it as checked.
          </p>
        )}
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Amount
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2.5 font-display text-lg tabular-nums"
        />
        <p className="mb-2 font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Category
        </p>
        <div className="mb-4">
          <CategoryPicker
            value={category}
            extras={extras}
            onAdd={onAddCategory}
            onChange={setCategory}
            variant="pills"
            kind={kind === "neutral" ? "expense" : kind}
          />
        </div>
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 mb-5 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
        {saveError && (
          <p className="mb-3 font-body text-sm text-[var(--error)]">{saveError}</p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

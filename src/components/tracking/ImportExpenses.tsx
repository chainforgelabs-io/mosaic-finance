"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { CategoryPicker } from "@/components/tracking/EditSpendSheet";
import { transactionKind } from "@/lib/tracking/cash-capture";
import { categoryLabel } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import {
  confirmCategory,
  filterImportRows,
  importCategoryChips,
  type ImportRow,
} from "@/lib/tracking/import-session";
import { cn } from "@/lib/utils";

function formatShortDate(iso: string | null): string {
  if (!iso) return "No date";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 font-display text-xs font-semibold",
        active ? "bg-[var(--slate-950)] text-white" : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
      )}
    >
      {children}
    </button>
  );
}

export function ImportExpenses({
  rows,
  notice,
  extras,
  hasPicture,
  saving,
  saveError,
  onChange,
  onAddCategory,
  onSave,
}: {
  rows: ImportRow[];
  notice: string | null;
  extras: string[];
  hasPicture: boolean;
  saving: boolean;
  saveError: string | null;
  onChange: (rows: ImportRow[]) => void;
  onAddCategory: (slug: string) => void;
  onSave: () => void;
}) {
  const [filter, setFilter] = useState(() => (rows.some((row) => !row.categoryConfirmed) ? "needs" : "all"));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const visible = filterImportRows(rows, filter);
  const chips = importCategoryChips(rows);
  const suggested = rows.filter((row) => !row.categoryConfirmed).length;
  const chosen = rows.filter((row) => row.included && row.amount > 0);
  const canSave =
    chosen.some((row) => !row.duplicateOf || row.duplicateAction === "add" || row.duplicateAction === "merge") ||
    chosen.some((row) => row.duplicateOf && row.duplicateAction === "skip");
  const viewingCategory = filter !== "needs" && filter !== "all";
  const categoryStillSuggested = viewingCategory && rows.some((row) => row.suggested_category === filter && !row.categoryConfirmed);

  function update(key: string, patch: Partial<ImportRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Review expenses</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
            {rows.length} {rows.length === 1 ? "expense" : "expenses"}. Suggested categories stay marked until you confirm them.
          </p>
        </div>
        {hasPicture && (
          <Link href="/dashboard/cash-flow" className="font-display text-sm font-semibold text-[var(--text-secondary)]">
            Back to the picture
          </Link>
        )}
      </div>
      {notice && <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">{notice}</p>}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={filter === "needs"} onClick={() => setFilter("needs")}>
          Needs a look{suggested > 0 ? ` (${suggested})` : ""}
        </FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {chips.map((slug) => (
          <FilterChip key={slug} active={filter === slug} onClick={() => setFilter(slug)}>
            {categoryLabel(slug)}
          </FilterChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 font-body text-sm text-[var(--text-muted)]">
          {filter === "needs" ? "Every suggested category is checked." : "Nothing in this category."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--warm-100)] overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
          {visible.map((row) => {
            const editing = editingKey === row.key;
            const kind = transactionKind(row);
            return (
              <li key={row.key} className={cn("px-4 py-3", !row.included && "opacity-40")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(event) => update(row.key, { included: event.target.checked })}
                    aria-label={`Include ${row.description}`}
                  />
                  <span className="w-16 shrink-0 font-body text-xs text-[var(--text-muted)]">
                    {formatShortDate(row.txn_date)}
                  </span>
                  <p className="min-w-0 flex-1 basis-40 truncate font-body text-sm text-[var(--text-primary)]">
                    {row.description || "Expense"}
                  </p>
                  <span className="shrink-0 font-display text-sm font-semibold tabular-nums">
                    {formatMoneyExact(row.amount)}
                  </span>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="w-full sm:w-44">
                      <CategoryPicker
                        value={row.suggested_category}
                        extras={extras}
                        variant="select"
                        kind={kind === "neutral" ? "expense" : kind}
                        onAdd={(slug) => {
                          onAddCategory(slug);
                          update(row.key, { suggested_category: slug, categoryConfirmed: true });
                        }}
                        onChange={(slug) => update(row.key, { suggested_category: slug, categoryConfirmed: true })}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-display text-[11px] font-semibold",
                        row.categoryConfirmed ? "text-[var(--emerald-dark)]" : "text-amber-800",
                      )}
                    >
                      {row.categoryConfirmed ? "Checked" : "Suggested"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingKey(editing ? null : row.key)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
                    aria-label={`Edit ${row.description}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
                {editing && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(event) => update(row.key, { description: event.target.value })}
                      aria-label="Description"
                      className="rounded border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) =>
                        update(row.key, {
                          amount: Number(event.target.value),
                          duplicateOf: null,
                          duplicateAction: "add",
                        })
                      }
                      aria-label="Amount"
                      className="rounded border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm tabular-nums"
                    />
                    <input
                      type="date"
                      value={row.txn_date ?? ""}
                      onChange={(event) =>
                        update(row.key, {
                          txn_date: event.target.value,
                          duplicateOf: null,
                          duplicateAction: "add",
                        })
                      }
                      aria-label="Date"
                      className="rounded border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
                    />
                  </div>
                )}
                {row.duplicateOf && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2">
                    <p className="font-body text-xs text-amber-950">
                      Same date and amount as {row.duplicateOf.description || categoryLabel(row.duplicateOf.category)} on{" "}
                      {row.duplicateOf.txn_date} ({formatMoneyExact(row.duplicateOf.amount)}). Adding it would count this
                      twice.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(
                        [
                          ["skip", "Delete duplicate"],
                          ["merge", "Merge"],
                          ["add", "Add anyway"],
                        ] as const
                      ).map(([action, label]) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => update(row.key, { duplicateAction: action, included: true })}
                          className={cn(
                            "rounded-full px-2.5 py-1 font-display text-[11px] font-semibold",
                            row.duplicateAction === action
                              ? "bg-[var(--slate-950)] text-white"
                              : "bg-white text-[var(--text-secondary)]",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--warm-200)] bg-white md:left-14 lg:left-60">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-body text-sm text-[var(--text-primary)]">
              {suggested === 0 ? "Categories checked" : `${suggested} still suggested`}
            </p>
            {!viewingCategory && suggested > 0 && (
              <p className="font-body text-xs text-[var(--text-muted)]">Pick a category to confirm that group.</p>
            )}
            {saveError && <p className="font-body text-sm text-[var(--error)]">{saveError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!categoryStillSuggested}
              onClick={() => onChange(confirmCategory(rows, filter))}
              className="rounded-lg border border-[var(--warm-200)] px-3 py-2.5 font-display text-sm font-semibold disabled:opacity-50"
            >
              These categories look right
            </button>
            <button
              type="button"
              disabled={saving || !canSave}
              onClick={onSave}
              className="rounded-lg bg-[var(--emerald)] px-3 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save expenses"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

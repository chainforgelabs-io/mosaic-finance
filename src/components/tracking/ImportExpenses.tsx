"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { CategoryPicker } from "@/components/tracking/EditSpendSheet";
import { categoryLabel } from "@/lib/tracking/categories";
import { formatMoneyExact } from "@/lib/tracking/format";
import {
  confirmCategory,
  confirmImportRow,
  filterImportRows,
  firstImportFilter,
  importCategoryChips,
  importChipOrder,
  importMenu,
  importRowMenuKind,
  pendingImportCount,
  requestStatementPicture,
  type ImportRow,
  type PlanCategoryLists,
  type PlanMenuKind,
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
  categories,
  added,
  hasPicture,
  saving,
  saveError,
  onChange,
  onAddCategory,
  onSave,
}: {
  rows: ImportRow[];
  notice: string | null;
  categories: PlanCategoryLists;
  added: Record<PlanMenuKind, string[]>;
  hasPicture: boolean;
  saving: boolean;
  saveError: string | null;
  onChange: (rows: ImportRow[]) => void;
  onAddCategory: (slug: string, kind: PlanMenuKind) => void;
  onSave: () => void;
}) {
  const router = useRouter();
  const order = importChipOrder(categories);
  const [filter, setFilter] = useState(() => firstImportFilter(rows, order));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const chips = importCategoryChips(rows, order);
  const pending = pendingImportCount(rows);
  const unassigned = rows.filter((row) => row.included && !row.suggested_category).length;
  const activeFilter =
    filter === "needs" || filter === "all" || chips.includes(filter)
      ? filter
      : (chips[0] ?? (unassigned > 0 ? "needs" : "all"));
  const visible = filterImportRows(rows, activeFilter);
  const chosen = rows.filter((row) => row.included && row.amount > 0);
  const canSave =
    chosen.some((row) => !row.duplicateOf || row.duplicateAction === "add" || row.duplicateAction === "merge") ||
    chosen.some((row) => row.duplicateOf && row.duplicateAction === "skip");
  const viewingCategory = activeFilter !== "needs" && activeFilter !== "all";
  const categoryStillSuggested =
    viewingCategory && rows.some((row) => row.suggested_category === activeFilter && !row.categoryConfirmed);

  function update(key: string, patch: Partial<ImportRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Review expenses</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
            {rows.filter((row) => row.included).length} to review. Confirm the sorted lines first. Needs a look is anything that does not match the plan.
          </p>
        </div>
        {hasPicture && (
          <button
            type="button"
            onClick={() => {
              requestStatementPicture();
              router.push("/dashboard/cash-flow");
            }}
            className="font-display text-sm font-semibold text-[var(--text-secondary)]"
          >
            Back to the picture
          </button>
        )}
      </div>
      {notice && <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">{notice}</p>}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={activeFilter === "needs"} onClick={() => setFilter("needs")}>
          Needs a look{unassigned > 0 ? ` (${unassigned})` : ""}
        </FilterChip>
        <FilterChip active={activeFilter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {chips.map((slug) => (
          <FilterChip key={slug} active={activeFilter === slug} onClick={() => setFilter(slug)}>
            {categoryLabel(slug)}
          </FilterChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 font-body text-sm text-[var(--text-muted)]">
          {activeFilter === "needs" ? "Every line has a category." : "These are confirmed."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--warm-100)] overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
          {visible.map((row) => {
            const editing = editingKey === row.key;
            const menuKind = importRowMenuKind(row);
            return (
              <li key={row.key} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <button
                    type="button"
                    onClick={() => update(row.key, { included: false })}
                    className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
                    aria-label={`Delete ${row.description || "line"}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
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
                        extras={[]}
                        choices={importMenu(menuKind, categories, added[menuKind])}
                        emptyLabel="Choose a category"
                        variant="select"
                        kind={menuKind}
                        canAdd
                        onAdd={(slug) => {
                          onAddCategory(slug, menuKind);
                          update(row.key, { suggested_category: slug, categoryConfirmed: true });
                        }}
                        onChange={(slug) =>
                          update(row.key, {
                            suggested_category: slug,
                            categoryConfirmed: slug !== "",
                          })
                        }
                      />
                    </div>
                    {row.suggested_category && !row.categoryConfirmed ? (
                      <button
                        type="button"
                        onClick={() => onChange(confirmImportRow(rows, row.key))}
                        className="shrink-0 font-display text-[11px] font-semibold text-[var(--emerald-dark)]"
                      >
                        Confirm
                      </button>
                    ) : row.categoryConfirmed ? (
                      <span className="shrink-0 font-display text-[11px] font-semibold text-[var(--emerald-dark)]">
                        Confirmed
                      </span>
                    ) : (
                      <span className="shrink-0 font-display text-[11px] font-semibold text-amber-800">Unassigned</span>
                    )}
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
              {pending === 0 ? "Categories checked" : `${pending} still to confirm`}
            </p>
            {activeFilter === "needs" && unassigned > 0 && (
              <p className="font-body text-xs text-[var(--text-muted)]">Choose a category for each line.</p>
            )}
            {activeFilter === "all" && pending > 0 && (
              <p className="font-body text-xs text-[var(--text-muted)]">Pick a category to confirm that group.</p>
            )}
            {saveError && <p className="font-body text-sm text-[var(--error)]">{saveError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!categoryStillSuggested}
              onClick={() => onChange(confirmCategory(rows, activeFilter))}
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

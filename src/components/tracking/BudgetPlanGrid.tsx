"use client";

import { useMemo, useState } from "react";
import { ArrowRightToLine, Plus, X } from "lucide-react";
import {
  CATEGORY_KIND_LABELS,
  categorySlug,
  labelFor,
  resolveCategories,
  type UserCategory,
} from "@/lib/tracking/categories";
import {
  indexPlan,
  planAmount,
  plannedCategories,
  planTotals,
  rowTotal,
  PLAN_KINDS,
  type PlanKind,
} from "@/lib/tracking/budget-plan";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry } from "@/types/tracking";

const KIND_STYLES: Record<PlanKind, { header: string; accent: string }> = {
  income: { header: "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]", accent: "text-[var(--emerald-dark)]" },
  expense: { header: "bg-red-50 text-red-800", accent: "text-red-800" },
  savings: { header: "bg-sky-50 text-sky-800", accent: "text-sky-800" },
};

function shortMonth(month: string): string {
  return new Date(`${month}T00:00:00`).toLocaleDateString("en-CA", { month: "short" });
}

function parseAmount(raw: string): number | null {
  const clean = raw.replace(/[^0-9.]/g, "");
  if (!clean) return 0;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export interface BudgetPlanGridProps {
  year: number;
  months: string[];
  entries: BudgetPlanEntry[];
  catalog: UserCategory[];
  /** Month shown on small screens. */
  focusMonth: string;
  onFocusMonth: (month: string) => void;
  onSetAmount: (kind: PlanKind, category: string, month: string, amount: number) => void;
  onFillRight: (kind: PlanKind, category: string, month: string, amount: number) => void;
  onRemoveRow: (kind: PlanKind, category: string) => void;
  onAddRow: (kind: PlanKind, category: string) => void;
  onCreateCategory: (kind: PlanKind, label: string) => Promise<string | null>;
}

export function BudgetPlanGrid(props: BudgetPlanGridProps) {
  const { year, months, entries, focusMonth, onFocusMonth } = props;
  const index = useMemo(() => indexPlan(entries), [entries]);
  const monthTotals = useMemo(
    () => months.map((month) => planTotals(entries, month)),
    [entries, months],
  );
  const yearTotals = useMemo(() => planTotals(entries), [entries]);
  const focusIndex = Math.max(0, months.indexOf(focusMonth));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Month
        </label>
        <select
          value={focusMonth}
          onChange={(event) => onFocusMonth(event.target.value)}
          className="rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-display text-sm font-semibold"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {new Date(`${month}T00:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      <AllocationRow
        months={months}
        monthTotals={monthTotals}
        yearTotal={yearTotals.toBeAllocated}
        focusIndex={focusIndex}
        year={year}
      />

      {PLAN_KINDS.map((kind) => (
        <PlanSection
          key={kind}
          kind={kind}
          index={index}
          focusIndex={focusIndex}
          monthTotals={monthTotals}
          yearTotal={yearTotals[kind]}
          {...props}
        />
      ))}
    </div>
  );
}

function AllocationRow({
  months,
  monthTotals,
  yearTotal,
  focusIndex,
  year,
}: {
  months: string[];
  monthTotals: ReturnType<typeof planTotals>[];
  yearTotal: number;
  focusIndex: number;
  year: number;
}) {
  const focus = monthTotals[focusIndex];
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">To be allocated</h2>
        <p className="font-body text-xs text-[var(--text-muted)]">Income minus planned expenses and savings</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:hidden">
        <Stat label={shortMonth(months[focusIndex])} value={focus?.toBeAllocated ?? 0} signed />
        <Stat label={`${year} total`} value={yearTotal} signed />
      </div>
      <div className="mt-3 hidden lg:block">
        <div className="grid grid-cols-[minmax(160px,1.4fr)_repeat(12,minmax(72px,1fr))_minmax(88px,1.1fr)] gap-1 text-right">
          <span />
          {months.map((month, i) => (
            <span
              key={month}
              className={cn(
                "font-display text-xs font-semibold tabular-nums",
                monthTotals[i].toBeAllocated < 0 ? "text-red-700" : "text-[var(--emerald-dark)]",
              )}
            >
              {formatMoney(monthTotals[i].toBeAllocated)}
            </span>
          ))}
          <span
            className={cn(
              "font-display text-xs font-bold tabular-nums",
              yearTotal < 0 ? "text-red-700" : "text-[var(--emerald-dark)]",
            )}
          >
            {formatMoney(yearTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--warm-50)] px-3 py-2">
      <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "font-display text-lg font-bold tabular-nums",
          signed && value < 0 ? "text-red-700" : "text-[var(--text-primary)]",
        )}
      >
        {formatMoney(value)}
      </p>
    </div>
  );
}

function PlanSection({
  kind,
  index,
  focusIndex,
  monthTotals,
  yearTotal,
  months,
  entries,
  catalog,
  onSetAmount,
  onFillRight,
  onRemoveRow,
  onAddRow,
  onCreateCategory,
}: BudgetPlanGridProps & {
  kind: PlanKind;
  index: Map<string, number>;
  focusIndex: number;
  monthTotals: ReturnType<typeof planTotals>[];
  yearTotal: number;
}) {
  const styles = KIND_STYLES[kind];
  const rows = plannedCategories(entries, kind);
  const options = resolveCategories(catalog, kind).filter((option) => !rows.includes(option.slug));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  async function createFromDraft() {
    const label = draft.trim();
    if (!label || !categorySlug(label)) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    const slug = await onCreateCategory(kind, label);
    setBusy(false);
    if (!slug) {
      setInvalid(true);
      return;
    }
    onAddRow(kind, slug);
    setDraft("");
    setAdding(false);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
      <div className={cn("flex items-center justify-between px-4 py-2", styles.header)}>
        <h2 className="font-display text-sm font-semibold">{CATEGORY_KIND_LABELS[kind]}</h2>
        <span className="font-display text-xs font-semibold tabular-nums">
          {formatMoney(yearTotal)} / yr
        </span>
      </div>

      {/* Desktop grid */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[1080px] px-3 py-2">
          <div className="grid grid-cols-[minmax(160px,1.4fr)_repeat(12,minmax(72px,1fr))_minmax(88px,1.1fr)] gap-1 border-b border-[var(--warm-200)] pb-1 text-right">
            <span className="text-left font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Category
            </span>
            {months.map((month) => (
              <span key={month} className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                {shortMonth(month)}
              </span>
            ))}
            <span className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
          </div>
          {rows.map((category) => (
            <div
              key={category}
              className="group grid grid-cols-[minmax(160px,1.4fr)_repeat(12,minmax(72px,1fr))_minmax(88px,1.1fr)] items-center gap-1 border-b border-[var(--warm-100)] py-0.5"
            >
              <RowLabel
                label={labelFor(catalog, category)}
                onRemove={() => onRemoveRow(kind, category)}
              />
              {months.map((month) => (
                <PlanCell
                  key={month}
                  value={planAmount(index, kind, category, month)}
                  onCommit={(amount) => onSetAmount(kind, category, month, amount)}
                  onFillRight={(amount) => onFillRight(kind, category, month, amount)}
                  canFill={month !== months[months.length - 1]}
                />
              ))}
              <span className="pr-1 text-right font-display text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                {formatMoney(rowTotal(index, kind, category, months))}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[minmax(160px,1.4fr)_repeat(12,minmax(72px,1fr))_minmax(88px,1.1fr)] gap-1 pt-1 text-right">
            <span className="text-left font-display text-xs font-bold">Total</span>
            {monthTotals.map((totals, i) => (
              <span key={months[i]} className={cn("font-display text-xs font-bold tabular-nums", styles.accent)}>
                {formatMoney(totals[kind])}
              </span>
            ))}
            <span className={cn("pr-1 font-display text-xs font-bold tabular-nums", styles.accent)}>
              {formatMoney(yearTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile list: one month at a time */}
      <div className="divide-y divide-[var(--warm-100)] lg:hidden">
        {rows.map((category) => {
          const month = months[focusIndex];
          return (
            <div key={category} className="flex items-center gap-2 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-[var(--text-primary)]">{labelFor(catalog, category)}</p>
                <p className="font-body text-[11px] text-[var(--text-muted)]">
                  {formatMoney(rowTotal(index, kind, category, months))} / yr
                </p>
              </div>
              <PlanCell
                value={planAmount(index, kind, category, month)}
                onCommit={(amount) => onSetAmount(kind, category, month, amount)}
                onFillRight={(amount) => onFillRight(kind, category, month, amount)}
                canFill={month !== months[months.length - 1]}
                wide
              />
              <button
                type="button"
                onClick={() => onRemoveRow(kind, category)}
                aria-label={`Remove ${labelFor(catalog, category)} from the plan`}
                className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-xs font-bold">Total {shortMonth(months[focusIndex])}</span>
          <span className={cn("font-display text-sm font-bold tabular-nums", styles.accent)}>
            {formatMoney(monthTotals[focusIndex]?.[kind] ?? 0)}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--warm-100)] px-4 py-2">
        {adding ? (
          <div className="flex flex-wrap items-center gap-2">
            {options.length > 0 && (
              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  onAddRow(kind, event.target.value);
                  setAdding(false);
                }}
                className="rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
              >
                <option value="">Pick a category…</option>
                {options.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createFromDraft();
              }}
              placeholder="or type a new one"
              className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void createFromDraft()}
              className="rounded-lg bg-[var(--slate-950)] px-3 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft("");
                setInvalid(false);
              }}
              className="font-display text-xs font-semibold text-[var(--text-muted)]"
            >
              Cancel
            </button>
            {invalid && (
              <p className="w-full font-body text-[11px] text-red-700">Use a short name, like rental condo fees.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 font-display text-xs font-semibold text-[var(--emerald-dark)]"
          >
            <Plus className="size-3.5" />
            Add {kind === "income" ? "an income source" : kind === "savings" ? "a savings account" : "an expense"}
          </button>
        )}
      </div>
    </section>
  );
}

function RowLabel({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-1 pl-1">
      <span className="truncate font-body text-sm text-[var(--text-primary)]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} from the plan`}
        className="rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--warm-100)] group-hover:opacity-100 focus:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function PlanCell({
  value,
  onCommit,
  onFillRight,
  canFill,
  wide,
}: {
  value: number | null;
  onCommit: (amount: number) => void;
  onFillRight: (amount: number) => void;
  canFill: boolean;
  wide?: boolean;
}) {
  const display = value == null || value === 0 ? "" : String(value);
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);
  const [seen, setSeen] = useState(display);

  // When the saved value changes under an unfocused cell, show the new value.
  if (seen !== display) {
    setSeen(display);
    if (!focused) setDraft(display);
  }

  function commit() {
    const parsed = parseAmount(draft);
    if (parsed == null) {
      setDraft(display);
      return;
    }
    if (parsed !== (value ?? 0)) onCommit(parsed);
  }

  return (
    <div className={cn("relative", wide ? "w-32" : "")}>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder="–"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          if (event.key === "Escape") {
            setDraft(display);
            (event.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-body text-sm tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 hover:border-[var(--warm-200)] focus:border-[var(--emerald)] focus:bg-white focus:outline-none",
          wide && "border-[var(--warm-200)] bg-white",
          canFill && "pr-6",
        )}
        aria-label="Planned amount"
      />
      {canFill && (
        <button
          type="button"
          tabIndex={-1}
          title="Fill the rest of the year with this amount"
          aria-label="Fill the rest of the year with this amount"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const parsed = parseAmount(draft);
            if (parsed == null) return;
            onFillRight(parsed);
          }}
          className={cn(
            "absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]",
            wide ? "opacity-100" : "opacity-0 focus:opacity-100 group-hover:opacity-100 [input:focus+&]:opacity-100",
          )}
        >
          <ArrowRightToLine className="size-3.5" />
        </button>
      )}
    </div>
  );
}

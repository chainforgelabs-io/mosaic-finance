"use client";

import { useMemo, useRef, useState } from "react";
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
  scheduledMonthAmounts,
  PLAN_KINDS,
  type PlanKind,
} from "@/lib/tracking/budget-plan";
import { CADENCE_LABELS, type RecurringCadence } from "@/lib/tracking/cash-capture";
import { todayIso } from "@/lib/tracking/dates";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry } from "@/types/tracking";

/** Fixed tracks so Income, Expenses, Savings, and To be allocated share one scroll. */
const PLAN_COLUMNS = "240px repeat(12, 108px) 112px";
const CADENCES = Object.keys(CADENCE_LABELS) as RecurringCadence[];

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
  /** Fill every month from one payment amount, a cadence, and a last payment date. */
  onApplySchedule: (kind: PlanKind, category: string, amounts: { month: string; amount: number }[]) => void;
}

function GridRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid items-center", className)} style={{ gridTemplateColumns: PLAN_COLUMNS }}>
      {children}
    </div>
  );
}

export function BudgetPlanGrid(props: BudgetPlanGridProps) {
  const { year, months, entries, catalog, focusMonth, onFocusMonth, onApplySchedule } = props;
  const index = useMemo(() => indexPlan(entries), [entries]);
  const monthTotals = useMemo(
    () => months.map((month) => planTotals(entries, month)),
    [entries, months],
  );
  const yearTotals = useMemo(() => planTotals(entries), [entries]);
  const focusIndex = Math.max(0, months.indexOf(focusMonth));
  const [schedule, setSchedule] = useState<{ kind: PlanKind; category: string; label: string } | null>(null);

  function openSchedule(kind: PlanKind, category: string) {
    setSchedule({ kind, category, label: labelFor(catalog, category) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Month
        </label>
        <select
          value={focusMonth}
          onChange={(event) => onFocusMonth(event.target.value)}
          className="cursor-pointer rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-display text-sm font-semibold"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {new Date(`${month}T00:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 lg:hidden">
        <AllocationRow
          months={months}
          monthTotals={monthTotals}
          yearTotal={yearTotals.toBeAllocated}
          focusIndex={focusIndex}
          year={year}
          layout="mobile"
        />
        {PLAN_KINDS.map((kind) => (
          <PlanSection
            key={kind}
            kind={kind}
            index={index}
            focusIndex={focusIndex}
            monthTotals={monthTotals}
            yearTotal={yearTotals[kind]}
            layout="mobile"
            onOpenSchedule={openSchedule}
            {...props}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--warm-200)] bg-white lg:block">
        <div className="min-w-[1648px]">
          <AllocationRow
            months={months}
            monthTotals={monthTotals}
            yearTotal={yearTotals.toBeAllocated}
            focusIndex={focusIndex}
            year={year}
            layout="desktop"
          />
          {PLAN_KINDS.map((kind) => (
            <PlanSection
              key={kind}
              kind={kind}
              index={index}
              focusIndex={focusIndex}
              monthTotals={monthTotals}
              yearTotal={yearTotals[kind]}
              layout="desktop"
              onOpenSchedule={openSchedule}
              {...props}
            />
          ))}
        </div>
      </div>

      {schedule && (
        <PaymentScheduleSheet
          label={schedule.label}
          year={year}
          onClose={() => setSchedule(null)}
          onApply={(amounts) => {
            onApplySchedule(schedule.kind, schedule.category, amounts);
            setSchedule(null);
          }}
        />
      )}
    </div>
  );
}

function AllocationRow({
  months,
  monthTotals,
  yearTotal,
  focusIndex,
  year,
  layout,
}: {
  months: string[];
  monthTotals: ReturnType<typeof planTotals>[];
  yearTotal: number;
  focusIndex: number;
  year: number;
  layout: "mobile" | "desktop";
}) {
  const focus = monthTotals[focusIndex];
  if (layout === "mobile") {
    return (
      <div className="rounded-xl border border-[var(--warm-200)] bg-white p-4">
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">To be allocated</h2>
        <p className="mt-0.5 font-body text-xs text-[var(--text-muted)]">Income minus planned expenses and savings</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label={shortMonth(months[focusIndex])} value={focus?.toBeAllocated ?? 0} signed />
          <Stat label={`${year} total`} value={yearTotal} signed />
        </div>
      </div>
    );
  }
  return (
    <GridRow className="border-b border-[var(--warm-200)] py-3">
      <div className="px-3 text-left">
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">To be allocated</h2>
        <p className="mt-0.5 font-body text-[11px] leading-snug text-[var(--text-muted)]">
          Income minus planned expenses and savings
        </p>
      </div>
      {months.map((month, i) => (
        <span
          key={month}
          className={cn(
            "overflow-hidden text-ellipsis whitespace-nowrap px-1 text-right font-display text-xs font-semibold tabular-nums",
            monthTotals[i].toBeAllocated < 0 ? "text-red-700" : "text-[var(--emerald-dark)]",
          )}
        >
          {formatMoney(monthTotals[i].toBeAllocated)}
        </span>
      ))}
      <span
        className={cn(
          "overflow-hidden text-ellipsis whitespace-nowrap px-2 text-right font-display text-xs font-bold tabular-nums",
          yearTotal < 0 ? "text-red-700" : "text-[var(--emerald-dark)]",
        )}
      >
        {formatMoney(yearTotal)}
      </span>
    </GridRow>
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
  layout,
  onSetAmount,
  onFillRight,
  onRemoveRow,
  onAddRow,
  onCreateCategory,
  onOpenSchedule,
}: BudgetPlanGridProps & {
  kind: PlanKind;
  index: Map<string, number>;
  focusIndex: number;
  monthTotals: ReturnType<typeof planTotals>[];
  yearTotal: number;
  layout: "mobile" | "desktop";
  onOpenSchedule: (kind: PlanKind, category: string) => void;
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

  const addRow = (
    <div className="border-t border-[var(--warm-100)] px-3 py-2">
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
              className="cursor-pointer rounded-lg border border-[var(--warm-200)] px-2 py-1.5 font-body text-sm"
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
            className="cursor-pointer rounded-lg bg-[var(--slate-950)] px-3 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-50"
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
            className="cursor-pointer font-display text-xs font-semibold text-[var(--text-muted)]"
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
          className="inline-flex cursor-pointer items-center gap-1 font-display text-xs font-semibold text-[var(--emerald-dark)]"
        >
          <Plus className="size-3.5" />
          Add {kind === "income" ? "an income source" : kind === "savings" ? "a savings account" : "an expense"}
        </button>
      )}
    </div>
  );

  if (layout === "desktop") {
    return (
      <section className="border-t border-[var(--warm-200)]">
        <div className={cn("flex items-center justify-between px-3 py-2", styles.header)}>
          <h2 className="font-display text-sm font-semibold">{CATEGORY_KIND_LABELS[kind]}</h2>
          <span className="font-display text-xs font-semibold tabular-nums">{formatMoney(yearTotal)} / yr</span>
        </div>
        <GridRow className="border-b border-[var(--warm-200)] py-1">
          <span className="px-3 text-left font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Category
          </span>
          {months.map((month) => (
            <span
              key={month}
              className="px-1 text-right font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]"
            >
              {shortMonth(month)}
            </span>
          ))}
          <span className="px-2 text-right font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Total
          </span>
        </GridRow>
        {rows.map((category) => (
          <GridRow key={category} className="group border-b border-[var(--warm-100)] py-0.5">
            <RowLabel
              label={labelFor(catalog, category)}
              onOpen={() => onOpenSchedule(kind, category)}
              onRemove={() => onRemoveRow(kind, category)}
            />
            {months.map((month) => (
              <PlanCell
                key={month}
                value={planAmount(index, kind, category, month)}
                onCommit={(amount) => onSetAmount(kind, category, month, amount)}
                onFillRight={(amount) => onFillRight(kind, category, month, amount)}
                canFill={month !== months[months.length - 1]}
                label={`${shortMonth(month)} for ${labelFor(catalog, category)}`}
              />
            ))}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap px-2 text-right font-display text-xs font-semibold tabular-nums text-[var(--text-primary)]">
              {formatMoney(rowTotal(index, kind, category, months))}
            </span>
          </GridRow>
        ))}
        <GridRow className="py-1">
          <span className="px-3 text-left font-display text-xs font-bold">Total</span>
          {monthTotals.map((totals, i) => (
            <span
              key={months[i]}
              className={cn(
                "overflow-hidden text-ellipsis whitespace-nowrap px-1 text-right font-display text-xs font-bold tabular-nums",
                styles.accent,
              )}
            >
              {formatMoney(totals[kind])}
            </span>
          ))}
          <span
            className={cn(
              "overflow-hidden text-ellipsis whitespace-nowrap px-2 text-right font-display text-xs font-bold tabular-nums",
              styles.accent,
            )}
          >
            {formatMoney(yearTotal)}
          </span>
        </GridRow>
        {addRow}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
      <div className={cn("flex items-center justify-between px-4 py-2", styles.header)}>
        <h2 className="font-display text-sm font-semibold">{CATEGORY_KIND_LABELS[kind]}</h2>
        <span className="font-display text-xs font-semibold tabular-nums">{formatMoney(yearTotal)} / yr</span>
      </div>

      <div className="divide-y divide-[var(--warm-100)]">
        {rows.map((category) => {
          const month = months[focusIndex];
          return (
            <div key={category} className="flex items-center gap-2 px-4 py-2">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenSchedule(kind, category)}
                  className="cursor-pointer truncate text-left font-body text-sm text-[var(--text-primary)]"
                >
                  {labelFor(catalog, category)}
                </button>
                <p className="font-body text-[11px] text-[var(--text-muted)]">
                  {formatMoney(rowTotal(index, kind, category, months))} / yr
                </p>
              </div>
              <PlanCell
                value={planAmount(index, kind, category, month)}
                onCommit={(amount) => onSetAmount(kind, category, month, amount)}
                onFillRight={(amount) => onFillRight(kind, category, month, amount)}
                canFill={month !== months[months.length - 1]}
                label={`${shortMonth(month)} for ${labelFor(catalog, category)}`}
                wide
              />
              <button
                type="button"
                onClick={() => onRemoveRow(kind, category)}
                aria-label={`Remove ${labelFor(catalog, category)} from the plan`}
                className="cursor-pointer rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
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

      {addRow}
    </section>
  );
}

function RowLabel({ label, onOpen, onRemove }: { label: string; onOpen: () => void; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-1 px-3">
      <button
        type="button"
        onClick={onOpen}
        title={label}
        className="line-clamp-2 cursor-pointer text-left font-body text-sm leading-snug text-[var(--text-primary)]"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} from the plan`}
        className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--warm-100)] group-hover:opacity-100 focus:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function formatCell(value: number): string {
  if (!value) return "";
  const cents = Math.round(value * 100) % 100;
  return cents === 0 ? formatMoney(value) : formatMoneyExact(value);
}

function PlanCell({
  value,
  onCommit,
  onFillRight,
  canFill,
  wide,
  label,
}: {
  value: number | null;
  onCommit: (amount: number) => void;
  onFillRight: (amount: number) => void;
  canFill: boolean;
  wide?: boolean;
  label: string;
}) {
  const display = formatCell(value ?? 0);
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);
  const [seen, setSeen] = useState(display);
  const skipCommit = useRef(false);

  if (seen !== display) {
    setSeen(display);
    if (!focused) setDraft(display);
  }

  function commit() {
    const parsed = parseAmount(draft);
    if (parsed == null) {
      setDraft(display);
      return parsed;
    }
    if (parsed !== (value ?? 0)) onCommit(parsed);
    return parsed;
  }

  return (
    <div className={cn("group/cell flex items-center", wide ? "w-36" : "min-w-0")}>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? draft : display}
        placeholder="–"
        onFocus={() => {
          setFocused(true);
          setDraft(value == null || value === 0 ? "" : String(value));
        }}
        onBlur={() => {
          if (skipCommit.current) {
            skipCommit.current = false;
            setFocused(false);
            setDraft(display);
            return;
          }
          const parsed = commit();
          setFocused(false);
          setDraft(parsed == null ? display : formatCell(parsed));
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          if (event.key === "Escape") {
            skipCommit.current = true;
            setDraft(display);
            (event.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-right font-body text-xs tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 hover:border-[var(--warm-200)] focus:border-[var(--emerald)] focus:bg-white focus:outline-none",
          wide && "border-[var(--warm-200)] bg-white text-sm",
        )}
        aria-label={label}
      />
      {canFill && (
        <button
          type="button"
          tabIndex={-1}
          title="Fill the rest of the year with this amount"
          aria-label="Fill the rest of the year with this amount"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const parsed = parseAmount(focused ? draft : display);
            if (parsed == null) return;
            onFillRight(parsed);
          }}
          className={cn(
            "shrink-0 cursor-pointer rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]",
            wide ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within/cell:opacity-100",
          )}
        >
          <ArrowRightToLine className="size-3" />
        </button>
      )}
    </div>
  );
}

function PaymentScheduleSheet({
  label,
  year,
  onClose,
  onApply,
}: {
  label: string;
  year: number;
  onClose: () => void;
  onApply: (amounts: { month: string; amount: number }[]) => void;
}) {
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<RecurringCadence>("biweekly");
  const [lastPaid, setLastPaid] = useState(todayIso());
  const parsed = parseAmount(amount);
  const preview =
    parsed != null && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(lastPaid)
      ? scheduledMonthAmounts(parsed, cadence, lastPaid, year)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-xl"
        role="dialog"
        aria-labelledby="payment-schedule-title"
      >
        <h2 id="payment-schedule-title" className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {label}
        </h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
          Enter one payment, how often it happens, and the date of the last payment. Each month is filled with the
          payments that fall in it. A payment every 2 weeks lands twice in some months and three times in others.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">Amount each time</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="863.47"
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm tabular-nums"
            />
          </label>
          <label className="block">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">How often</span>
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as RecurringCadence)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
            >
              {CADENCES.map((option) => (
                <option key={option} value={option}>
                  {CADENCE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">Last payment date</span>
            <input
              type="date"
              value={lastPaid}
              onChange={(event) => setLastPaid(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
            />
          </label>
        </div>
        {preview && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {preview.map((slot) => (
              <div key={slot.month} className="rounded-lg bg-[var(--warm-50)] px-2 py-1.5">
                <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  {shortMonth(slot.month)}
                </p>
                <p className="font-display text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {slot.count === 0 ? "—" : formatMoneyExact(slot.amount)}
                </p>
                <p className="font-body text-[10px] text-[var(--text-muted)]">
                  {slot.count === 0 ? "No payment" : `${slot.count} ${slot.count === 1 ? "payment" : "payments"}`}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!preview}
            onClick={() => preview && onApply(preview.map((slot) => ({ month: slot.month, amount: slot.amount })))}
            className="flex-1 cursor-pointer rounded-lg bg-[var(--slate-950)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
          >
            Fill the year
          </button>
        </div>
      </div>
    </div>
  );
}

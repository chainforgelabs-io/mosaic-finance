"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightToLine, ChevronDown, Pencil, Plus, X } from "lucide-react";
import { AmountPad } from "@/components/tracking/AmountPad";
import {
  CATEGORY_KIND_LABELS,
  categorySlug,
  isSpendingCategory,
  labelFor,
  resolveCategories,
  SPENDING_CATEGORIES,
  SPENDING_CATEGORY_LABELS,
  type SpendingCategory,
  type UserCategory,
} from "@/lib/tracking/categories";
import {
  indexPlan,
  monthAmountsFromRow,
  needsAnchorDate,
  planAmount,
  plannedCategories,
  planTotals,
  rowTotal,
  PLAN_KINDS,
  type PlanKind,
} from "@/lib/tracking/budget-plan";
import { amountFromDigits, CADENCE_LABELS, type AmountBasis, type RecurringCadence } from "@/lib/tracking/cash-capture";
import { todayIso } from "@/lib/tracking/dates";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, BudgetPlanSchedule } from "@/types/tracking";

type HowOften = RecurringCadence | "variable";

/** One table, fixed tracks, so every section shares the same vertical lines. */
const NAME_COL = 280;
const MONTH_COL = 108;
const TOTAL_COL = 112;
const PLAN_WIDTH = NAME_COL + 12 * MONTH_COL + TOTAL_COL;
/** Room for the fill arrow, shared by headers and amounts so the digits share one right edge. */
const MONTH_PAD = "pr-5";
const STICKY =
  "sticky left-0 z-20 bg-white shadow-[4px_0_8px_-4px_rgba(28,25,23,0.28)]";
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
  /** Scroll that month into view on the desktop grid. */
  pinFocus?: boolean;
  onFocusMonth: (month: string) => void;
  onSetAmount: (kind: PlanKind, category: string, month: string, amount: number) => void;
  onFillRight: (kind: PlanKind, category: string, month: string, amount: number) => void;
  onRemoveRow: (kind: PlanKind, category: string) => void;
  onAddRow: (kind: PlanKind, category: string) => void;
  onCreateCategory: (kind: PlanKind, label: string) => Promise<string | null>;
  schedules: BudgetPlanSchedule[];
  /** Fill every month from one payment amount, a cadence, and a last payment date. */
  onApplySchedule: (
    kind: PlanKind,
    category: string,
    amounts: { month: string; amount: number }[],
    schedule: BudgetPlanSchedule,
  ) => void;
  onRename: (kind: PlanKind, category: string, label: string) => void;
}

function MonthText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "block w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-display text-xs tabular-nums",
        MONTH_PAD,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BudgetPlanGrid(props: BudgetPlanGridProps) {
  const { year, months, entries, catalog, focusMonth, pinFocus, onFocusMonth, onApplySchedule, onRename, schedules } = props;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const index = useMemo(() => indexPlan(entries), [entries]);
  const monthTotals = useMemo(
    () => months.map((month) => planTotals(entries, month)),
    [entries, months],
  );
  const yearTotals = useMemo(() => planTotals(entries), [entries]);
  const focusIndex = Math.max(0, months.indexOf(focusMonth));
  const [schedule, setSchedule] = useState<{ kind: PlanKind; category: string; label: string } | null>(null);

  useEffect(() => {
    if (!pinFocus) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollLeft = focusIndex * MONTH_COL;
  }, [pinFocus, focusIndex]);

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

      <div ref={scrollerRef} className="hidden overflow-x-auto rounded-xl border border-[var(--warm-200)] bg-white lg:block">
        <table
          className="border-separate border-spacing-0 [&_td]:border-b [&_td]:border-[var(--warm-100)] [&_th]:border-b [&_th]:border-[var(--warm-100)]"
          style={{ width: PLAN_WIDTH, tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: NAME_COL }} />
            {months.map((month) => (
              <col key={month} style={{ width: MONTH_COL }} />
            ))}
            <col style={{ width: TOTAL_COL }} />
          </colgroup>
          <tbody>
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
          </tbody>
        </table>
      </div>

      {schedule && (
        <PaymentScheduleSheet
          label={schedule.label}
          kind={schedule.kind}
          year={year}
          saved={schedules.find((row) => row.kind === schedule.kind && row.category === schedule.category)}
          onClose={() => setSchedule(null)}
          onApply={(amounts, next, name) => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== schedule.label) onRename(schedule.kind, schedule.category, trimmed);
            onApplySchedule(schedule.kind, schedule.category, amounts, {
              kind: schedule.kind,
              category: schedule.category,
              ...next,
            });
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
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
          {balanceWord(focus?.toBeAllocated ?? 0)}
        </h2>
        <p className="mt-0.5 font-body text-xs text-[var(--text-muted)]">Income minus planned expenses and savings</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label={shortMonth(months[focusIndex])} value={focus?.toBeAllocated ?? 0} signed />
          <Stat label={`${year} total`} value={yearTotal} signed />
        </div>
      </div>
    );
  }
  return (
    <tr className="border-b border-[var(--warm-200)]">
      <th className={cn(STICKY, "px-3 py-3 text-left align-middle")}>
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">{balanceWord(yearTotal)}</h2>
        <p className="mt-0.5 font-body text-[11px] font-normal leading-snug text-[var(--text-muted)]">
          Income minus planned expenses and savings
        </p>
      </th>
      {months.map((month, i) => (
        <td key={month} className="align-middle">
          <MonthText
            className={cn(
              "font-semibold",
              monthTotals[i].toBeAllocated < 0 ? "text-red-700" : "text-[var(--emerald-dark)]",
            )}
          >
            {formatMoney(monthTotals[i].toBeAllocated)}
          </MonthText>
        </td>
      ))}
      <td className="align-middle">
        <MonthText className={cn("font-bold", yearTotal < 0 ? "text-red-700" : "text-[var(--emerald-dark)]")}>
          {formatMoney(yearTotal)}
        </MonthText>
      </td>
    </tr>
  );
}

function balanceWord(value: number): "Surplus" | "Deficit" {
  return value < 0 ? "Deficit" : "Surplus";
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
  year,
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
  schedules,
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
  const [open, setOpen] = useState(true);

  function toggleOpen() {
    setOpen((value) => !value);
  }

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
    <div>
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
      <>
        <tr onClick={toggleOpen} className="cursor-pointer">
          <th className={cn(STICKY, styles.header, "p-0 text-left")}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleOpen();
              }}
              aria-expanded={open}
              className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-left font-display text-sm font-semibold"
            >
              <ChevronDown className={cn("size-3.5 shrink-0 transition", open && "rotate-180")} />
              {CATEGORY_KIND_LABELS[kind]}
            </button>
          </th>
          {open ? (
            <th className={styles.header} colSpan={12} />
          ) : (
            months.map((month, i) => (
              <td key={month} className={cn(styles.header, "py-2 align-middle")}>
                <MonthText className="font-bold">{formatMoney(monthTotals[i]?.[kind] ?? 0)}</MonthText>
              </td>
            ))
          )}
          <th className={cn(styles.header, "py-2 text-right font-display text-xs font-semibold")}>
            <MonthText>{formatMoney(yearTotal)} / yr</MonthText>
          </th>
        </tr>
        {open && (
        <>
        <tr className="border-b border-[var(--warm-200)]">
          <th
            className={cn(
              STICKY,
              "px-3 py-1 text-left font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]",
            )}
          >
            Category
          </th>
          {months.map((month) => (
            <th
              key={month}
              className="py-1 font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
            >
              <MonthText>{shortMonth(month)}</MonthText>
            </th>
          ))}
          <th className="py-1 font-body text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            <MonthText>Total</MonthText>
          </th>
        </tr>
        {rows.map((category) => {
          const name = labelFor(catalog, category);
          const saved = schedules.find((row) => row.kind === kind && row.category === category);
          const slots = saved
            ? monthAmountsFromRow(saved.amount, saved.cadence, saved.basis, saved.anchor_date, year)
            : [];
          const slotByMonth = new Map(slots.map((slot) => [slot.month, slot]));
          return (
            <tr key={category} className="group border-b border-[var(--warm-100)]">
              <th className={cn(STICKY, "px-2 py-0.5 text-left font-normal")}>
                <RowLabel
                  label={name}
                  detail={kind === "expense" && saved?.spend_category && isSpendingCategory(saved.spend_category) ? SPENDING_CATEGORY_LABELS[saved.spend_category] : undefined}
                  onOpen={() => onOpenSchedule(kind, category)}
                  onRemove={() => onRemoveRow(kind, category)}
                />
              </th>
              {months.map((month) => {
                const value = planAmount(index, kind, category, month);
                const slot = slotByMonth.get(month);
                const hits =
                  slot && slot.count > 1 && Math.abs(slot.amount - (value ?? 0)) < 0.02 ? slot.count : 0;
                return (
                <td key={month} className="relative z-0 py-0.5 align-middle">
                  <PlanCell
                    value={value}
                    onCommit={(amount) => onSetAmount(kind, category, month, amount)}
                    onFillRight={(amount) => onFillRight(kind, category, month, amount)}
                    canFill={month !== months[months.length - 1]}
                    label={`${shortMonth(month)} for ${name}`}
                    hits={hits}
                  />
                </td>
                );
              })}
              <td className="align-middle">
                <MonthText className="font-semibold text-[var(--text-primary)]">
                  {formatMoney(rowTotal(index, kind, category, months))}
                </MonthText>
              </td>
            </tr>
          );
        })}
        <tr>
          <th className={cn(STICKY, "px-3 py-1 text-left font-display text-xs font-bold")}>Total</th>
          {monthTotals.map((totals, i) => (
            <td key={months[i]} className="py-1 align-middle">
              <MonthText className={cn("font-bold", styles.accent)}>{formatMoney(totals[kind])}</MonthText>
            </td>
          ))}
          <td className="align-middle">
            <MonthText className={cn("font-bold", styles.accent)}>{formatMoney(yearTotal)}</MonthText>
          </td>
        </tr>
        <tr>
          <td colSpan={14} className="border-b border-[var(--warm-100)] p-0">
            <div className={cn(STICKY, "px-3 py-2")} style={{ width: adding ? 560 : NAME_COL }}>
              {addRow}
            </div>
          </td>
        </tr>
        </>
        )}
      </>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className={cn("flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left", styles.header)}
      >
        <span className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <ChevronDown className={cn("size-3.5 shrink-0 transition", open && "rotate-180")} />
          {CATEGORY_KIND_LABELS[kind]}
        </span>
        <span className="flex items-center gap-3 font-display text-xs font-semibold tabular-nums">
          {!open && <span>{formatMoney(monthTotals[focusIndex]?.[kind] ?? 0)}</span>}
          <span>{formatMoney(yearTotal)} / yr</span>
        </span>
      </button>

      {open && (
      <>
      <div className="divide-y divide-[var(--warm-100)]">
        {rows.map((category) => {
          const saved = schedules.find((row) => row.kind === kind && row.category === category);
          const spend = saved?.spend_category;
          return (
            <MobilePlanRow
              key={category}
              name={labelFor(catalog, category)}
              detail={
                kind === "expense" && spend && isSpendingCategory(spend) ? SPENDING_CATEGORY_LABELS[spend] : undefined
              }
              index={index}
              kind={kind}
              category={category}
              months={months}
              focusMonth={months[focusIndex]}
              onOpen={() => onOpenSchedule(kind, category)}
              onRemove={() => onRemoveRow(kind, category)}
              onSetAmount={(month, amount) => onSetAmount(kind, category, month, amount)}
              onFillRight={(month, amount) => onFillRight(kind, category, month, amount)}
            />
          );
        })}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-xs font-bold">Total {shortMonth(months[focusIndex])}</span>
          <span className={cn("font-display text-sm font-bold tabular-nums", styles.accent)}>
            {formatMoney(monthTotals[focusIndex]?.[kind] ?? 0)}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--warm-100)] px-3 py-2">{addRow}</div>
      </>
      )}
    </section>
  );
}

function digitsFromAmount(amount: number): string {
  const cents = Math.round(amount * 100);
  return cents > 0 ? String(cents) : "";
}

function MobilePlanRow({
  name,
  detail,
  index,
  kind,
  category,
  months,
  focusMonth,
  onOpen,
  onRemove,
  onSetAmount,
  onFillRight,
}: {
  name: string;
  detail?: string;
  index: Map<string, number>;
  kind: PlanKind;
  category: string;
  months: string[];
  focusMonth: string;
  onOpen: () => void;
  onRemove: () => void;
  onSetAmount: (month: string, amount: number) => void;
  onFillRight: (month: string, amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const amounts = months.map((month) => planAmount(index, kind, category, month) ?? 0);
  const varies = amounts.some((amount) => Math.abs(amount - amounts[0]) > 0.001);
  const focusAmount = planAmount(index, kind, category, focusMonth) ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-body text-sm leading-snug text-[var(--text-primary)]">{name}</span>
          {detail && <span className="block truncate font-body text-[11px] text-[var(--text-muted)]">{detail}</span>}
          <span className="block font-body text-[11px] text-[var(--text-muted)]">
            {formatMoney(rowTotal(index, kind, category, months))} / yr
          </span>
          {varies && <span className="block font-body text-[11px] text-[var(--text-muted)]">Varies by month</span>}
        </span>
        <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-[var(--text-primary)]">
          {focusAmount ? formatMoney(focusAmount) : "–"}
        </span>
      </button>
      {open && (
        <MonthPlanSheet
          name={name}
          index={index}
          kind={kind}
          category={category}
          months={months}
          focusMonth={focusMonth}
          onClose={() => setOpen(false)}
          onOpenSchedule={() => {
            setOpen(false);
            onOpen();
          }}
          onRemove={() => {
            setOpen(false);
            onRemove();
          }}
          onSetAmount={onSetAmount}
          onFillRight={onFillRight}
        />
      )}
    </>
  );
}

function MonthPlanSheet({
  name,
  index,
  kind,
  category,
  months,
  focusMonth,
  onClose,
  onOpenSchedule,
  onRemove,
  onSetAmount,
  onFillRight,
}: {
  name: string;
  index: Map<string, number>;
  kind: PlanKind;
  category: string;
  months: string[];
  focusMonth: string;
  onClose: () => void;
  onOpenSchedule: () => void;
  onRemove: () => void;
  onSetAmount: (month: string, amount: number) => void;
  onFillRight: (month: string, amount: number) => void;
}) {
  const [selected, setSelected] = useState(focusMonth);
  const [digits, setDigits] = useState(() => digitsFromAmount(planAmount(index, kind, category, focusMonth) ?? 0));

  function stored(month: string): number {
    return planAmount(index, kind, category, month) ?? 0;
  }

  function commit(month: string, raw: string) {
    const amount = amountFromDigits(raw);
    if (Math.abs(amount - stored(month)) < 0.001) return;
    onSetAmount(month, amount);
  }

  function choose(month: string) {
    if (month === selected) return;
    commit(selected, digits);
    setSelected(month);
    setDigits(digitsFromAmount(stored(month)));
  }

  function close() {
    commit(selected, digits);
    onClose();
  }

  const typed = amountFromDigits(digits);
  const canFill = selected !== months[months.length - 1];

  return (
    <div className="phone-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">{name}</h2>
          <button type="button" onClick={close} aria-label="Close" className="phone-hit font-display text-sm text-[var(--text-muted)]">
            Close
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => {
            const amount = month === selected ? typed : stored(month);
            const active = month === selected;
            return (
              <button
                key={month}
                type="button"
                onClick={() => choose(month)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border px-2 py-2 text-left",
                  active
                    ? "border-[var(--emerald)] bg-[var(--emerald-soft)]"
                    : "border-[var(--warm-200)] bg-white",
                )}
              >
                <span className="block font-body text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {shortMonth(month)}
                </span>
                <span className="block font-display text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {amount ? formatMoney(amount) : "–"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <AmountPad digits={digits} onDigitsChange={setDigits} />
        </div>
        {canFill && (
          <button
            type="button"
            onClick={() => {
              commit(selected, digits);
              onFillRight(selected, typed);
            }}
            className="mt-4 w-full rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold text-[var(--text-primary)]"
          >
            Fill the rest of the year
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            commit(selected, digits);
            onOpenSchedule();
          }}
          className="mt-2 w-full rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold text-[var(--text-primary)]"
        >
          Edit the payment schedule
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 w-full rounded-lg py-2.5 font-display text-sm font-semibold text-red-700"
        >
          Remove from the plan
        </button>
      </div>
    </div>
  );
}

function RowLabel({
  label,
  detail,
  onOpen,
  onRemove,
}: {
  label: string;
  detail?: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onOpen}
        title={detail ? `${label} · ${detail}` : label}
        className="min-w-0 flex-1 cursor-pointer truncate text-left font-body text-sm leading-snug text-[var(--text-primary)]"
      >
        <span className="block truncate">{label}</span>
        {detail && <span className="block truncate text-[11px] text-[var(--text-muted)]">{detail}</span>}
      </button>
      <button
        type="button"
        aria-label={`Edit ${label}`}
        title="Edit payment"
        onClick={onOpen}
        className="phone-hit shrink-0 cursor-pointer rounded p-1 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} from the plan`}
        title="Remove from the plan"
        className="phone-hit shrink-0 cursor-pointer rounded p-1 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
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
  hits,
}: {
  value: number | null;
  onCommit: (amount: number) => void;
  onFillRight: (amount: number) => void;
  canFill: boolean;
  wide?: boolean;
  label: string;
  hits?: number;
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
    <div className="relative w-full">
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
          "w-full rounded-md border border-transparent bg-transparent py-1 text-right font-body text-xs tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 hover:border-[var(--warm-200)] focus:border-[var(--emerald)] focus:bg-white focus:outline-none",
          wide ? "border-[var(--warm-200)] bg-white pl-2 pr-5 text-sm" : MONTH_PAD,
        )}
        aria-label={label}
        title={hits != null && hits > 1 ? `${hits} payments this month` : undefined}
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
            "absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]",
            wide ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
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
  kind,
  year,
  saved,
  onClose,
  onApply,
}: {
  label: string;
  kind: PlanKind;
  year: number;
  saved?: BudgetPlanSchedule;
  onClose: () => void;
  onApply: (
    amounts: { month: string; amount: number }[],
    schedule: Omit<BudgetPlanSchedule, "kind" | "category">,
    name: string,
  ) => void;
}) {
  const [name, setName] = useState(label);
  const [spendCategory, setSpendCategory] = useState<SpendingCategory | "">(
    saved?.spend_category && isSpendingCategory(saved.spend_category) ? saved.spend_category : "",
  );
  const [amount, setAmount] = useState(saved ? String(saved.amount) : "");
  const [basis, setBasis] = useState<AmountBasis>(saved?.basis ?? "each");
  const [cadence, setCadence] = useState<HowOften>(saved ? saved.cadence ?? "variable" : "biweekly");
  const [lastPaid, setLastPaid] = useState(saved?.anchor_date ?? todayIso());
  const parsed = parseAmount(amount);
  const resolved = cadence === "variable" ? null : cadence;
  const askDate = needsAnchorDate(resolved);
  const preview =
    parsed != null && parsed > 0 && (!askDate || /^\d{4}-\d{2}-\d{2}$/.test(lastPaid))
      ? monthAmountsFromRow(parsed, resolved, basis, lastPaid, year)
      : null;

  return (
    <div className="phone-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-xl"
        role="dialog"
        aria-labelledby="payment-schedule-title"
      >
        <h2 id="payment-schedule-title" className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {label}
        </h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">
          Enter one payment and how often it happens. A payment every 2 weeks lands twice in some months and three
          times in others. Groceries and other envelopes can stay the same amount each month.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
            />
          </label>
          {kind === "expense" && (
            <label className="block sm:col-span-2">
              <span className="font-body text-xs font-medium text-[var(--text-muted)]">Category</span>
              <select
                value={spendCategory}
                onChange={(event) => setSpendCategory(event.target.value as SpendingCategory | "")}
                className="mt-1 w-full cursor-pointer rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
              >
                <option value="">Choose a category</option>
                {SPENDING_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {SPENDING_CATEGORY_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">Amount</span>
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
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">This figure is</span>
            <select
              value={basis}
              onChange={(event) => setBasis(event.target.value as AmountBasis)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
            >
              <option value="each">Each time</option>
              <option value="year">Per year</option>
            </select>
          </label>
          <label className="block">
            <span className="font-body text-xs font-medium text-[var(--text-muted)]">How often</span>
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as HowOften)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
            >
              <option value="variable">Same amount each month</option>
              {CADENCES.map((option) => (
                <option key={option} value={option}>
                  {CADENCE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          {askDate && (
            <label className="block">
              <span className="font-body text-xs font-medium text-[var(--text-muted)]">Last payment date</span>
              <input
                type="date"
                value={lastPaid}
                onChange={(event) => setLastPaid(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
              />
            </label>
          )}
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
            disabled={!preview || !name.trim() || (kind === "expense" && !spendCategory)}
            onClick={() =>
              preview &&
              parsed != null &&
              name.trim() &&
              (kind !== "expense" || spendCategory) &&
              onApply(
                preview.map((slot) => ({ month: slot.month, amount: slot.amount })),
                {
                  amount: parsed,
                  basis,
                  cadence: resolved,
                  anchor_date: askDate ? lastPaid : null,
                  spend_category: kind === "expense" ? spendCategory : null,
                },
                name.trim(),
              )
            }
            className="flex-1 cursor-pointer rounded-lg bg-[var(--slate-950)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
          >
            Fill the year
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { NetWorthHistoryChart } from "@/components/charts/NetWorthHistoryChart";
import { MonthlyCheckIn } from "@/components/tracking/MonthlyCheckIn";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  groupComparison,
  lineSeries,
  liquidity,
  monthsSinceLastSnapshot,
  netWorthComparison,
  snapshotGroups,
  snapshotMonths,
  type ComparisonRow,
  type GroupComparison,
} from "@/lib/net-worth/tracking";
import { formatMonthLabel, monthKey, todayIso } from "@/lib/tracking/dates";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import type { NetWorthSnapshotRow } from "@/types/tracking";

interface HoldingAccount {
  id: string;
  account_type: string;
  total_value: number;
}

interface FixedAsset {
  id: string;
  name: string;
  estimated_value: number;
}

interface DebtItem {
  type: string;
  amount: number;
  rate?: number;
  monthly_payment?: number;
  credit_limit?: number | null;
  term?: "short" | "long" | null;
}

interface PageData {
  snapshots: NetWorthSnapshotRow[];
  holdings: HoldingAccount[];
  fixedAssets: FixedAsset[];
  debts: DebtItem[];
}

async function loadAll(): Promise<PageData> {
  const [snapRes, holdRes] = await Promise.all([
    fetch("/api/net-worth/snapshots", { credentials: "include" }),
    fetch("/api/holdings", { credentials: "include" }),
  ]);
  const snapshots = snapRes.ok ? (((await snapRes.json()).snapshots ?? []) as NetWorthSnapshotRow[]) : [];
  let holdings: HoldingAccount[] = [];
  let fixedAssets: FixedAsset[] = [];
  let debts: DebtItem[] = [];
  if (holdRes.ok) {
    const json = await holdRes.json();
    holdings = (json.holdings ?? []) as HoldingAccount[];
    fixedAssets = (json.fixedAssets ?? []) as FixedAsset[];
    const raw = (json.financialProfile?.major_debts ?? []) as Array<{
      type: string;
      amount?: number;
      balance?: number;
      rate?: number;
      monthly_payment?: number;
      credit_limit?: number | null;
      term?: "short" | "long" | null;
    }>;
    debts = raw.map((d) => ({
      type: d.type,
      amount: Number(d.amount ?? d.balance ?? 0),
      rate: d.rate,
      monthly_payment: d.monthly_payment,
      credit_limit: d.credit_limit,
      term: d.term,
    }));
  }
  return { snapshots, holdings, fixedAssets, debts };
}

function pct(value: number | null, digits = 1): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function signed(value: number | null): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatMoney(Math.abs(value))}`;
}

function monthLabel(key: string): string {
  return formatMonthLabel(`${key}-01`);
}

export default function NetWorthTrackingPage() {
  const today = todayIso();
  const [data, setData] = useState<PageData | null>(null);
  const [month, setMonth] = useState<string>(() => monthKey(today));
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadAll().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const snapshots = useMemo(() => data?.snapshots ?? [], [data]);
  const months = useMemo(() => {
    const set = new Set(snapshotMonths(snapshots));
    set.add(monthKey(today));
    return [...set].sort().reverse();
  }, [snapshots, today]);
  const monthIndex = months.indexOf(month);

  const comparison = useMemo(() => netWorthComparison(snapshots, month), [snapshots, month]);
  const { current: currentSnapshot, previousMonth: previousSnapshot } = comparison;
  const groups = currentSnapshot ? snapshotGroups(currentSnapshot) : null;
  const table = groupComparison(currentSnapshot, previousSnapshot);
  const series = useMemo(() => lineSeries(snapshots), [snapshots]);
  const staleMonths = monthsSinceLastSnapshot(snapshots, today);
  const latest = snapshots.length > 0 ? [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))[snapshots.length - 1] : null;
  const currentIsFallback = comparison.current != null && monthKey(comparison.current.snapshot_date) !== month;

  function step(delta: number) {
    const next = months[monthIndex + delta];
    if (next) setMonth(next);
  }

  async function refresh() {
    setData(await loadAll());
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Net worth tracking</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Net worth tracking</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            {latest
              ? `Last updated ${formatMonthLabel(latest.snapshot_date)}. Update once a month so each point on the line is a real reading.`
              : "Save a monthly check-in to start the history. Update once a month so each point on the line is a real reading."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCheckInOpen(true)}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)]"
        >
          <CalendarCheck className="size-4" />
          Monthly check-in
        </button>
      </div>

      {staleMonths != null && staleMonths >= 1 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-body text-sm text-amber-800">
          {staleMonths === 1
            ? "No snapshot this month yet. Run the monthly check-in to add this month's reading."
            : `No snapshot for ${staleMonths} months. Run the monthly check-in to catch up; the line will pick up from here.`}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-lg border border-[var(--warm-200)] bg-white">
          <button
            type="button"
            onClick={() => step(1)}
            disabled={monthIndex < 0 || monthIndex >= months.length - 1}
            className="rounded-l-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
            aria-label="Earlier month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="bg-transparent px-1 py-2 font-display text-sm font-semibold"
            aria-label="Period"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={monthIndex <= 0}
            className="rounded-r-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
            aria-label="Later month"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        {currentIsFallback && comparison.current && (
          <p className="font-body text-xs text-[var(--text-muted)]">
            No snapshot in {monthLabel(month)}; showing {formatMonthLabel(comparison.current.snapshot_date)}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Current net worth" value={comparison.netWorth == null ? "—" : formatMoney(comparison.netWorth)} hint={comparison.current ? `as of ${formatMonthLabel(comparison.current.snapshot_date)}` : "no snapshot yet"} />
        <Tile
          label="Since last month"
          value={signed(comparison.sinceLastMonth.amount)}
          hint={comparison.previousMonth ? `vs ${formatMonthLabel(comparison.previousMonth.snapshot_date)} · ${pct(comparison.sinceLastMonth.pct)}` : "needs two snapshots"}
          tone={toneFor(comparison.sinceLastMonth.amount)}
        />
        <Tile
          label="Since last year"
          value={signed(comparison.sinceLastYear.amount)}
          hint={comparison.previousYear ? `vs ${formatMonthLabel(comparison.previousYear.snapshot_date)}` : "needs a year of history"}
          tone={toneFor(comparison.sinceLastYear.amount)}
        />
        <Tile
          label="Change since last year"
          value={pct(comparison.sinceLastYear.pct)}
          hint={comparison.previousYear ? "of last year's net worth" : "needs a year of history"}
          tone={toneFor(comparison.sinceLastYear.pct)}
        />
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--warm-200)] bg-white p-8 text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">No readings yet</p>
          <p className="mx-auto mt-1 max-w-md font-body text-sm text-[var(--text-muted)]">
            The monthly check-in walks through your accounts, assets, and debts, then saves one snapshot for the month. Each month after that adds a point to the line and a column to the table.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setCheckInOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2 font-display text-sm font-semibold text-white"
            >
              <CalendarCheck className="size-4" />
              Start the first check-in
            </button>
            <Link
              href="/dashboard/assets"
              className="inline-flex min-h-10 items-center rounded-lg border border-[var(--warm-200)] px-4 py-2 font-display text-sm font-semibold text-[var(--text-primary)]"
            >
              Review what is on file
            </Link>
          </div>
        </div>
      ) : (
        <>
          <NetWorthHistoryChart
            data={series}
            title="Net worth over time"
            subtitle="One point per monthly check-in. Toggle assets and liabilities to see what moved the line."
            showToggles
            height={260}
          />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--warm-200)] px-4 py-3">
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Breakdown</h2>
                <p className="font-body text-xs text-[var(--text-muted)]">
                  {comparison.current ? formatMonthLabel(comparison.current.snapshot_date) : "—"}
                  {" vs "}
                  {comparison.previousMonth ? formatMonthLabel(comparison.previousMonth.snapshot_date) : "no earlier snapshot"}
                </p>
              </div>
              <div className="hidden grid-cols-[minmax(140px,2fr)_repeat(3,minmax(84px,1fr))_minmax(72px,0.8fr)] gap-2 border-b border-[var(--warm-100)] px-4 py-1.5 font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)] sm:grid">
                <span>Item</span>
                <span className="text-right">This period</span>
                <span className="text-right">Previous</span>
                <span className="text-right">Diff $</span>
                <span className="text-right">Diff %</span>
              </div>
              {table.groups.map((group) => (
                <GroupBlock key={group.group} group={group} />
              ))}
              <div className="border-t border-[var(--warm-200)] bg-[var(--warm-50)]">
                <Row row={table.assets} bold />
                <Row row={table.liabilities} bold />
                <Row row={table.netWorth} bold emphasis />
              </div>
            </section>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-4">
                <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Current liquidity</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                  {groups ? formatMoney(liquidity(groups)) : "—"}
                </p>
                <p className="font-body text-[11px] text-[var(--text-muted)]">
                  Bank balances plus available credit. Add a credit limit to a liability in the check-in to count its room.
                </p>
                {groups && (
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[var(--warm-50)] px-3 py-2">
                      <dt className="font-body text-[11px] text-[var(--text-muted)]">Cash in bank accounts</dt>
                      <dd className="font-display text-sm font-semibold tabular-nums">{formatMoney(groups.cash)}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--warm-50)] px-3 py-2">
                      <dt className="font-body text-[11px] text-[var(--text-muted)]">Available credit</dt>
                      <dd className="font-display text-sm font-semibold tabular-nums">{formatMoney(groups.availableCredit)}</dd>
                    </div>
                  </dl>
                )}
              </div>

              {groups && (
                <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-4">
                  <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">This period</p>
                  <ul className="mt-2 space-y-1.5">
                    <MiniRow label="Liquid assets & investments" value={groups.liquid} />
                    <MiniRow label="Fixed assets" value={groups.fixed} />
                    <MiniRow label="Short-term liabilities" value={groups.shortTerm} negative />
                    <MiniRow label="Long-term liabilities" value={groups.longTerm} negative />
                    <li className="flex items-center justify-between border-t border-[var(--warm-100)] pt-1.5">
                      <span className="font-display text-sm font-semibold">Net worth</span>
                      <span className="font-display text-sm font-bold tabular-nums">{formatMoney(groups.netWorth)}</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <MonthlyCheckIn
        open={checkInOpen}
        holdings={data.holdings}
        fixedAssets={data.fixedAssets}
        debts={data.debts}
        onClose={() => setCheckInOpen(false)}
        onSaved={async (nextUnlocks) => {
          setUnlocks(nextUnlocks);
          setMonth(monthKey(today));
          await refresh();
        }}
      />
      <UnlockToast unlocks={unlocks} onDismiss={() => setUnlocks([])} />
    </div>
  );
}

function toneFor(value: number | null): "good" | "bad" | undefined {
  if (value == null || value === 0) return undefined;
  return value > 0 ? "good" : "bad";
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-3">
      <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-bold tabular-nums sm:text-2xl",
          tone === "bad" ? "text-red-700" : tone === "good" ? "text-[var(--emerald-dark)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="font-body text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function GroupBlock({ group }: { group: GroupComparison }) {
  const empty = group.items.length === 0 && (group.total.current ?? 0) === 0 && (group.total.previous ?? 0) === 0;
  if (empty) return null;
  return (
    <div className="border-b border-[var(--warm-100)] last:border-b-0">
      <div className="bg-[var(--warm-50)]/60 px-4 py-1.5">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{group.label}</p>
      </div>
      <ul>
        {group.items.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ul>
      <Row row={{ ...group.total, label: `Total ${group.label.toLowerCase()}` }} bold />
    </div>
  );
}

function Row({ row, bold, emphasis }: { row: ComparisonRow; bold?: boolean; emphasis?: boolean }) {
  const diff = row.diff;
  const improved = diff != null && diff !== 0 && (row.invert ? diff < 0 : diff > 0);
  const worsened = diff != null && diff !== 0 && (row.invert ? diff > 0 : diff < 0);
  const Arrow = diff == null || diff === 0 ? ArrowRight : diff > 0 ? ArrowUpRight : ArrowDownRight;
  const diffClass = improved ? "text-[var(--emerald-dark)]" : worsened ? "text-red-700" : "text-[var(--text-muted)]";
  return (
    <li className={cn("list-none px-4 py-2", bold && "font-semibold", emphasis && "bg-[var(--warm-100)]/60")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(140px,2fr)_repeat(3,minmax(84px,1fr))_minmax(72px,0.8fr)]">
        <span className="truncate font-body text-sm text-[var(--text-primary)]">{row.label}</span>
        <span className="text-right font-body text-sm tabular-nums text-[var(--text-primary)]">
          {row.current == null ? "—" : formatMoney(row.current)}
        </span>
        <span className="hidden text-right font-body text-sm tabular-nums text-[var(--text-secondary)] sm:block">
          {row.previous == null ? "—" : formatMoney(row.previous)}
        </span>
        <span className={cn("hidden text-right font-body text-sm tabular-nums sm:block", diffClass)}>{signed(diff)}</span>
        <span className={cn("hidden items-center justify-end gap-1 font-body text-sm tabular-nums sm:flex", diffClass)}>
          {pct(row.diffPct)}
          <Arrow className="size-3.5" />
        </span>
      </div>
      {diff != null && diff !== 0 && (
        <p className={cn("mt-0.5 flex items-center gap-1 font-body text-[11px] tabular-nums sm:hidden", diffClass)}>
          <Arrow className="size-3" />
          {signed(diff)} · {pct(row.diffPct)} vs previous
        </p>
      )}
    </li>
  );
}

function MiniRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="font-body text-sm text-[var(--text-secondary)]">{label}</span>
      <span className={cn("font-display text-sm font-semibold tabular-nums", negative ? "text-red-700" : "text-[var(--text-primary)]")}>
        {negative && value > 0 ? "−" : ""}
        {formatMoney(value)}
      </span>
    </li>
  );
}

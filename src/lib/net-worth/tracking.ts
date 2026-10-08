import { addMonths, formatMonthLabel, monthKey } from "@/lib/tracking/dates";
import type { NetWorthSnapshotRow, SnapshotBreakdown, SnapshotBreakdownItem } from "@/types/tracking";

export type LiabilityTerm = "short" | "long";

const SHORT_TERM_HINTS = [
  "credit card",
  "creditcard",
  "visa",
  "mastercard",
  "amex",
  "american express",
  "line of credit",
  "loc",
  "heloc",
  "overdraft",
  "payday",
  "buy now",
  "bnpl",
  "store card",
];

/** Revolving or short-dated balances are short-term; everything else is long-term. */
export function classifyLiability(type: string | null | undefined): LiabilityTerm {
  const text = String(type ?? "").toLowerCase();
  if (!text) return "long";
  const words = text.split(/[^a-z]+/).filter(Boolean);
  for (const hint of SHORT_TERM_HINTS) {
    if (hint.includes(" ") || hint.length > 4) {
      if (text.includes(hint)) return "short";
    } else if (words.includes(hint)) {
      return "short";
    }
  }
  return "long";
}

export const NET_WORTH_GROUPS = ["liquid", "fixed", "shortTerm", "longTerm", "availableCredit"] as const;
export type NetWorthGroup = (typeof NET_WORTH_GROUPS)[number];

export const NET_WORTH_GROUP_LABELS: Record<NetWorthGroup, string> = {
  liquid: "Liquid assets & investments",
  fixed: "Fixed assets",
  shortTerm: "Short-term liabilities",
  longTerm: "Long-term liabilities",
  availableCredit: "Available credit",
};

/** Groups that reduce net worth; a drop in these is good. */
export const LIABILITY_GROUPS: ReadonlySet<NetWorthGroup> = new Set(["shortTerm", "longTerm"]);

export interface SnapshotGroups {
  liquid: number;
  fixed: number;
  shortTerm: number;
  longTerm: number;
  availableCredit: number;
  /** Bank-account balances inside the liquid group. */
  cash: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

type SnapshotLike = Pick<NetWorthSnapshotRow, "investments_total" | "fixed_assets_total" | "debts_total" | "net_worth"> & {
  breakdown?: Partial<SnapshotBreakdown> | null;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isCashAccount(item: SnapshotBreakdownItem): boolean {
  const type = String(item.account_type ?? "").toLowerCase();
  return type === "bank-account" || type === "bank account" || type === "cash" || type === "chequing" || type === "savings";
}

/** Available credit on one liability: limit minus balance, never negative. */
export function availableCreditFor(item: { value: number; credit_limit?: number | null }): number {
  const limit = item.credit_limit;
  if (limit == null || !Number.isFinite(Number(limit))) return 0;
  return Math.max(0, num(limit) - num(item.value));
}

/** Sums a snapshot into the five tracking groups plus cash, assets, liabilities, net worth. */
export function snapshotGroups(snapshot: SnapshotLike): SnapshotGroups {
  const breakdown = snapshot.breakdown ?? {};
  const debts = breakdown.debts ?? [];
  const investments = breakdown.investments ?? [];

  let shortTerm = 0;
  let longTerm = 0;
  let availableCredit = 0;
  if (breakdown.short_term_total != null || breakdown.long_term_total != null) {
    shortTerm = num(breakdown.short_term_total);
    longTerm = num(breakdown.long_term_total);
    availableCredit = num(breakdown.available_credit);
  } else {
    for (const debt of debts) {
      if (classifyLiability(debt.type ?? debt.name) === "short") shortTerm += num(debt.value);
      else longTerm += num(debt.value);
      availableCredit += availableCreditFor(debt);
    }
    // When the item list is missing or stale, trust the stored total.
    const itemTotal = shortTerm + longTerm;
    const storedTotal = num(snapshot.debts_total);
    if (debts.length === 0 || Math.abs(itemTotal - storedTotal) > 0.01) {
      longTerm += storedTotal - itemTotal;
    }
  }

  const cash =
    breakdown.cash_total != null
      ? num(breakdown.cash_total)
      : investments.filter(isCashAccount).reduce((sum, item) => sum + num(item.value), 0);

  const liquid = num(snapshot.investments_total);
  const fixed = num(snapshot.fixed_assets_total);
  const assets = liquid + fixed;
  const liabilities = shortTerm + longTerm;
  return {
    liquid: round(liquid),
    fixed: round(fixed),
    shortTerm: round(shortTerm),
    longTerm: round(longTerm),
    availableCredit: round(availableCredit),
    cash: round(cash),
    assets: round(assets),
    liabilities: round(liabilities),
    netWorth: round(assets - liabilities),
  };
}

/** Cash on hand plus credit that could be drawn today. */
export function liquidity(groups: Pick<SnapshotGroups, "cash" | "availableCredit">): number {
  return round(groups.cash + groups.availableCredit);
}

/** Totals the POST route stores alongside the item lists so history stays comparable. */
export function enrichBreakdown(breakdown: SnapshotBreakdown): SnapshotBreakdown {
  let shortTerm = 0;
  let longTerm = 0;
  let availableCredit = 0;
  for (const debt of breakdown.debts) {
    if (classifyLiability(debt.type ?? debt.name) === "short") shortTerm += num(debt.value);
    else longTerm += num(debt.value);
    availableCredit += availableCreditFor(debt);
  }
  const cash = breakdown.investments.filter(isCashAccount).reduce((sum, item) => sum + num(item.value), 0);
  return {
    ...breakdown,
    short_term_total: round(shortTerm),
    long_term_total: round(longTerm),
    available_credit: round(availableCredit),
    cash_total: round(cash),
    liquidity: round(cash + availableCredit),
  };
}

function sortByDate<T extends { snapshot_date: string }>(snapshots: T[]): T[] {
  return [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
}

/** Snapshot for a month, falling back to the latest one before it. */
export function snapshotForMonth<T extends { snapshot_date: string }>(snapshots: T[], month: string): T | null {
  const key = month.slice(0, 7);
  const sorted = sortByDate(snapshots);
  const exact = sorted.find((s) => monthKey(s.snapshot_date) === key);
  if (exact) return exact;
  const before = sorted.filter((s) => monthKey(s.snapshot_date) < key);
  return before.length > 0 ? before[before.length - 1] : null;
}

export interface Change {
  amount: number | null;
  pct: number | null;
}

function change(current: number | null, previous: number | null): Change {
  if (current == null || previous == null) return { amount: null, pct: null };
  const amount = round(current - previous);
  const pct = previous !== 0 ? Math.round((amount / Math.abs(previous)) * 10000) / 10000 : null;
  return { amount, pct };
}

export interface NetWorthComparison {
  current: NetWorthSnapshotRow | null;
  previousMonth: NetWorthSnapshotRow | null;
  previousYear: NetWorthSnapshotRow | null;
  netWorth: number | null;
  sinceLastMonth: Change;
  sinceLastYear: Change;
}

/**
 * Net worth for the selected month against the snapshot before it and the one a year earlier.
 * "Previous month" is the latest snapshot strictly before the current one, so a skipped month
 * still compares against something.
 */
export function netWorthComparison(snapshots: NetWorthSnapshotRow[], month: string): NetWorthComparison {
  const current = snapshotForMonth(snapshots, month);
  if (!current) {
    return {
      current: null,
      previousMonth: null,
      previousYear: null,
      netWorth: null,
      sinceLastMonth: { amount: null, pct: null },
      sinceLastYear: { amount: null, pct: null },
    };
  }
  const currentKey = monthKey(current.snapshot_date);
  const sorted = sortByDate(snapshots);
  const earlier = sorted.filter((s) => monthKey(s.snapshot_date) < currentKey);
  const previousMonth = earlier.length > 0 ? earlier[earlier.length - 1] : null;
  const yearAgoKey = monthKey(addMonths(`${currentKey}-01`, -12));
  const previousYear = snapshotForMonth(earlier, yearAgoKey);

  const nw = num(current.net_worth);
  return {
    current,
    previousMonth,
    previousYear,
    netWorth: round(nw),
    sinceLastMonth: change(nw, previousMonth ? num(previousMonth.net_worth) : null),
    sinceLastYear: change(nw, previousYear ? num(previousYear.net_worth) : null),
  };
}

export interface LinePoint {
  date: string;
  label: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

/** One point per snapshot, oldest first. */
export function lineSeries(snapshots: NetWorthSnapshotRow[]): LinePoint[] {
  return sortByDate(snapshots).map((s) => {
    const groups = snapshotGroups(s);
    return {
      date: s.snapshot_date,
      label: formatMonthLabel(s.snapshot_date).replace(/ \d{4}$/, ""),
      assets: groups.assets,
      liabilities: groups.liabilities,
      netWorth: groups.netWorth,
    };
  });
}

export interface ComparisonRow {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  diff: number | null;
  diffPct: number | null;
  /** True when a decrease is the good direction. */
  invert: boolean;
}

export interface GroupComparison {
  group: NetWorthGroup;
  label: string;
  items: ComparisonRow[];
  total: ComparisonRow;
}

function itemKey(item: SnapshotBreakdownItem, index: number): string {
  return item.id ?? item.type ?? item.name ?? `item-${index}`;
}

function itemLabel(item: SnapshotBreakdownItem): string {
  return item.name || item.type || item.account_type || "Item";
}

function compareItems(
  currentItems: SnapshotBreakdownItem[],
  previousItems: SnapshotBreakdownItem[],
  valueOf: (item: SnapshotBreakdownItem) => number,
  invert: boolean,
): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  currentItems.forEach((item, i) => {
    const key = itemKey(item, i);
    const existing = rows.get(key);
    rows.set(key, {
      key,
      label: itemLabel(item),
      current: round((existing?.current ?? 0) + valueOf(item)),
      previous: null,
      diff: null,
      diffPct: null,
      invert,
    });
  });
  previousItems.forEach((item, i) => {
    const key = itemKey(item, i);
    const existing = rows.get(key);
    if (existing) {
      existing.previous = round((existing.previous ?? 0) + valueOf(item));
    } else {
      rows.set(key, { key, label: itemLabel(item), current: null, previous: round(valueOf(item)), diff: null, diffPct: null, invert });
    }
  });
  for (const row of rows.values()) {
    const c = change(row.current ?? 0, row.previous ?? 0);
    row.diff = row.current == null && row.previous == null ? null : c.amount;
    row.diffPct = row.previous == null || row.previous === 0 ? null : c.pct;
  }
  return [...rows.values()].sort((a, b) => Math.abs(b.current ?? b.previous ?? 0) - Math.abs(a.current ?? a.previous ?? 0));
}

/**
 * Item-level and group-level comparison between two snapshots. Items are matched by holding id,
 * asset id, or debt type. Either snapshot may be null.
 */
export function groupComparison(
  current: NetWorthSnapshotRow | null,
  previous: NetWorthSnapshotRow | null,
): { groups: GroupComparison[]; assets: ComparisonRow; liabilities: ComparisonRow; netWorth: ComparisonRow } {
  const cur = current ? snapshotGroups(current) : null;
  const prev = previous ? snapshotGroups(previous) : null;
  const curB: Partial<SnapshotBreakdown> = current?.breakdown ?? {};
  const prevB: Partial<SnapshotBreakdown> = previous?.breakdown ?? {};
  const value = (item: SnapshotBreakdownItem) => num(item.value);
  const credit = (item: SnapshotBreakdownItem) => availableCreditFor(item);
  const byTerm = (items: SnapshotBreakdownItem[] | undefined, term: LiabilityTerm) =>
    (items ?? []).filter((d) => classifyLiability(d.type ?? d.name) === term);
  const withCredit = (items: SnapshotBreakdownItem[] | undefined) => (items ?? []).filter((d) => d.credit_limit != null);

  const totalRow = (key: NetWorthGroup | "assets" | "liabilities" | "netWorth", label: string, invert: boolean): ComparisonRow => {
    const c = change(cur ? cur[key] : null, prev ? prev[key] : null);
    return { key, label, current: cur ? cur[key] : null, previous: prev ? prev[key] : null, diff: c.amount, diffPct: c.pct, invert };
  };

  const groups: GroupComparison[] = [
    {
      group: "liquid",
      label: NET_WORTH_GROUP_LABELS.liquid,
      items: compareItems(curB.investments ?? [], prevB.investments ?? [], value, false),
      total: totalRow("liquid", NET_WORTH_GROUP_LABELS.liquid, false),
    },
    {
      group: "fixed",
      label: NET_WORTH_GROUP_LABELS.fixed,
      items: compareItems(curB.fixed_assets ?? [], prevB.fixed_assets ?? [], value, false),
      total: totalRow("fixed", NET_WORTH_GROUP_LABELS.fixed, false),
    },
    {
      group: "shortTerm",
      label: NET_WORTH_GROUP_LABELS.shortTerm,
      items: compareItems(byTerm(curB.debts, "short"), byTerm(prevB.debts, "short"), value, true),
      total: totalRow("shortTerm", NET_WORTH_GROUP_LABELS.shortTerm, true),
    },
    {
      group: "longTerm",
      label: NET_WORTH_GROUP_LABELS.longTerm,
      items: compareItems(byTerm(curB.debts, "long"), byTerm(prevB.debts, "long"), value, true),
      total: totalRow("longTerm", NET_WORTH_GROUP_LABELS.longTerm, true),
    },
    {
      group: "availableCredit",
      label: NET_WORTH_GROUP_LABELS.availableCredit,
      items: compareItems(withCredit(curB.debts), withCredit(prevB.debts), credit, false),
      total: totalRow("availableCredit", NET_WORTH_GROUP_LABELS.availableCredit, false),
    },
  ];

  return {
    groups,
    assets: totalRow("assets", "Total assets", false),
    liabilities: totalRow("liabilities", "Total liabilities", true),
    netWorth: totalRow("netWorth", "Net worth", false),
  };
}

/** Distinct months with a snapshot, newest first, as YYYY-MM. */
export function snapshotMonths(snapshots: Array<{ snapshot_date: string }>): string[] {
  return [...new Set(snapshots.map((s) => monthKey(s.snapshot_date)))].sort().reverse();
}

/** Whole months since the newest snapshot; null when there are none. */
export function monthsSinceLastSnapshot(snapshots: Array<{ snapshot_date: string }>, today: string): number | null {
  if (snapshots.length === 0) return null;
  const latest = sortByDate(snapshots)[snapshots.length - 1];
  const [ly, lm] = latest.snapshot_date.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  return Math.max(0, (ty - ly) * 12 + (tm - lm));
}

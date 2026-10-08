"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { EditSpendSheet } from "@/components/tracking/EditSpendSheet";
import { CATEGORY_KIND_LABELS, labelFor, type UserCategory } from "@/lib/tracking/categories";
import { ledgerHeaderKpis, ledgerRows, yearPeriod, type LedgerRow } from "@/lib/tracking/budget-kpis";
import { type TransactionKind } from "@/lib/tracking/cash-capture";
import { formatMonthLabel, monthKey, todayIso } from "@/lib/tracking/dates";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { fetchCatalog } from "@/lib/tracking/plan-client";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/types/tracking";

type SortKey = "date" | "amount" | "category";
type KindFilter = "all" | TransactionKind;

const KIND_PILL: Record<TransactionKind, string> = {
  income: "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]",
  expense: "bg-red-50 text-red-800",
  savings: "bg-sky-50 text-sky-800",
  neutral: "bg-[var(--warm-100)] text-[var(--text-secondary)]",
};

const KIND_LABEL: Record<TransactionKind, string> = {
  income: "Income",
  expense: "Expense",
  savings: "Savings",
  neutral: "Transfer",
};

const CUSTOM_CATEGORY_KEY = "mosaic-custom-categories";

function loadCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_CATEGORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((slug) => typeof slug === "string") : [];
  } catch {
    return [];
  }
}

async function loadYear(targetYear: number): Promise<{ txns: TransactionRow[]; catalog: UserCategory[] }> {
  const period = yearPeriod(targetYear);
  const [txnRes, catalog] = await Promise.all([
    fetch(`/api/transactions?start=${period.start}&end=${period.end}`, { credentials: "include" }),
    fetchCatalog(),
  ]);
  let txns: TransactionRow[] = [];
  if (txnRes.ok) {
    const json = await txnRes.json();
    txns = (json.transactions ?? []) as TransactionRow[];
  }
  return { txns, catalog };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function LedgerPage() {
  const today = todayIso();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState<string>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [query, setQuery] = useState("");
  const [txns, setTxns] = useState<TransactionRow[]>([]);
  const [catalog, setCatalog] = useState<UserCategory[]>([]);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const loading = loadedYear !== year;
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadYear(year).then((data) => {
      if (cancelled) return;
      setTxns(data.txns);
      setCatalog(data.catalog);
      setCustomCategories(loadCustomCategories());
      setLoadedYear(year);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const reload = useCallback(() => {
    loadYear(year).then((data) => setTxns(data.txns));
  }, [year]);

  const kpis = useMemo(() => ledgerHeaderKpis(txns, today), [txns, today]);
  const rows = useMemo(() => ledgerRows(txns), [txns]);

  const months = useMemo(() => {
    const set = new Set(txns.map((txn) => monthKey(txn.txn_date)));
    return [...set].sort();
  }, [txns]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (month !== "all" && monthKey(row.txn.txn_date) !== month) return false;
      if (kind !== "all" && row.kind !== kind) return false;
      if (needle) {
        const hay = `${row.txn.description ?? ""} ${row.txn.note ?? ""} ${labelFor(catalog, row.txn.category)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.txn.txn_date.localeCompare(b.txn.txn_date) || a.txn.created_at.localeCompare(b.txn.created_at);
      else if (sortKey === "amount") cmp = Number(a.txn.amount) - Number(b.txn.amount);
      else cmp = labelFor(catalog, a.txn.category).localeCompare(labelFor(catalog, b.txn.category));
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [rows, month, kind, query, sortKey, sortDesc, catalog]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key === "date");
    }
  }

  async function handleEdit(
    id: string,
    payload: { txn_date: string; amount: number; category: string; description: string; note?: string },
  ) {
    const res = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...payload, category_confirmed: true }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Could not save this entry.");
    }
    setEditing(null);
    reload();
  }

  function addCategory(slug: string) {
    const next = [...new Set([...loadCustomCategories(), slug])];
    localStorage.setItem(CUSTOM_CATEGORY_KEY, JSON.stringify(next));
    setCustomCategories(next);
  }

  const currentYear = Number(today.slice(0, 4));
  const visibleTotal = visible.reduce((sum, row) => sum + row.effect, 0);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Ledger</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Every entry for the year, with a running balance of money in minus money out.
          </p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-[var(--warm-200)] bg-white">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="rounded-l-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)]"
            aria-label="Previous year"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="px-2 font-display text-sm font-semibold tabular-nums">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            className="rounded-r-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
            aria-label="Next year"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Today" value={formatDate(today)} />
        <Tile
          label="Last entry"
          value={kpis.lastRecord ? formatDate(kpis.lastRecord) : "—"}
          hint={
            kpis.daysSinceLastRecord == null
              ? "Nothing logged yet"
              : kpis.daysSinceLastRecord === 0
                ? "Today"
                : `${kpis.daysSinceLastRecord} day${kpis.daysSinceLastRecord === 1 ? "" : "s"} ago`
          }
        />
        <Tile label="Entries this year" value={String(kpis.recordsThisYear)} hint={`${year === currentYear ? "so far" : "in"} ${year}`} />
        <Tile
          label="Tracking balance"
          value={formatMoney(kpis.trackingBalanceYtd)}
          hint={kpis.trackingBalanceYtd >= 0 ? "income not yet spent or set aside" : "spent or set aside beyond income"}
          tone={kpis.trackingBalanceYtd >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm"
          aria-label="Month"
        >
          <option value="all">All of {year}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(`${m}-01`)}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-full border border-[var(--warm-200)] bg-white p-1">
          {(["all", "income", "expense", "savings"] as KindFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={cn(
                "rounded-full px-3 py-1 font-display text-xs font-semibold",
                kind === option ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
              )}
            >
              {option === "all" ? "All" : option === "neutral" ? "Transfers" : CATEGORY_KIND_LABELS[option]}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search merchant, note, or category"
          className="min-w-0 flex-1 rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-body text-sm sm:max-w-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-10 text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">Nothing here yet</p>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            {txns.length === 0 ? `No entries logged in ${year}.` : "Nothing matches these filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
          <div className="hidden grid-cols-[96px_90px_minmax(120px,1fr)_110px_minmax(120px,1.4fr)_120px_40px] items-center gap-2 border-b border-[var(--warm-200)] bg-[var(--warm-50)] px-4 py-2 font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)] md:grid">
            <SortHeader label="Date" active={sortKey === "date"} desc={sortDesc} onClick={() => toggleSort("date")} />
            <span>Type</span>
            <SortHeader label="Category" active={sortKey === "category"} desc={sortDesc} onClick={() => toggleSort("category")} />
            <SortHeader label="Amount" active={sortKey === "amount"} desc={sortDesc} onClick={() => toggleSort("amount")} right />
            <span>Details</span>
            <span className="text-right">Balance</span>
            <span />
          </div>
          <ul className="divide-y divide-[var(--warm-100)]">
            {visible.map((row) => (
              <LedgerLine key={row.txn.id} row={row} catalog={catalog} onEdit={() => setEditing(row.txn)} />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-[var(--warm-200)] px-4 py-2 font-body text-xs text-[var(--text-muted)]">
            <span>
              {visible.length} {visible.length === 1 ? "entry" : "entries"}
            </span>
            <span className="tabular-nums">
              Net {visibleTotal >= 0 ? "+" : "−"}
              {formatMoneyExact(Math.abs(visibleTotal))}
            </span>
          </div>
        </div>
      )}

      {editing && (
        <EditSpendSheet
          txn={editing}
          extras={customCategories}
          onAddCategory={addCategory}
          onClose={() => setEditing(null)}
          onSave={(payload) => handleEdit(editing.id, payload)}
        />
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-3">
      <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-bold tabular-nums",
          tone === "bad" ? "text-red-700" : tone === "good" ? "text-[var(--emerald-dark)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="font-body text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function SortHeader({
  label,
  active,
  desc,
  onClick,
  right,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  right?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 uppercase tracking-wider", right && "justify-end", active && "text-[var(--text-primary)]")}
    >
      {label}
      {active && (desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
    </button>
  );
}

function LedgerLine({
  row,
  catalog,
  onEdit,
}: {
  row: LedgerRow<TransactionRow>;
  catalog: UserCategory[];
  onEdit: () => void;
}) {
  const { txn } = row;
  const amount = Number(txn.amount);
  const details = txn.description || txn.note || "";
  return (
    <li className="px-4 py-2.5">
      {/* Desktop row */}
      <div className="hidden grid-cols-[96px_90px_minmax(120px,1fr)_110px_minmax(120px,1.4fr)_120px_40px] items-center gap-2 md:grid">
        <span className="font-body text-sm tabular-nums text-[var(--text-secondary)]">{formatDate(txn.txn_date)}</span>
        <span className={cn("w-fit rounded-full px-2 py-0.5 font-display text-[11px] font-semibold", KIND_PILL[row.kind])}>
          {KIND_LABEL[row.kind]}
        </span>
        <span className="truncate font-body text-sm text-[var(--text-primary)]">{labelFor(catalog, txn.category)}</span>
        <span
          className={cn(
            "text-right font-body text-sm font-semibold tabular-nums",
            row.kind === "income" ? "text-[var(--emerald-dark)]" : "text-[var(--text-primary)]",
          )}
        >
          {formatMoneyExact(amount)}
        </span>
        <span className="truncate font-body text-sm text-[var(--text-secondary)]">
          {details}
          {txn.source === "screenshot" && <span className="ml-1 text-[var(--text-muted)]">· statement</span>}
          {txn.category_confirmed === false && <span className="ml-1 text-amber-700">· inbox</span>}
        </span>
        <span className="text-right font-body text-sm tabular-nums text-[var(--text-muted)]">{formatMoney(row.balance)}</span>
        <button
          type="button"
          onClick={onEdit}
          className="justify-self-end rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
          aria-label="Edit entry"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
      {/* Mobile row */}
      <button type="button" onClick={onEdit} className="flex w-full items-start gap-3 text-left md:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 font-display text-[11px] font-semibold", KIND_PILL[row.kind])}>
              {KIND_LABEL[row.kind]}
            </span>
            <span className="truncate font-body text-sm text-[var(--text-primary)]">{labelFor(catalog, txn.category)}</span>
          </div>
          <p className="mt-0.5 truncate font-body text-[11px] text-[var(--text-muted)]">
            {formatDate(txn.txn_date)}
            {details ? ` · ${details}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "font-body text-sm font-semibold tabular-nums",
              row.kind === "income" ? "text-[var(--emerald-dark)]" : "text-[var(--text-primary)]",
            )}
          >
            {formatMoneyExact(amount)}
          </p>
          <p className="font-body text-[11px] tabular-nums text-[var(--text-muted)]">bal {formatMoney(row.balance)}</p>
        </div>
      </button>
    </li>
  );
}

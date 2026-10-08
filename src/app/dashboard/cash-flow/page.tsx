"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Pencil,
  PiggyBank,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { SpendingCategoryChart } from "@/components/charts/SpendingCategoryChart";
import { WeeklySpendChart } from "@/components/charts/WeeklySpendChart";
import { BalanceCheckSheet } from "@/components/tracking/BalanceCheckSheet";
import { CashKeypad } from "@/components/tracking/CashKeypad";
import { CashSetupSheet } from "@/components/tracking/CashSetupSheet";
import { RecurringPanel } from "@/components/tracking/RecurringPanel";
import { SpendInbox } from "@/components/tracking/SpendInbox";
import { StatementStart } from "@/components/tracking/StatementStart";
import { StatementSummary } from "@/components/tracking/StatementSummary";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  SPENDING_CATEGORIES,
  categoryColor,
  categoryLabel,
  categorySlug,
} from "@/lib/tracking/categories";
import {
  addDays,
  addMonths,
  endOfMonth,
  formatMonthLabel,
  formatWeekLabel,
  monthKey,
  RECENT_MONTHS,
  RECENT_WEEKS,
  recentMonthStarts,
  startOfMonth,
  startOfWeekMonday,
  todayIso,
  weekRange,
} from "@/lib/tracking/dates";
import {
  advanceRecurringDate,
  daysBetween,
  countsTowardSpend,
  isSavings,
  latestDate,
  leftToSpend,
  outflowTotal,
} from "@/lib/tracking/cash-capture";
import { effectiveBudget, indexPlan, planTotals } from "@/lib/tracking/budget-plan";
import { resolvedLineRole } from "@/lib/tracking/spending-parse";
import { buildStatementBaseline, type RepeatSuggestion } from "@/lib/tracking/statement-baseline";
import {
  matchUploadDuplicates,
  mergeUploadPatch,
  type DuplicateAction,
  type ExistingSpend,
} from "@/lib/tracking/spending-parse";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/stores/plan-store";
import type {
  BudgetPlanEntry,
  CaptureInput,
  CashAnchor,
  CashDirection,
  ParsedSpendingItem,
  RecurringCadence,
  RecurringItem,
  SpendingPicture,
  TransactionRow,
} from "@/types/tracking";

const SETUP_SKIP_KEY = "mosaic-cash-setup-skipped";

const HOWTO_KEY = "mosaic-spending-howto-seen";
const CUSTOM_CATEGORY_KEY = "mosaic-custom-categories";

function rowsForPicture(rows: ReviewRow[]): ReviewRow[] {
  return rows.filter(
    (row) => row.included && row.amount > 0 && (!row.duplicateOf || row.duplicateAction !== "skip"),
  );
}

function loadCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_CATEGORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberCategory(slug: string) {
  if ((SPENDING_CATEGORIES as readonly string[]).includes(slug)) return;
  const next = [...new Set([...loadCustomCategories(), slug])];
  localStorage.setItem(CUSTOM_CATEGORY_KEY, JSON.stringify(next));
}

type UploadJob = {
  status: "idle" | "parsing" | "ready" | "error";
  rows: ReviewRow[] | null;
  notice: string | null;
  error: string | null;
};

let uploadJob: UploadJob = { status: "idle", rows: null, notice: null, error: null };
const uploadListeners = new Set<() => void>();

function setUploadJob(next: UploadJob) {
  uploadJob = next;
  uploadListeners.forEach((listener) => listener());
}

function categoryOptions(extras: string[], current?: string): string[] {
  const all: string[] = [...SPENDING_CATEGORIES, ...extras];
  if (current && !all.includes(current)) all.push(current);
  return [...new Set(all)];
}

function CategoryPicker({
  value,
  onChange,
  extras,
  onAdd,
  variant,
}: {
  value: string;
  onChange: (slug: string) => void;
  extras: string[];
  onAdd: (slug: string) => void;
  variant: "pills" | "select";
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const options = categoryOptions(extras, value);

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
          <option value="__add">Add a category…</option>
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
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="rounded-full border border-dashed border-[var(--warm-200)] px-2.5 py-1 font-display text-xs font-medium text-[var(--text-secondary)]"
          >
            Add a category
          </button>
        </div>
      )}
      {variant === "select" && !adding && (
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

interface ReviewRow extends ParsedSpendingItem {
  key: string;
  included: boolean;
  categoryConfirmed: boolean;
  documentId: string | null;
  duplicateOf: ExistingSpend | null;
  duplicateAction: DuplicateAction;
}

export default function CashFlowPage() {
  const monthlyExpenses = usePlanStore((s) => s.prePlanData?.monthlyExpenses ?? null);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(todayIso()));
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [history, setHistory] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [loggedThisWeek, setLoggedThisWeek] = useState(false);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);
  const [anchor, setAnchor] = useState<CashAnchor | null>(null);
  const [expectedBalance, setExpectedBalance] = useState<number | null>(null);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(null);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [showBalance, setShowBalance] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [picture, setPicture] = useState<SpendingPicture | null>(null);
  const [statementPreview, setStatementPreview] = useState<ReturnType<typeof buildStatementBaseline>>(null);
  const [linesOpen, setLinesOpen] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showStatementLines, setShowStatementLines] = useState(false);
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const [cashLoaded, setCashLoaded] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(() => uploadJob.rows);
  const [reviewNotice, setReviewNotice] = useState<string | null>(() => uploadJob.notice);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [parsing, setParsing] = useState(() => uploadJob.status === "parsing");
  const [parseError, setParseError] = useState<string | null>(() => uploadJob.error);
  const [view, setView] = useState<"week" | "month">("month");
  const [monthStart, setMonthStart] = useState(() => startOfMonth(todayIso()));
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [planEntries, setPlanEntries] = useState<BudgetPlanEntry[]>([]);
  const [hasAnyPlan, setHasAnyPlan] = useState<boolean | null>(null);
  const [showBudgets, setShowBudgets] = useState(false);
  const [monthTxns, setMonthTxns] = useState<TransactionRow[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>(() => loadCustomCategories());
  const fileRef = useRef<HTMLInputElement>(null);

  const range = weekRange(weekStart);
  const thisWeek = startOfWeekMonday(todayIso());
  const planIndex = useMemo(() => indexPlan(planEntries), [planEntries]);
  const plannedExpenses = useMemo(() => planTotals(planEntries, monthStart).expense, [planEntries, monthStart]);
  const monthlyBudgetTotal =
    plannedExpenses > 0
      ? plannedExpenses
      : Object.values(budgets).length > 0
        ? Object.values(budgets).reduce((sum, amount) => sum + amount, 0)
        : null;
  const budgetWeekly = monthlyBudgetTotal != null ? (monthlyBudgetTotal * 12) / 52 : null;
  const weeklyBaseline =
    budgetWeekly ?? (monthlyExpenses != null ? (monthlyExpenses * 12) / 52 : null);
  const monthlyBaseline = monthlyBudgetTotal ?? monthlyExpenses;

  const loadWeek = useCallback(async (start: string) => {
    const { end } = weekRange(start);
    const res = await fetch(`/api/transactions?start=${start}&end=${end}`, { credentials: "include" });
    if (!res.ok) return;
    const json = await res.json();
    setTransactions(json.transactions ?? []);
  }, []);

  const loadMeta = useCallback(async (monthOverride?: string) => {
    const month = monthOverride ?? monthStart;
    const historyStart = startOfMonth(addMonths(todayIso(), -(RECENT_MONTHS - 1)));
    const [histRes, gamRes] = await Promise.all([
      fetch(`/api/transactions?start=${historyStart}&end=${todayIso()}`, { credentials: "include" }),
      fetch("/api/gamification/summary", { credentials: "include" }),
    ]);
    if (histRes.ok) {
      const json = await histRes.json();
      setHistory(json.transactions ?? []);
    }
    const monthEnd = endOfMonth(month);
    const [budgetRes, monthRes, planRes] = await Promise.all([
      fetch("/api/budgets", { credentials: "include" }),
      fetch(`/api/transactions?start=${month}&end=${monthEnd}`, { credentials: "include" }),
      fetch(`/api/budget-plan?year=${month.slice(0, 4)}`, { credentials: "include" }),
    ]);
    if (budgetRes.ok) {
      const json = await budgetRes.json();
      const map: Record<string, number> = {};
      for (const b of json.budgets ?? []) {
        map[b.category] = Number(b.monthly_limit);
      }
      setBudgets(map);
    }
    if (planRes.ok) {
      const json = await planRes.json();
      setPlanEntries((json.entries ?? []) as BudgetPlanEntry[]);
      setHasAnyPlan(Boolean(json.hasAnyPlan));
    }
    if (monthRes.ok) {
      const json = await monthRes.json();
      setMonthTxns(json.transactions ?? []);
    }
    if (gamRes.ok) {
      const json = await gamRes.json();
      setStreak(json.weeklyStreak ?? 0);
      setLoggedThisWeek(Boolean(json.loggedThisWeek));
    }
    const [cashRes, recurringRes] = await Promise.all([
      fetch("/api/cash", { credentials: "include" }),
      fetch("/api/recurring", { credentials: "include" }),
    ]);
    if (cashRes.ok) {
      const json = await cashRes.json();
      setAnchor(json.anchor ?? null);
      setExpectedBalance(json.expected_balance ?? null);
      setLastCheckDate(json.last_check_date ?? null);
      setPicture(json.baseline ?? null);
      setCashLoaded(true);
    }
    if (recurringRes.ok) {
      const json = await recurringRes.json();
      setRecurring(json.items ?? []);
    }
  }, [monthStart]);

  useEffect(() => {
    setLoading(true);
    loadWeek(weekStart).finally(() => setLoading(false));
  }, [weekStart, loadWeek]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    function syncUpload() {
      setParsing(uploadJob.status === "parsing");
      setParseError(uploadJob.error);
      setReviewRows(uploadJob.rows);
      setReviewNotice(uploadJob.notice);
    }
    uploadListeners.add(syncUpload);
    return () => {
      uploadListeners.delete(syncUpload);
    };
  }, []);

  function addCategory(slug: string) {
    rememberCategory(slug);
    setCustomCategories(loadCustomCategories());
  }

  const visibleTxns = view === "month" ? monthTxns : transactions;
  const spendTxns = visibleTxns.filter((txn) => countsTowardSpend(txn));
  const incomeTxns = visibleTxns.filter((txn) => !isSavings(txn) && resolvedLineRole(txn) === "income");
  const savingsTxns = visibleTxns.filter((txn) => isSavings(txn));
  const listedSpend = showStatementLines ? spendTxns : spendTxns.filter((txn) => txn.source !== "screenshot");
  const listedIncome = showStatementLines ? incomeTxns : incomeTxns.filter((txn) => txn.source !== "screenshot");
  const hiddenStatementLines = spendTxns.length + incomeTxns.length - listedSpend.length - listedIncome.length;
  const weekTotal = useMemo(() => outflowTotal(transactions), [transactions]);
  const monthTotal = useMemo(() => outflowTotal(monthTxns), [monthTxns]);
  const inboxItems = useMemo(() => {
    const map = new Map<string, TransactionRow>();
    for (const txn of [...history, ...transactions, ...monthTxns]) {
      if (txn.category_confirmed === false) map.set(txn.id, txn);
    }
    return [...map.values()].sort((a, b) => (a.txn_date < b.txn_date ? 1 : -1));
  }, [history, transactions, monthTxns]);

  const byCategory = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    for (const t of listedSpend) {
      const cat = t.category;
      const list = map.get(cat) ?? [];
      list.push(t);
      map.set(cat, list);
    }
    const keys = [...new Set([...SPENDING_CATEGORIES, ...listedSpend.map((t) => t.category)])];
    return keys
      .map((cat) => ({
        category: cat,
        amount: (map.get(cat) ?? []).reduce((s, t) => s + Number(t.amount), 0),
        items: map.get(cat) ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }, [listedSpend]);

  const categorySlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const txn of spendTxns) {
      map.set(txn.category, (map.get(txn.category) ?? 0) + Number(txn.amount));
    }
    return [...map.entries()].map(([category, amount]) => ({ category, amount }));
  }, [spendTxns]);

  const weeklyBars = useMemo(() => {
    const points: { label: string; amount: number }[] = [];
    for (let i = RECENT_WEEKS - 1; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i);
      const { end } = weekRange(start);
      const amount = outflowTotal(
        history.filter((t) => t.txn_date >= start && t.txn_date <= end),
      );
      const [, m, d] = start.split("-");
      points.push({ label: `${Number(m)}/${Number(d)}`, amount });
    }
    return points;
  }, [history, thisWeek]);

  const monthlyBars = useMemo(() => {
    return recentMonthStarts(todayIso()).map((start) => {
      const end = endOfMonth(start);
      const amount = outflowTotal(
        history.filter((t) => t.txn_date >= start && t.txn_date <= end),
      );
      const label = new Date(`${start}T00:00:00`).toLocaleDateString("en-CA", { month: "short" });
      return { label, amount };
    });
  }, [history]);

  async function reload() {
    await Promise.all([loadWeek(weekStart), loadMeta()]);
  }

  async function handleCapture(input: CaptureInput): Promise<boolean> {
    let recurringId: string | null = null;
    if (input.recurring) {
      const recRes = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: input.recurring.name,
          amount: input.amount,
          category: input.category,
          direction: input.direction,
          cadence: input.recurring.cadence,
          next_date: advanceRecurringDate(input.txnDate, input.recurring.cadence),
        }),
      });
      if (!recRes.ok) return false;
      const recJson = await recRes.json();
      recurringId = recJson.item?.id ?? null;
    }

    const lines = input.lines?.length ? input.lines : [{ amount: input.amount, category: input.category }];
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        transactions: lines.map((line, index) => ({
          txn_date: input.txnDate,
          amount: line.amount,
          category: line.category,
          direction: input.direction,
          line_role: input.lineRole,
          description: input.description ?? null,
          note: input.note ?? null,
          source: input.source ?? "manual",
          category_confirmed: input.categoryConfirmed,
          recurring_item_id: index === 0 ? recurringId : null,
        })),
      }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    const ids = (json.transactions ?? []).map((txn: TransactionRow) => txn.id).filter(Boolean);
    setUndo({ ids, label: formatMoneyExact(input.amount) });
    await reload();
    return true;
  }

  async function undoLast() {
    if (!undo) return;
    await Promise.all(
      undo.ids.map((id) =>
        fetch(`/api/transactions?id=${id}`, { method: "DELETE", credentials: "include" }),
      ),
    );
    setUndo(null);
    await reload();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE", credentials: "include" });
    await reload();
  }

  function requestUpload() {
    const seen = typeof window !== "undefined" && localStorage.getItem(HOWTO_KEY) === "1";
    if (!seen) {
      setShowHowTo(true);
      return;
    }
    fileRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploadJob({ status: "parsing", rows: null, notice: null, error: null });
    try {
      // One request per file. A combined upload was dropping a whole statement
      // when a later file failed, and the modal still looked complete.
      const parsedRows: Array<
        ParsedSpendingItem & {
          key: string;
          included: boolean;
          categoryConfirmed: boolean;
          documentId: string | null;
        }
      > = [];
      const failures: string[] = [];
      const notes: string[] = [];
      let stored = true;
      for (const file of list) {
        const fd = new FormData();
        fd.append("files", file);
        const res = await fetch("/api/upload/spending", { method: "POST", body: fd, credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          failures.push(file.name);
          continue;
        }
        if (json.stored === false) stored = false;
        if (typeof json.notes === "string" && json.notes.trim()) notes.push(json.notes.trim());
        const documentId =
          Array.isArray(json.documentIds) && json.documentIds.length === 1
            ? String(json.documentIds[0])
            : null;
        for (const t of (json.transactions ?? []) as ParsedSpendingItem[]) {
          parsedRows.push({
            ...t,
            key: `${parsedRows.length}-${t.description}`,
            included: true,
            categoryConfirmed: false,
            documentId,
          });
        }
      }
      if (parsedRows.length === 0) {
        setUploadJob({
          status: "error",
          rows: null,
          notice: null,
          error: failures.length > 0 ? `Could not read ${failures.join(", ")}.` : "Could not read that file.",
        });
        return;
      }
      const dates = parsedRows
        .map((row) => row.txn_date)
        .filter((date): date is string => Boolean(date))
        .sort();
      let existing: ExistingSpend[] = [];
      let duplicateCheckFailed = false;
      if (dates.length > 0) {
        const existingRes = await fetch(
          `/api/transactions?start=${dates[0]}&end=${dates[dates.length - 1]}`,
          { credentials: "include" },
        );
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          existing = ((existingJson.transactions ?? []) as TransactionRow[]).map((txn) => ({
              id: txn.id,
              txn_date: txn.txn_date,
              amount: Number(txn.amount),
              category: txn.category,
              description: txn.description,
              note: txn.note,
            }));
        } else {
          duplicateCheckFailed = true;
        }
      }
      const rows = matchUploadDuplicates(parsedRows, existing);
      const duplicateCount = rows.filter((row) => row.duplicateOf).length;
      const notice = [
        failures.length > 0 ? `Could not read ${failures.join(", ")}. The other files are listed below.` : "",
        notes.length > 0 ? notes.join(" ") : "",
        stored === false
          ? "The file itself was not stored, but the lines below are ready to review."
          : "",
        duplicateCheckFailed
          ? "Could not check these against what you already logged."
          : duplicateCount > 0
            ? `${duplicateCount === 1 ? "1 line matches" : `${duplicateCount} lines match`} something already logged. Those stay out unless you merge or add them.`
            : "",
      ]
        .filter(Boolean)
        .join(" ");
      const preview = buildStatementBaseline(rowsForPicture(rows), todayIso());
      setStatementPreview(preview);
      setLinesOpen(preview == null);
      setSummaryError(null);
      setUploadJob({ status: "ready", rows, notice: notice || null, error: null });
    } catch {
      setUploadJob({
        status: "error",
        rows: null,
        notice: null,
        error: "Upload failed. Try again.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmReview() {
    if (!reviewRows) return;
    const chosen = reviewRows.filter((r) => r.included && r.amount > 0);
    const toSave = chosen.filter((r) => !r.duplicateOf || r.duplicateAction === "add");
    const toMerge = chosen.filter((r) => r.duplicateOf && r.duplicateAction === "merge");
    if (toSave.length === 0 && toMerge.length === 0) {
      setUploadJob({ status: "idle", rows: null, notice: null, error: null });
      return;
    }
    if (toMerge.length > 0) {
      const merges = await Promise.all(
        toMerge.map(async (row) => {
          const existing = row.duplicateOf;
          if (!existing) return true;
          const patch = mergeUploadPatch(existing, row);
          if (Object.keys(patch).length === 0) return true;
          const res = await fetch("/api/transactions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: existing.id, ...patch }),
          });
          return res.ok;
        }),
      );
      if (merges.some((ok) => !ok)) {
        throw new Error("Could not merge those duplicates.");
      }
    }
    if (toSave.length > 0) {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transactions: toSave.map((r) => ({
            txn_date: r.txn_date ?? todayIso(),
            amount: r.amount,
            category: r.suggested_category,
            description: r.description,
            note: r.note ?? null,
            source: "screenshot",
            document_id: r.documentId,
            category_confirmed: r.categoryConfirmed,
            direction: r.line_role === "income" ? "in" : "out",
            line_role: r.line_role ?? "purchase",
            instrument: r.instrument ?? "debit",
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Could not save those transactions.");
      }
      const json = await res.json();
      if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    }
    setUploadJob({ status: "idle", rows: null, notice: null, error: null });
    setStatementPreview(null);
    setLinesOpen(false);
    await reload();
  }

  async function confirmPicture(repeats: RepeatSuggestion[]) {
    if (!reviewRows) return;
    const lines = rowsForPicture(reviewRows).filter((row) => row.txn_date);
    setSummarySaving(true);
    setSummaryError(null);
    const res = await fetch("/api/cash/baseline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        transactions: lines.map((row) => ({
          txn_date: row.txn_date,
          amount: row.amount,
          category: row.suggested_category,
          description: row.description,
          note: row.note ?? null,
          document_id: row.documentId,
          line_role: row.line_role ?? "purchase",
          instrument: row.instrument ?? "debit",
        })),
        repeats: repeats.map((item) => ({
          name: item.name,
          amount: item.amount,
          category: item.category,
          direction: item.direction,
          cadence: item.cadence,
          next_date: item.nextDate,
        })),
      }),
    });
    setSummarySaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSummaryError(json.error ?? "Could not save that picture.");
      return;
    }
    const json = await res.json();
    if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    const dates = lines.flatMap((row) => (row.txn_date ? [row.txn_date] : []));
    const latest = dates.reduce((max, date) => (date > max ? date : max), dates[0] ?? todayIso());
    const statementMonth = startOfMonth(latest);
    setView("month");
    setMonthStart(statementMonth);
    setUploadJob({ status: "idle", rows: null, notice: null, error: null });
    setStatementPreview(null);
    setLinesOpen(false);
    await loadMeta(statementMonth);
    await loadWeek(weekStart);
  }

  async function handleEdit(
    id: string,
    payload: {
      txn_date: string;
      amount: number;
      category: string;
      description: string;
      note?: string;
    },
  ) {
    const res = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...payload, category_confirmed: true }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Could not save this spend.");
    }
    setEditing(null);
    await reload();
  }

  async function assignCategory(id: string, category: string) {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, category, category_confirmed: true }),
    });
    await reload();
  }

  async function confirmSchedule(id: string, amount: number) {
    const res = await fetch("/api/recurring", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, action: "confirm", amount }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    await reload();
  }

  async function skipSchedule(id: string) {
    await fetch("/api/recurring", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, action: "skip" }),
    });
    await reload();
  }

  async function createSchedule(input: {
    name: string;
    amount: number;
    category: string;
    direction: CashDirection;
    cadence: RecurringCadence;
    next_date: string;
  }) {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    await reload();
  }

  async function deleteSchedule(id: string) {
    await fetch(`/api/recurring?id=${id}`, { method: "DELETE", credentials: "include" });
    await reload();
  }

  async function saveSetup(input: {
    startingBalance: number;
    anchorDate: string;
    paycheque: { name: string; amount: number; cadence: RecurringCadence; nextDate: string } | null;
    bill: {
      name: string;
      amount: number;
      category: string;
      cadence: RecurringCadence;
      nextDate: string;
      direction: CashDirection;
    } | null;
  }) {
    const anchorRes = await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        starting_balance: input.startingBalance,
        anchor_date: input.anchorDate,
      }),
    });
    if (!anchorRes.ok) throw new Error("Could not save starting balance");
    const schedules = [
      input.paycheque
        ? {
            name: input.paycheque.name,
            amount: input.paycheque.amount,
            category: "paycheque",
            direction: "in" as const,
            cadence: input.paycheque.cadence,
            next_date: input.paycheque.nextDate,
          }
        : null,
      input.bill
        ? {
            name: input.bill.name,
            amount: input.bill.amount,
            category: input.bill.category,
            direction: input.bill.direction,
            cadence: input.bill.cadence,
            next_date: input.bill.nextDate,
          }
        : null,
    ].filter((item) => item != null);
    await Promise.all(
      schedules.map((item) =>
        fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item),
        }),
      ),
    );
    setShowSetup(false);
    await reload();
  }

  async function bookBalance(
    actual: number,
    book: "untracked" | "lines" | "none",
    lines?: { amount: number; category: string; direction: CashDirection }[],
  ) {
    const res = await fetch("/api/cash/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ actual_balance: actual, book, lines }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    setShowBalance(false);
    await reload();
    return true;
  }

  const vsBaseline =
    weeklyBaseline != null && weeklyBaseline > 0
      ? ((weekTotal - weeklyBaseline) / weeklyBaseline) * 100
      : null;

  const priorMonthAverage = useMemo(() => {
    const viewed = monthKey(monthStart);
    const totals = new Map<string, number>();
    for (const t of history) {
      const key = monthKey(t.txn_date);
      if (key >= viewed) continue;
      if (!countsTowardSpend(t)) continue;
      totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
    }
    const values = [...totals.values()];
    if (values.length === 0) return null;
    return values.reduce((sum, n) => sum + n, 0) / values.length;
  }, [history, monthStart]);

  const vsRecentMonths =
    priorMonthAverage != null && priorMonthAverage > 0
      ? ((monthTotal - priorMonthAverage) / priorMonthAverage) * 100
      : null;

  const budgetCategories = useMemo(
    () => [
      ...new Set([
        ...SPENDING_CATEGORIES,
        ...customCategories,
        ...monthTxns.filter((t) => !isSavings(t)).map((t) => t.category),
        ...Object.keys(budgets),
        ...planEntries.filter((entry) => entry.kind === "expense").map((entry) => entry.category),
      ]),
    ],
    [customCategories, monthTxns, budgets, planEntries],
  );

  const propertyCost = visibleTxns.some((t) =>
    /condo|strata|tenant|rental/i.test(
      `${t.description ?? ""} ${t.note ?? ""} ${categoryLabel(t.category)}`,
    ),
  );
  const currentMonth = startOfMonth(todayIso());
  const today = todayIso();
  const periodStart = view === "month" ? monthStart : range.start;
  const periodEnd = view === "month" ? endOfMonth(monthStart) : range.end;
  const monthlyRoom = monthlyBudgetTotal ?? monthlyExpenses;
  const room = leftToSpend({
    periodStart,
    periodEnd,
    txns: view === "month" ? monthTxns : transactions,
    recurring,
    monthlyRoom,
    period: view,
    statementBaseline: picture
      ? { incomeMonthly: picture.income_monthly, needsMonthly: picture.needs_monthly }
      : null,
  });
  const spentNow = view === "month" ? monthTotal : weekTotal;
  const lastActivity = latestDate([...history.map((txn) => txn.txn_date), lastCheckDate]);
  const quietDays = lastActivity ? daysBetween(lastActivity, today) : null;
  const balanceDue =
    anchor != null && (lastCheckDate == null || daysBetween(lastCheckDate, today) >= 7);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Cash Flow</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            {picture
              ? "Log variable spending for the household. Bills and paycheques can post on their dates."
              : "Upload the last three months of bank and card statements. One person can cover the household."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--emerald-soft)] px-3 py-1.5">
            <Flame className={cn("size-4", loggedThisWeek ? "text-[var(--emerald-dark)]" : "text-[var(--text-muted)]")} />
            <span className="font-display text-sm font-semibold text-[var(--emerald-dark)]">
              {streak} week streak
            </span>
          </div>
        </div>
      </div>

      {propertyCost && (
        <div className="rounded-lg border border-[var(--warm-200)] bg-white px-4 py-3 font-body text-sm text-[var(--text-secondary)]">
          These lines look like a rental or condo cost. If that property is not on Net Worth yet,{" "}
          <a href="/dashboard/assets" className="font-semibold text-[var(--emerald-dark)] underline">
            add it
          </a>{" "}
          so your picture includes it.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
      {cashLoaded && !picture && (
        <StatementStart
          parsing={parsing}
          onUpload={requestUpload}
          onManual={() => setShowSetup(true)}
        />
      )}

      {picture && (
      <div className="rounded-xl bg-[#0f1923] p-5 sm:p-6">
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-white/50">
          Left to spend
        </p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
          {room.left != null ? formatMoneyExact(room.left) : "—"}
        </p>
        <p className="mt-2 font-body text-sm text-white/70">
          {room.usesStatement ? "Flexible spending logged " : "Spent "}
          {formatMoneyExact(room.usesStatement ? room.spent : spentNow)}{" "}
          {view === "month"
            ? monthStart === currentMonth
              ? "this month"
              : `in ${formatMonthLabel(monthStart)}`
            : weekStart === thisWeek
              ? "this week"
              : formatWeekLabel(weekStart)}
        </p>
        <p className="mt-1 font-body text-xs text-white/50">
          {room.usesStatement
            ? "Typical money in, after needs, minus flexible spending logged this period."
            : room.left == null
              ? "Upload statements, or add a paycheque and bills, to see what's left."
              : room.usesBudget
                ? "From your spending room, after bills still due."
                : "After income and bills still due."}
        </p>
        {room.savings > 0 && (
          <p className="mt-1 font-body text-xs text-white/60">
            {formatMoneyExact(room.savings)} set aside this period also came out of what is left.
          </p>
        )}
        {picture && (
          <p className="mt-1 font-body text-xs text-white/50">
            A typical month had {formatMoneyExact(picture.left_monthly)} left after flexible spending
            {picture.partial ? ". That average is from the current month only." : "."}
          </p>
        )}
        {picture?.observation && (
          <p className="mt-2 font-body text-sm text-white/80">{picture.observation}</p>
        )}
        {view === "week" && vsBaseline != null && (
          <p className={cn("mt-2 font-body text-sm", vsBaseline > 5 ? "text-red-300" : "text-emerald-300")}>
            {vsBaseline > 0 ? "+" : ""}
            {vsBaseline.toFixed(0)}% vs your typical weekly spend
            {weeklyBaseline != null ? ` (${formatMoney(weeklyBaseline)})` : ""}
          </p>
        )}
        {view === "month" && vsRecentMonths != null && priorMonthAverage != null && (
          <p className={cn("mt-2 font-body text-sm", vsRecentMonths > 5 ? "text-red-300" : "text-emerald-300")}>
            {vsRecentMonths > 0 ? "+" : ""}
            {vsRecentMonths.toFixed(0)}% compared with the average of recent months ({formatMoney(priorMonthAverage)})
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (anchor == null || expectedBalance == null) setShowSetup(true);
            else setShowBalance(true);
          }}
          className="mt-4 rounded-lg bg-white/10 px-3 py-2 font-display text-sm font-semibold text-white"
        >
          Balance check
        </button>
        {balanceDue && (
          <p className="mt-2 font-body text-xs text-white/60">
            {view === "month"
              ? "Enter your bank balance when you have it. A check closes the gap."
              : "Enter your bank balance when you have it. A check closes the gap and counts for this week."}
          </p>
        )}
      </div>
      )}

      {cashLoaded && hasAnyPlan === false && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--warm-200)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Set up your budget plan</h2>
            <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">
              Put a number on each month for money in, expenses, and savings. Tracking then shows where you landed.
            </p>
          </div>
          <Link
            href="/dashboard/cash-flow/plan"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[var(--slate-950)] px-4 py-2 font-display text-sm font-semibold text-white"
          >
            Build the plan
          </Link>
        </div>
      )}

      <CashKeypad
        history={history}
        extras={customCategories}
        catchUpDays={quietDays}
        onAddCategory={addCategory}
        onSave={handleCapture}
      />
      <SpendInbox items={inboxItems} onAssign={assignCategory} />
      <RecurringPanel
        items={recurring}
        today={today}
        onConfirm={confirmSchedule}
        onSkip={skipSchedule}
        onCreate={createSchedule}
        onDelete={deleteSchedule}
      />
      <div className="inline-flex rounded-full border border-[var(--warm-200)] bg-white p-1">
        <button
          type="button"
          onClick={() => setView("week")}
          className={cn(
            "rounded-full px-3 py-1.5 font-display text-xs font-semibold",
            view === "week" ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
          )}
        >
          Week
        </button>
        <button
          type="button"
          onClick={() => setView("month")}
          className={cn(
            "rounded-full px-3 py-1.5 font-display text-xs font-semibold",
            view === "month" ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
          )}
        >
          Month
        </button>
      </div>
      {view === "week" ? (
      <div className="flex items-center justify-between rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)]"
          aria-label="Previous week"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
            {formatWeekLabel(weekStart)}
          </p>
          {weekStart === thisWeek && (
            <p className="font-body text-[11px] text-[var(--emerald-dark)]">This week</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          disabled={weekStart >= thisWeek}
          className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
          aria-label="Next week"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      ) : (
      <div className="flex items-center justify-between rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setMonthStart(startOfMonth(addMonths(monthStart, -1)))}
          className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
            {formatMonthLabel(monthStart)}
          </p>
          {monthStart === currentMonth && (
            <p className="font-body text-[11px] text-[var(--emerald-dark)]">This month</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMonthStart(startOfMonth(addMonths(monthStart, 1)))}
          disabled={monthStart >= currentMonth}
          className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      )}

      {view === "month" && (
        <div className="space-y-3 rounded-xl border border-[var(--warm-200)] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Category budgets</h2>
            <div className="flex items-center gap-3">
              {plannedExpenses > 0 && (
                <Link
                  href="/dashboard/cash-flow/plan"
                  className="font-display text-xs font-semibold text-[var(--text-secondary)] underline"
                >
                  From your plan
                </Link>
              )}
              <button
                type="button"
                onClick={() => setShowBudgets(true)}
                className="font-display text-xs font-semibold text-[var(--emerald)]"
              >
                Set budgets
              </button>
            </div>
          </div>
          {budgetCategories.map((cat) => {
            const spent = monthTxns
              .filter((t) => t.category === cat && countsTowardSpend(t))
              .reduce((s, t) => s + Number(t.amount), 0);
            const limit = effectiveBudget(planIndex, budgets, cat, monthStart);
            if (limit == null && spent === 0) return null;
            const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
            return (
              <div key={cat}>
                <div className="flex justify-between font-body text-xs text-[var(--text-secondary)]">
                  <span>{categoryLabel(cat)}</span>
                  <span>
                    {formatMoney(spent)}
                    {limit != null ? ` / ${formatMoney(limit)}` : ""}
                  </span>
                </div>
                {limit != null && (
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--warm-100)]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[var(--emerald)]",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={requestUpload}
          disabled={parsing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--warm-200)] bg-white px-4 py-2.5 font-display text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--warm-100)]"
        >
          {parsing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload statements
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif,.heics,application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {parseError && (
        <p className="font-body text-sm text-[var(--error)]">{parseError}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : byCategory.length === 0 && listedIncome.length === 0 && savingsTxns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-10 text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">
            {picture ? "Nothing new this period" : "Nothing logged yet"}
          </p>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            {picture
              ? "Statement lines stay in the monthly picture. Log variable spending above."
              : "Upload statements to set what's left, or type an amount above."}
          </p>
          {hiddenStatementLines > 0 && !showStatementLines && (
            <button
              type="button"
              onClick={() => setShowStatementLines(true)}
              className="mt-3 font-body text-sm text-[var(--text-secondary)] underline"
            >
              Show statement lines
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.map((g) => (
            <div key={g.category} className="overflow-hidden rounded-lg border border-[var(--warm-200)] bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: categoryColor(g.category) }}
                  />
                  <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                    {categoryLabel(g.category)}
                  </span>
                </div>
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatMoneyExact(g.amount)}
                </span>
              </div>
              <ul className="divide-y divide-[var(--warm-100)] border-t border-[var(--warm-100)]">
                {g.items.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-[var(--text-primary)]">
                        {t.description || t.note || "Spend"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="font-body text-[11px] text-[var(--text-muted)]">{t.txn_date}</p>
                        {t.category_confirmed === false && (
                          <span className="rounded-full bg-[var(--warm-100)] px-2 py-0.5 font-display text-[11px] font-semibold text-[var(--text-secondary)]">
                            Inbox
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-body text-sm font-semibold tabular-nums">
                      {formatMoneyExact(Number(t.amount))}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--error)]"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {hiddenStatementLines > 0 && !showStatementLines && (
            <button
              type="button"
              onClick={() => setShowStatementLines(true)}
              className="font-body text-sm text-[var(--text-secondary)] underline"
            >
              Statement lines are already in the monthly picture. Show them.
            </button>
          )}
          {listedIncome.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[var(--warm-200)] bg-white">
              <div className="px-4 py-3 font-display text-sm font-semibold text-[var(--text-primary)]">Money in</div>
              <ul className="divide-y divide-[var(--warm-100)] border-t border-[var(--warm-100)]">
                {listedIncome.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-[var(--text-primary)]">
                        {t.description || t.note || categoryLabel(t.category)}
                      </p>
                      <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">{t.txn_date}</p>
                    </div>
                    <span className="font-body text-sm font-semibold tabular-nums">
                      +{formatMoneyExact(Number(t.amount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
                      aria-label="Edit income"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--error)]"
                      aria-label="Delete income"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {savingsTxns.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[var(--warm-200)] bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--text-primary)]">
                  <PiggyBank className="size-4 text-sky-700" />
                  Set aside
                </div>
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatMoneyExact(savingsTxns.reduce((sum, t) => sum + Number(t.amount), 0))}
                </span>
              </div>
              <ul className="divide-y divide-[var(--warm-100)] border-t border-[var(--warm-100)]">
                {savingsTxns.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-[var(--text-primary)]">
                        {categoryLabel(t.category)}
                        {t.description || t.note ? ` · ${t.description || t.note}` : ""}
                      </p>
                      <p className="mt-0.5 font-body text-[11px] text-[var(--text-muted)]">{t.txn_date}</p>
                    </div>
                    <span className="font-body text-sm font-semibold tabular-nums">
                      {formatMoneyExact(Number(t.amount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--warm-100)]"
                      aria-label="Edit savings"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--error)]"
                      aria-label="Delete savings"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <SpendingCategoryChart
          data={categorySlices}
          title={view === "month" ? `${formatMonthLabel(monthStart)} by category` : "This week by category"}
          emptyLabel={
            view === "month"
              ? `No spending logged for ${formatMonthLabel(monthStart)} yet.`
              : "No spending logged this week yet."
          }
        />
        <WeeklySpendChart
          data={view === "month" ? monthlyBars : weeklyBars}
          baseline={view === "month" ? monthlyBaseline : weeklyBaseline}
          period={view}
        />
      </div>
      </div>

      {showHowTo && (
        <HowToModal
          onCancel={() => setShowHowTo(false)}
          onContinue={() => {
            localStorage.setItem(HOWTO_KEY, "1");
            setShowHowTo(false);
            fileRef.current?.click();
          }}
        />
      )}

      {statementPreview && !linesOpen && (
        <StatementSummary
          baseline={statementPreview}
          notice={reviewNotice}
          saving={summarySaving}
          error={summaryError}
          onConfirm={(repeats) => void confirmPicture(repeats)}
          onReview={() => setLinesOpen(true)}
          onClose={() => {
            setStatementPreview(null);
            setLinesOpen(false);
            setUploadJob({ status: "idle", rows: null, notice: null, error: null });
          }}
        />
      )}

      {reviewRows && linesOpen && (
        <ReviewModal
          rows={reviewRows}
          notice={reviewNotice}
          extras={customCategories}
          onAddCategory={addCategory}
          onChange={(rows) => {
            setUploadJob({ status: "ready", rows, notice: reviewNotice, error: null });
            setStatementPreview(buildStatementBaseline(rowsForPicture(rows), todayIso()));
          }}
          onCancel={() => {
            if (statementPreview) setLinesOpen(false);
            else {
              setLinesOpen(false);
              setUploadJob({ status: "idle", rows: null, notice: null, error: null });
            }
          }}
          onConfirm={statementPreview ? async () => setLinesOpen(false) : confirmReview}
          finishLabel={statementPreview ? "Back to the picture" : undefined}
        />
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

      {undo && (
        <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--slate-950)] px-4 py-2 text-white shadow-lg">
          <span className="font-body text-sm">Saved {undo.label}</span>
          <button type="button" onClick={() => void undoLast()} className="font-display text-sm font-semibold">
            Undo
          </button>
        </div>
      )}

      {showSetup && (
        <CashSetupSheet
          onClose={() => {
            localStorage.setItem(SETUP_SKIP_KEY, "1");
            setShowSetup(false);
          }}
          onSave={saveSetup}
        />
      )}

      {showBalance && expectedBalance != null && (
        <BalanceCheckSheet
          expected={expectedBalance}
          onClose={() => setShowBalance(false)}
          onBook={bookBalance}
        />
      )}

      {showBudgets && (
        <BudgetSheet
          budgets={budgets}
          extras={customCategories}
          onClose={() => setShowBudgets(false)}
          onSaved={(next, unlocksNext) => {
            setBudgets(next);
            if (unlocksNext.length) setUnlocks(unlocksNext);
            setShowBudgets(false);
          }}
        />
      )}

      <UnlockToast unlocks={unlocks} onDismiss={() => setUnlocks([])} />
    </div>
  );
}

function EditSpendSheet({
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
            {txn.direction === "in" ? "Edit income" : "Edit spend"}
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

function HowToModal({ onCancel, onContinue }: { onCancel: () => void; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--emerald-soft)]">
          <Upload className="size-5 text-[var(--emerald-dark)]" />
        </div>
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Upload statements
        </h2>
        <ul className="mt-3 space-y-2 font-body text-sm text-[var(--text-secondary)]">
          <li>Upload the last three months of bank and card statements. Several files at once is fine, including iPhone photos.</li>
          <li>One upload can cover the household. Crop out account numbers, card numbers, and your full name.</li>
          <li>We&apos;ll show money in, needs, and flexible spending before saving anything.</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
          >
            Choose files
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  rows,
  notice,
  extras,
  onAddCategory,
  onChange,
  onCancel,
  onConfirm,
  finishLabel,
}: {
  rows: ReviewRow[];
  notice: string | null;
  extras: string[];
  onAddCategory: (slug: string) => void;
  onChange: (rows: ReviewRow[]) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  finishLabel?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const included = rows.filter((r) => r.included);
  const chosen = included.filter((r) => r.amount > 0);
  const adding = chosen.filter((r) => !r.duplicateOf || r.duplicateAction === "add");
  const merging = chosen.filter((r) => r.duplicateOf && r.duplicateAction === "merge");
  const skipping = chosen.filter((r) => r.duplicateOf && r.duplicateAction === "skip");
  const saveLabel = saving
    ? "Saving…"
    : [
        adding.length > 0 ? `Save ${adding.length}` : "",
        merging.length > 0 ? `merge ${merging.length}` : "",
        adding.length + merging.length === 0 && skipping.length > 0 ? "Leave duplicates out" : "",
      ]
        .filter(Boolean)
        .join(", ") || "Save";

  function update(key: string, patch: Partial<ReviewRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--warm-200)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Review transactions</h2>
            <p className="font-body text-xs text-[var(--text-muted)]">
              {included.length} of {rows.length} selected. Suggested categories stay marked until you confirm them.
            </p>
            {notice && (
              <ul className="mt-2 list-disc space-y-1 pl-4 font-body text-xs text-amber-800">
                {notice
                  .split(/(?<=[.!?])\s+/)
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .map((part) => (
                    <li key={part}>{part}</li>
                  ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="p-6 font-body text-sm text-[var(--text-muted)]">
              No transactions found. Try a clearer photo, screenshot, or PDF of the list.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--warm-100)]">
              {rows.map((r) => (
                <li key={r.key} className={cn("px-4 py-3", !r.included && "opacity-40")}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={r.included}
                      onChange={(e) => update(r.key, { included: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="text"
                        value={r.description}
                        onChange={(e) => update(r.key, { description: e.target.value })}
                        className="w-full rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          step="0.01"
                          value={r.amount}
                          onChange={(e) =>
                            update(r.key, {
                              amount: Number(e.target.value),
                              duplicateOf: null,
                              duplicateAction: "add",
                            })
                          }
                          className="rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm tabular-nums"
                        />
                        <input
                          type="date"
                          value={r.txn_date ?? ""}
                          onChange={(e) =>
                            update(r.key, {
                              txn_date: e.target.value,
                              duplicateOf: null,
                              duplicateAction: "add",
                            })
                          }
                          className="rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm"
                        />
                        <div className="col-span-2 sm:col-span-1">
                          <CategoryPicker
                            value={r.suggested_category}
                            extras={extras}
                            variant="select"
                            onAdd={(slug) => {
                              onAddCategory(slug);
                              update(r.key, { suggested_category: slug, categoryConfirmed: true });
                            }}
                            onChange={(slug) =>
                              update(r.key, { suggested_category: slug, categoryConfirmed: true })
                            }
                          />
                          {r.categoryConfirmed ? (
                            <p className="mt-1 font-body text-[11px] text-[var(--emerald-dark)]">Category checked</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => update(r.key, { categoryConfirmed: true })}
                              className="mt-1 font-display text-[11px] font-semibold text-amber-800"
                            >
                              Suggested — confirm category
                            </button>
                          )}
                        </div>
                      </div>
                      {r.duplicateOf && (
                        <div className="rounded-lg bg-amber-50 px-3 py-2">
                          <p className="font-body text-xs text-amber-950">
                            Same date and amount as{" "}
                            {r.duplicateOf.description || categoryLabel(r.duplicateOf.category)} on{" "}
                            {r.duplicateOf.txn_date} ({formatMoneyExact(r.duplicateOf.amount)}). Adding it would count
                            this twice.
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
                                onClick={() => update(r.key, { duplicateAction: action, included: true })}
                                className={cn(
                                  "rounded-full px-2.5 py-1 font-display text-[11px] font-semibold",
                                  r.duplicateAction === action
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
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {saveError && (
          <p className="px-4 pt-3 font-body text-sm text-[var(--error)]">{saveError}</p>
        )}
        <div className="flex gap-2 border-t border-[var(--warm-200)] p-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            {finishLabel ? "Back" : "Discard"}
          </button>
          <button
            type="button"
            disabled={saving || (!finishLabel && adding.length + merging.length + skipping.length === 0)}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await onConfirm();
              } catch (error) {
                setSaveError(error instanceof Error ? error.message : "Could not save those transactions.");
              } finally {
                setSaving(false);
              }
            }}
            className="flex-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
          >
            {finishLabel ?? saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetSheet({
  budgets,
  extras,
  onClose,
  onSaved,
}: {
  budgets: Record<string, number>;
  extras: string[];
  onClose: () => void;
  onSaved: (next: Record<string, number>, unlocks: UnlockItem[]) => void;
}) {
  const categories = [...new Set([...SPENDING_CATEGORIES, ...extras, ...Object.keys(budgets)])];
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const cat of categories) {
      o[cat] = budgets[cat] != null ? String(budgets[cat]) : "";
    }
    return o;
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--warm-200)] p-4">
          <h2 className="font-display text-base font-semibold">Set monthly budgets</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 p-2" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center justify-between gap-3">
              <span className="font-body text-sm">{categoryLabel(cat)}</span>
              <input
                type="number"
                min={0}
                value={draft[cat]}
                onChange={(e) => setDraft((d) => ({ ...d, [cat]: e.target.value }))}
                className="w-28 rounded-lg border border-[var(--warm-200)] px-3 py-2 text-right font-body text-sm"
              />
            </label>
          ))}
        </div>
        <div className="border-t border-[var(--warm-200)] p-4">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const payload = categories.map((cat) => ({
                category: cat,
                monthly_limit: Number(draft[cat] || 0),
              })).filter((b) => b.monthly_limit > 0);
              const res = await fetch("/api/budgets", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ budgets: payload }),
              });
              const json = await res.json().catch(() => ({}));
              const next: Record<string, number> = {};
              for (const b of payload) next[b.category] = b.monthly_limit;
              onSaved(next, json.gamification?.newUnlocks ?? []);
              setSaving(false);
            }}
            className="min-h-11 w-full rounded-lg bg-[var(--emerald)] font-display text-sm font-semibold text-white"
          >
            {saving ? "Saving…" : "Save budgets"}
          </button>
        </div>
      </div>
    </div>
  );
}

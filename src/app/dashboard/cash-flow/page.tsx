"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { SpendingCategoryChart } from "@/components/charts/SpendingCategoryChart";
import { WeeklySpendChart } from "@/components/charts/WeeklySpendChart";
import { UnlockToast, type UnlockItem } from "@/components/tracking/UnlockToast";
import {
  SPENDING_CATEGORIES,
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_LABELS,
  type SpendingCategory,
} from "@/lib/tracking/categories";
import {
  addDays,
  formatWeekLabel,
  startOfWeekMonday,
  todayIso,
  weekRange,
} from "@/lib/tracking/dates";
import { formatMoney, formatMoneyExact } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";
import { usePlanStore } from "@/stores/plan-store";
import type { ParsedSpendingItem, TransactionRow } from "@/types/tracking";

const HOWTO_KEY = "mosaic-spending-howto-seen";

interface ReviewRow extends ParsedSpendingItem {
  key: string;
  included: boolean;
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
  const [showAdd, setShowAdd] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const range = weekRange(weekStart);
  const thisWeek = startOfWeekMonday(todayIso());
  const weeklyBaseline = monthlyExpenses != null ? (monthlyExpenses * 12) / 52 : null;

  const loadWeek = useCallback(async (start: string) => {
    const { end } = weekRange(start);
    const res = await fetch(`/api/transactions?start=${start}&end=${end}`, { credentials: "include" });
    if (!res.ok) return;
    const json = await res.json();
    setTransactions(json.transactions ?? []);
  }, []);

  const loadMeta = useCallback(async () => {
    const eightStart = addDays(startOfWeekMonday(todayIso()), -7 * 7);
    const [histRes, gamRes] = await Promise.all([
      fetch(`/api/transactions?start=${eightStart}&end=${todayIso()}`, { credentials: "include" }),
      fetch("/api/gamification/summary", { credentials: "include" }),
    ]);
    if (histRes.ok) {
      const json = await histRes.json();
      setHistory(json.transactions ?? []);
    }
    if (gamRes.ok) {
      const json = await gamRes.json();
      setStreak(json.weeklyStreak ?? 0);
      setLoggedThisWeek(Boolean(json.loggedThisWeek));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadWeek(weekStart).finally(() => setLoading(false));
  }, [weekStart, loadWeek]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const weekTotal = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );

  const byCategory = useMemo(() => {
    const map = new Map<SpendingCategory, TransactionRow[]>();
    for (const t of transactions) {
      const cat = t.category;
      const list = map.get(cat) ?? [];
      list.push(t);
      map.set(cat, list);
    }
    return SPENDING_CATEGORIES.map((cat) => ({
      category: cat,
      amount: (map.get(cat) ?? []).reduce((s, t) => s + Number(t.amount), 0),
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [transactions]);

  const categorySlices = byCategory.map((g) => ({ category: g.category, amount: g.amount }));

  const weeklyBars = useMemo(() => {
    const points: { label: string; amount: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i);
      const { end } = weekRange(start);
      const amount = history
        .filter((t) => t.txn_date >= start && t.txn_date <= end)
        .reduce((s, t) => s + Number(t.amount), 0);
      const [y, m, d] = start.split("-");
      points.push({ label: `${Number(m)}/${Number(d)}`, amount });
    }
    return points;
  }, [history, thisWeek]);

  async function handleAdd(payload: {
    txn_date: string;
    amount: number;
    category: SpendingCategory;
    note?: string;
  }) {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...payload, source: "manual" }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    setShowAdd(false);
    await Promise.all([loadWeek(weekStart), loadMeta()]);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE", credentials: "include" });
    await Promise.all([loadWeek(weekStart), loadMeta()]);
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
    setParsing(true);
    setParseError(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await fetch("/api/upload/spending", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setParseError(json.error ?? "Could not parse screenshots.");
        return;
      }
      const rows: ReviewRow[] = (json.transactions as ParsedSpendingItem[]).map((t, i) => ({
        ...t,
        txn_date: t.txn_date ?? todayIso(),
        key: `${i}-${t.description}`,
        included: true,
      }));
      setReviewRows(rows);
    } catch {
      setParseError("Upload failed. Try again.");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmReview() {
    if (!reviewRows) return;
    const toSave = reviewRows.filter((r) => r.included && r.amount > 0);
    if (toSave.length === 0) {
      setReviewRows(null);
      return;
    }
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
        })),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.gamification?.newUnlocks?.length) setUnlocks(json.gamification.newUnlocks);
    }
    setReviewRows(null);
    await Promise.all([loadWeek(weekStart), loadMeta()]);
  }

  const vsBaseline =
    weeklyBaseline != null && weeklyBaseline > 0
      ? ((weekTotal - weeklyBaseline) / weeklyBaseline) * 100
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Cash Flow</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Log every spend this week. Honesty is the whole point.
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

      {!loggedThisWeek && weekStart === thisWeek && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-body text-sm text-amber-800">
          This week is empty. Log spending to keep your streak.
        </div>
      )}

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

      <div className="rounded-xl bg-[#0f1923] p-5 sm:p-6">
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-white/50">
          Spent this week
        </p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
          {formatMoneyExact(weekTotal)}
        </p>
        {vsBaseline != null && (
          <p className={cn("mt-2 font-body text-sm", vsBaseline > 5 ? "text-red-300" : "text-emerald-300")}>
            {vsBaseline > 0 ? "+" : ""}
            {vsBaseline.toFixed(0)}% vs your typical weekly spend
            {weeklyBaseline != null ? ` (${formatMoney(weeklyBaseline)})` : ""}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--emerald)] px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-[var(--emerald-dark)]"
        >
          <Plus className="size-4" />
          Add spend
        </button>
        <button
          type="button"
          onClick={requestUpload}
          disabled={parsing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--warm-200)] bg-white px-4 py-2.5 font-display text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--warm-100)]"
        >
          {parsing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Screenshot
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
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
      ) : byCategory.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--warm-200)] bg-white px-4 py-10 text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">Nothing logged yet</p>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            Add items one by one, or upload screenshots from your banking app.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.map((g) => (
            <div key={g.category} className="overflow-hidden rounded-lg border border-[var(--warm-200)] bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: SPENDING_CATEGORY_COLORS[g.category] }}
                  />
                  <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                    {SPENDING_CATEGORY_LABELS[g.category]}
                  </span>
                </div>
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatMoneyExact(g.amount)}
                </span>
              </div>
              <ul className="divide-y divide-[var(--warm-100)] border-t border-[var(--warm-100)]">
                {g.items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-[var(--text-primary)]">
                        {t.description || t.note || "Spend"}
                      </p>
                      <p className="font-body text-[11px] text-[var(--text-muted)]">{t.txn_date}</p>
                    </div>
                    <span className="font-body text-sm font-semibold tabular-nums">
                      {formatMoneyExact(Number(t.amount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--error)]"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpendingCategoryChart data={categorySlices} />
        <WeeklySpendChart data={weeklyBars} baseline={weeklyBaseline} />
      </div>

      {showAdd && (
        <QuickAddSheet
          defaultDate={range.end < todayIso() ? range.end : todayIso()}
          minDate={range.start}
          maxDate={range.end}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}

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

      {reviewRows && (
        <ReviewModal
          rows={reviewRows}
          onChange={setReviewRows}
          onCancel={() => setReviewRows(null)}
          onConfirm={confirmReview}
        />
      )}

      <UnlockToast unlocks={unlocks} onDismiss={() => setUnlocks([])} />
    </div>
  );
}

function QuickAddSheet({
  defaultDate,
  minDate,
  maxDate,
  onClose,
  onSave,
}: {
  defaultDate: string;
  minDate: string;
  maxDate: string;
  onClose: () => void;
  onSave: (payload: {
    txn_date: string;
    amount: number;
    category: SpendingCategory;
    note?: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendingCategory>("other");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    await onSave({ txn_date: date, amount: n, category, note: note || undefined });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Add spend</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
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
          placeholder="0.00"
          className="mt-1 mb-4 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2.5 font-display text-lg tabular-nums"
          autoFocus
        />
        <p className="mb-2 font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Category
        </p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {SPENDING_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-2.5 py-1 font-display text-xs font-medium",
                category === c
                  ? "bg-[var(--emerald)] text-white"
                  : "bg-[var(--warm-100)] text-[var(--text-secondary)]",
              )}
            >
              {SPENDING_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <label className="font-body text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Date
        </label>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
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
          placeholder="Coffee, groceries…"
          className="mt-1 mb-5 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm"
        />
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
          Upload spending screenshots
        </h2>
        <ul className="mt-3 space-y-2 font-body text-sm text-[var(--text-secondary)]">
          <li>Open your banking or credit-card app and screenshot the transaction list.</li>
          <li>Crop out account numbers, card numbers, and your full name before uploading.</li>
          <li>You can upload several images or PDFs at once (JPEG, PNG, WebP, PDF).</li>
          <li>We’ll extract each line so you can fix categories before saving.</li>
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
  onChange,
  onCancel,
  onConfirm,
}: {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const included = rows.filter((r) => r.included);

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
              {included.length} of {rows.length} selected
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="p-6 font-body text-sm text-[var(--text-muted)]">
              No transactions found. Try a clearer screenshot of the list.
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
                          onChange={(e) => update(r.key, { amount: Number(e.target.value) })}
                          className="rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm tabular-nums"
                        />
                        <input
                          type="date"
                          value={r.txn_date ?? ""}
                          onChange={(e) => update(r.key, { txn_date: e.target.value })}
                          className="rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm"
                        />
                        <select
                          value={r.suggested_category}
                          onChange={(e) =>
                            update(r.key, { suggested_category: e.target.value as SpendingCategory })
                          }
                          className="col-span-2 rounded border border-[var(--warm-200)] px-2 py-1 font-body text-sm sm:col-span-1"
                        >
                          {SPENDING_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {SPENDING_CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2 border-t border-[var(--warm-200)] p-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={saving || included.length === 0}
            onClick={async () => {
              setSaving(true);
              await onConfirm();
              setSaving(false);
            }}
            className="flex-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save ${included.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

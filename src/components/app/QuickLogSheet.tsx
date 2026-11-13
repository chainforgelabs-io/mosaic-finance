"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CashKeypad } from "@/components/tracking/CashKeypad";
import { advanceRecurringDate, daysBetween } from "@/lib/tracking/cash-capture";
import { addMonths, startOfMonth, todayIso } from "@/lib/tracking/dates";
import { fetchCatalog, migrateLocalCategories, persistCustomCategory } from "@/lib/tracking/plan-client";
import type { UserCategory } from "@/lib/tracking/categories";
import type { BudgetPlanEntry, CaptureInput, TransactionRow } from "@/types/tracking";

export function QuickLogSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [history, setHistory] = useState<TransactionRow[]>([]);
  const [planEntries, setPlanEntries] = useState<BudgetPlanEntry[]>([]);
  const [catalog, setCatalog] = useState<UserCategory[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    const today = todayIso();
    const historyStart = startOfMonth(addMonths(today, -2));
    void (async () => {
      const [txRes, planRes, nextCatalog] = await Promise.all([
        fetch(`/api/transactions?start=${historyStart}&end=${today}`, { credentials: "include" }),
        fetch(`/api/budget-plan?year=${today.slice(0, 4)}`, { credentials: "include" }),
        fetchCatalog().then((rows) => migrateLocalCategories(rows)),
      ]);
      if (cancelled) return;
      if (txRes.ok) {
        const json = await txRes.json();
        setHistory((json.transactions ?? []) as TransactionRow[]);
      }
      if (planRes.ok) {
        const json = await planRes.json();
        setPlanEntries((json.entries ?? []) as BudgetPlanEntry[]);
      }
      setCatalog(nextCatalog);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const quietDays = useMemo(() => {
    const today = todayIso();
    const last = history.reduce<string | null>(
      (best, txn) => (!best || txn.txn_date > best ? txn.txn_date : best),
      null,
    );
    return last ? daysBetween(last, today) : null;
  }, [history]);

  if (!open) return null;

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
          line_role: input.lineRole ?? (input.direction === "in" ? "income" : "purchase"),
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
          instrument: input.instrument ?? null,
          description: input.description ?? null,
          note: input.note ?? null,
          source: input.source ?? "manual",
          category_confirmed: input.categoryConfirmed,
          recurring_item_id: index === 0 ? recurringId : null,
        })),
      }),
    });
    if (!res.ok) return false;
    onSaved();
    return true;
  }

  return (
    <div
      className="phone-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="quick-log-card flex max-h-[92dvh] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-2xl bg-[var(--warm-50)]">
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:pb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="quick-log-title" className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Log this week
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="phone-hit inline-flex items-center justify-center rounded-full text-[var(--text-muted)]"
          >
            <X className="size-5" />
          </button>
        </div>
        {ready ? (
          <CashKeypad
            history={history}
            catchUpDays={quietDays}
            planEntries={planEntries}
            catalog={catalog}
            month={startOfMonth(todayIso())}
            onAddCategory={(slug) => {
              void persistCustomCategory(slug).then((saved) => {
                if (saved) setCatalog((prev) => [...prev, saved]);
              });
            }}
            onSave={handleCapture}
          />
        ) : (
          <p className="py-8 text-center font-body text-sm text-[var(--text-muted)]">Loading the keypad…</p>
        )}
        <p className="mt-4 text-center font-body text-xs text-[var(--text-muted)]">
          <Link href="/dashboard/cash-flow" className="font-semibold text-[var(--emerald)]" onClick={onClose}>
            Open Cash Flow
          </Link>{" "}
          for the full week.
        </p>
        </div>
      </div>
    </div>
  );
}

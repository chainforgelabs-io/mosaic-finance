import { transactionKind } from "@/lib/tracking/cash-capture";
import {
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
  SPENDING_CATEGORIES,
  isSpendingCategory,
} from "@/lib/tracking/categories";
import { todayIso } from "@/lib/tracking/dates";
import { mergeUploadPatch, type DuplicateAction, type ExistingSpend } from "@/lib/tracking/spending-parse";
import type { UnlockItem } from "@/components/tracking/UnlockToast";
import type { ParsedSpendingItem } from "@/types/tracking";

export interface PlanCategoryLists {
  expense: string[];
  income: string[];
  savings: string[];
}

export type PlanMenuKind = keyof PlanCategoryLists;

export interface ImportRow extends ParsedSpendingItem {
  key: string;
  included: boolean;
  categoryConfirmed: boolean;
  documentId: string | null;
  duplicateOf: ExistingSpend | null;
  duplicateAction: DuplicateAction;
}

export type ImportSession = {
  status: "idle" | "parsing" | "ready" | "error";
  rows: ImportRow[] | null;
  notice: string | null;
  error: string | null;
  /** True after statement guesses have been matched to the budget plan. */
  aligned?: boolean;
};

const EMPTY_SESSION: ImportSession = { status: "idle", rows: null, notice: null, error: null };

let session: ImportSession = EMPTY_SESSION;
let pendingUnlocks: UnlockItem[] = [];
const listeners = new Set<() => void>();

export function getImportSession(): ImportSession {
  return session;
}

export function setImportSession(next: ImportSession) {
  session = next;
  listeners.forEach((listener) => listener());
}

export function subscribeImportSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function patchImportRows(rows: ImportRow[]) {
  setImportSession({ ...session, rows });
}

export function takePendingUnlocks(): UnlockItem[] {
  const next = pendingUnlocks;
  pendingUnlocks = [];
  return next;
}

export function rowsForPicture(rows: ImportRow[]): ImportRow[] {
  return rows.filter(
    (row) => row.included && row.amount > 0 && (!row.duplicateOf || row.duplicateAction !== "skip"),
  );
}

export function confirmCategory(rows: ImportRow[], category: string): ImportRow[] {
  return rows.map((row) =>
    row.included && row.suggested_category === category && !row.categoryConfirmed
      ? { ...row, categoryConfirmed: true }
      : row,
  );
}

export function confirmImportRow(rows: ImportRow[], key: string): ImportRow[] {
  return rows.map((row) => (row.key === key && row.suggested_category ? { ...row, categoryConfirmed: true } : row));
}

/** "needs" and "all" are reserved. A category filter shows lines still waiting to be confirmed. */
export function filterImportRows(rows: ImportRow[], filter: string): ImportRow[] {
  const active = rows.filter((row) => row.included);
  if (filter === "all") return active;
  if (filter === "needs") return active.filter((row) => !row.suggested_category);
  return active.filter((row) => row.suggested_category === filter && !row.categoryConfirmed);
}

function orderSlugs(slugs: string[], known: readonly string[]): string[] {
  const present = new Set(slugs.filter(Boolean));
  const head = known.filter((slug) => present.has(slug));
  const rest = [...present].filter((slug) => !known.includes(slug)).sort((a, b) => a.localeCompare(b));
  return [...head, ...rest];
}

/** Categories already on the budget plan, in plan order, plus the catch-all for that kind. */
export function planCategoryLists(
  schedules: Array<{ kind: string; category: string; spend_category?: string | null }>,
): PlanCategoryLists {
  const expense = new Set<string>();
  const income = new Set<string>();
  const savings = new Set<string>();
  for (const row of schedules) {
    if (row.kind === "expense") {
      if (row.spend_category && isSpendingCategory(row.spend_category)) expense.add(row.spend_category);
      else if (isSpendingCategory(row.category)) expense.add(row.category);
    } else if (row.kind === "income" && row.category) {
      income.add(row.category);
    } else if (row.kind === "savings" && row.category) {
      savings.add(row.category);
    }
  }
  expense.add("other");
  income.add("other_income");
  savings.add("other_savings");
  return {
    expense: orderSlugs([...expense], SPENDING_CATEGORIES),
    income: orderSlugs([...income], INCOME_CATEGORIES),
    savings: orderSlugs([...savings], SAVINGS_CATEGORIES),
  };
}

export function importChipOrder(lists: PlanCategoryLists): string[] {
  return [...lists.expense, ...lists.income, ...lists.savings];
}

export function importMenu(kind: PlanMenuKind, lists: PlanCategoryLists, added: string[]): string[] {
  return orderSlugs([...lists[kind], ...added], importChipOrder(lists));
}

export function importRowMenuKind(row: ImportRow): PlanMenuKind {
  const kind = transactionKind(row);
  if (kind === "income") return "income";
  if (kind === "savings") return "savings";
  return "expense";
}

/** Keep a guess only when it is already a category on the plan. Everything else starts unassigned. */
export function alignImportRows(rows: ImportRow[], lists: PlanCategoryLists): ImportRow[] {
  return rows.map((row) => {
    const savingsGuess =
      (SAVINGS_CATEGORIES as readonly string[]).includes(row.suggested_category) &&
      row.line_role !== "income" &&
      row.line_role !== "card_payment";
    const next = savingsGuess ? { ...row, line_role: "savings" as const } : row;
    const allowed = new Set(lists[importRowMenuKind(next)]);
    if (next.suggested_category && allowed.has(next.suggested_category)) {
      return { ...next, categoryConfirmed: false };
    }
    return { ...next, suggested_category: "", categoryConfirmed: false };
  });
}

export function importCategoryChips(rows: ImportRow[], order: string[]): string[] {
  const present = new Set(
    rows.filter((row) => row.included && row.suggested_category && !row.categoryConfirmed).map((row) => row.suggested_category),
  );
  return orderSlugs([...present], order);
}

/** Open on the first plan category that still needs confirmation, then the unassigned lines. */
export function firstImportFilter(rows: ImportRow[], order: string[]): string {
  const chips = importCategoryChips(rows, order);
  if (chips.length > 0) return chips[0];
  if (rows.some((row) => row.included && !row.suggested_category)) return "needs";
  return "all";
}

export function pendingImportCount(rows: ImportRow[]): number {
  return rows.filter((row) => row.included && !row.categoryConfirmed).length;
}

function savedCategory(row: ImportRow): string {
  if (row.suggested_category) return row.suggested_category;
  const kind = importRowMenuKind(row);
  if (kind === "income") return "other_income";
  if (kind === "savings") return "other_savings";
  return "other";
}

export async function saveImportRows(rows: ImportRow[]): Promise<UnlockItem[]> {
  const chosen = rows.filter((row) => row.included && row.amount > 0);
  const toSave = chosen.filter((row) => !row.duplicateOf || row.duplicateAction === "add");
  const toMerge = chosen.filter((row) => row.duplicateOf && row.duplicateAction === "merge");
  if (toSave.length === 0 && toMerge.length === 0) return [];

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

  let unlocks: UnlockItem[] = [];
  if (toSave.length > 0) {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        transactions: toSave.map((row) => ({
          txn_date: row.txn_date ?? todayIso(),
          amount: row.amount,
          category: savedCategory(row),
          description: row.description,
          note: row.note ?? null,
          source: "screenshot",
          document_id: row.documentId,
          category_confirmed: row.categoryConfirmed,
          direction: row.line_role === "income" ? "in" : "out",
          line_role: row.line_role ?? "purchase",
          instrument: row.instrument ?? "debit",
        })),
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Could not save those expenses.");
    }
    const json = await res.json();
    unlocks = (json.gamification?.newUnlocks ?? []) as UnlockItem[];
  }
  pendingUnlocks = unlocks;
  return unlocks;
}

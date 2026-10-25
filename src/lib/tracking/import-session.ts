import {
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
  SPENDING_CATEGORIES,
} from "@/lib/tracking/categories";
import { todayIso } from "@/lib/tracking/dates";
import { mergeUploadPatch, type DuplicateAction, type ExistingSpend } from "@/lib/tracking/spending-parse";
import type { UnlockItem } from "@/components/tracking/UnlockToast";
import type { ParsedSpendingItem } from "@/types/tracking";

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
    row.suggested_category === category && !row.categoryConfirmed ? { ...row, categoryConfirmed: true } : row,
  );
}

/** "needs" and "all" are reserved. Any other value is a category slug. */
export function filterImportRows(rows: ImportRow[], filter: string): ImportRow[] {
  if (filter === "all") return rows;
  if (filter === "needs") return rows.filter((row) => !row.categoryConfirmed);
  return rows.filter((row) => row.suggested_category === filter);
}

const KNOWN_CATEGORIES: readonly string[] = [
  ...SPENDING_CATEGORIES,
  ...INCOME_CATEGORIES,
  ...SAVINGS_CATEGORIES,
];

export function importCategoryChips(rows: ImportRow[]): string[] {
  const present = new Set(rows.map((row) => row.suggested_category));
  const known = KNOWN_CATEGORIES.filter((slug) => present.has(slug));
  const rest = [...present].filter((slug) => !KNOWN_CATEGORIES.includes(slug)).sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
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
          category: row.suggested_category,
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

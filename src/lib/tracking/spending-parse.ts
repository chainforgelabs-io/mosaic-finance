import { isSpendingCategory } from "@/lib/tracking/categories";
import type { ParsedSpendingItem } from "@/types/tracking";

export interface SpendingParsePayload {
  transactions: unknown;
  confidence?: string;
  notes?: string;
  periodYear: number | null;
  periodMonth: number | null;
  instrument: "credit" | "debit" | null;
  truncated: boolean;
}

interface TextBlock {
  type: string;
  text?: string;
}

export function claudeText(content: TextBlock[]): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n");
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function salvageTransactions(text: string): unknown[] {
  const key = text.indexOf("\"transactions\"");
  if (key < 0) return [];
  const bracket = text.indexOf("[", key);
  if (bracket < 0) return [];
  const items: unknown[] = [];
  let i = bracket + 1;
  while (i < text.length) {
    while (i < text.length && text[i] !== "{" && text[i] !== "]") i += 1;
    if (i >= text.length || text[i] === "]") break;
    const obj = extractBalancedObject(text.slice(i));
    if (!obj) break;
    try {
      items.push(JSON.parse(obj));
    } catch {
      break;
    }
    i += obj.length;
  }
  return items;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseSpendingPayload(text: string): SpendingParsePayload {
  const full = extractBalancedObject(text);
  if (full) {
    try {
      const parsed = JSON.parse(full) as Record<string, unknown>;
      return {
        transactions: parsed.transactions,
        confidence: typeof parsed.confidence === "string" ? parsed.confidence : undefined,
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
        periodYear: numberOrNull(parsed.period_year),
        periodMonth: numberOrNull(parsed.period_month),
        instrument: parsed.instrument === "credit" || parsed.instrument === "debit" ? parsed.instrument : null,
        truncated: false,
      };
    } catch {
      // Fall through and keep any complete transaction objects.
    }
  }

  const transactions = salvageTransactions(text);
  if (transactions.length === 0) {
    throw new Error("No JSON in model response");
  }
  return {
    transactions,
    confidence: "low",
    notes: "The reply was cut off, so later lines on these pages may be missing.",
    periodYear: null,
    periodMonth: null,
    instrument: null,
    truncated: true,
  };
}

export function dedupeSpendingItems(items: ParsedSpendingItem[]): ParsedSpendingItem[] {
  const firstRaw = new Map<string, string>();
  const out: ParsedSpendingItem[] = [];
  for (const item of items) {
    const key = [
      item.txn_date ?? "",
      item.amount,
      item.description.trim().toLowerCase(),
      item.line_role ?? "purchase",
      item.instrument ?? "debit",
    ].join("|");
    const prior = firstRaw.get(key);
    if (prior != null) {
      const sameLetters = prior.trim().toLowerCase() === item.description.trim().toLowerCase();
      if (sameLetters && prior !== item.description) continue;
    } else {
      firstRaw.set(key, item.description);
    }
    out.push(item);
  }
  return out;
}

const LINE_ROLES = ["purchase", "income", "card_payment", "transfer", "fee", "interest"] as const;

const PAY_HINT = /\b(payroll|paycheque|paycheck|pay dep|direct deposit)\b/i;
const BENEFIT_HINT = /\b(employment insurance|maternity|mat leave|canada child|ccb|gst\/hst)\b|\bei\b/i;
const REFUND_REVERSAL = /\b(refund reversal|reversal of (a )?refund)\b/i;
const REFUND_HINT = /\b(refund|refunded|merchant credit|purchase return|returned item)\b/i;
const DEPOSIT_HINT = /\b(direct deposit|deposit from|deposit)\b/i;
const SECURITY_DEPOSIT = /\bsecurity deposit\b/i;

function slugFromLabel(raw: unknown): string | null {
  const slug = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z][a-z0-9_]{0,39}$/.test(slug) ? slug : null;
}

function refineRole(description: string, role: (typeof LINE_ROLES)[number]): (typeof LINE_ROLES)[number] {
  if (REFUND_REVERSAL.test(description)) return "purchase";
  if (SECURITY_DEPOSIT.test(description) && role !== "income") return role;
  if (
    REFUND_HINT.test(description) ||
    PAY_HINT.test(description) ||
    BENEFIT_HINT.test(description) ||
    (DEPOSIT_HINT.test(description) && role !== "card_payment")
  ) {
    return "income";
  }
  return role;
}

function categoryForRole(
  role: (typeof LINE_ROLES)[number],
  raw: unknown,
  description: string,
): string {
  if (role === "card_payment") return "debt_payments";
  if (role === "transfer") return "other";
  if (role === "income") {
    if (BENEFIT_HINT.test(description)) return "ei";
    if (PAY_HINT.test(description)) return "paycheque";
    return slugFromLabel(raw) ?? "paycheque";
  }
  const slug = slugFromLabel(raw);
  if (!slug) return "other";
  return isSpendingCategory(slug) || slug !== "other" ? slug : "other";
}

export function normalizeStatementItems(
  transactions: unknown,
  fallbackInstrument: "credit" | "debit" | null,
): ParsedSpendingItem[] {
  const list = Array.isArray(transactions) ? transactions : [];
  const out: ParsedSpendingItem[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const roleRaw = String(row.line_role ?? "purchase");
    const parsedRole = (LINE_ROLES as readonly string[]).includes(roleRaw)
      ? (roleRaw as (typeof LINE_ROLES)[number])
      : "purchase";
    const description = String(row.description ?? "").slice(0, 300);
    const line_role = refineRole(description, parsedRole);
    const instrumentRaw = row.instrument ?? fallbackInstrument;
    const instrument = instrumentRaw === "credit" ? "credit" : "debit";
    const dateRaw = row.txn_date;
    const txn_date =
      typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
    out.push({
      txn_date,
      amount: Math.round(amount * 100) / 100,
      description,
      suggested_category: categoryForRole(line_role, row.suggested_category, description),
      note: row.note != null ? String(row.note).slice(0, 300) : undefined,
      instrument,
      line_role,
    });
  }
  return out;
}

export type DuplicateAction = "skip" | "merge" | "add";

export interface ExistingSpend {
  id: string;
  txn_date: string;
  amount: number;
  category: string;
  description: string | null;
  note: string | null;
}

function cents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

function words(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2),
  );
}

function descriptionScore(incoming: string, existing: string | null): number {
  if (!existing?.trim() || !incoming.trim()) return 0;
  const left = words(incoming);
  const right = words(existing);
  let shared = 0;
  for (const word of left) {
    if (right.has(word)) shared += 1;
  }
  return shared > 0 ? 3 : 0;
}

/**
 * A statement line matches a logged spend when the date and amount are the same.
 * Each logged row can match only one incoming line. Same-day repeats stay separate.
 */
export function matchUploadDuplicates<
  T extends {
    txn_date: string | null;
    amount: number;
    description: string;
    suggested_category: string;
  },
>(
  incoming: T[],
  existing: ExistingSpend[],
): Array<T & { duplicateOf: ExistingSpend | null; duplicateAction: DuplicateAction }> {
  const used = new Set<string>();
  return incoming.map((item) => {
    if (!item.txn_date) return { ...item, duplicateOf: null, duplicateAction: "add" as const };
    const itemCents = cents(item.amount);
    let best: { row: ExistingSpend; score: number } | null = null;
    for (const row of existing) {
      if (used.has(row.id) || row.txn_date !== item.txn_date) continue;
      if (cents(row.amount) !== itemCents) continue;
      const score =
        (row.category === item.suggested_category ? 2 : 0) +
        descriptionScore(item.description, row.description);
      const bothDescribed = Boolean(item.description.trim() && row.description?.trim());
      if (bothDescribed && score === 0) continue;
      if (!best || score > best.score) best = { row, score };
    }
    if (!best) return { ...item, duplicateOf: null, duplicateAction: "add" as const };
    used.add(best.row.id);
    return { ...item, duplicateOf: best.row, duplicateAction: "skip" as const };
  });
}

export function mergeUploadPatch(
  existing: { description: string | null; note: string | null; category: string },
  incoming: {
    description: string;
    note?: string | null;
    suggested_category: string;
    categoryConfirmed: boolean;
  },
): {
  description?: string;
  note?: string;
  category?: string;
  category_confirmed?: boolean;
} {
  const patch: {
    description?: string;
    note?: string;
    category?: string;
    category_confirmed?: boolean;
  } = {};
  const incomingDescription = incoming.description.trim();
  const existingDescription = existing.description?.trim() ?? "";
  if (!existingDescription && incomingDescription) patch.description = incomingDescription;

  const notes: string[] = [];
  const existingNote = existing.note?.trim() ?? "";
  if (existingNote) notes.push(existingNote);
  const extras = [incomingDescription, incoming.note?.trim() ?? ""].filter(Boolean);
  for (const extra of extras) {
    if (extra.toLowerCase() === existingDescription.toLowerCase()) continue;
    if (notes.some((note) => note.toLowerCase().includes(extra.toLowerCase()))) continue;
    if (extra === incomingDescription && !existingDescription) continue;
    notes.push(extra);
  }
  const note = notes.join(" · ");
  if (note && note !== existingNote) patch.note = note;

  if (incoming.categoryConfirmed && incoming.suggested_category !== existing.category) {
    patch.category = incoming.suggested_category;
    patch.category_confirmed = true;
  }
  return patch;
}

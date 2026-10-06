import type { ParsedSpendingItem } from "@/types/tracking";

export interface SpendingParsePayload {
  transactions: unknown;
  confidence?: string;
  notes?: string;
  periodYear: number | null;
  periodMonth: number | null;
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
    truncated: true,
  };
}

export function dedupeSpendingItems(items: ParsedSpendingItem[]): ParsedSpendingItem[] {
  const seen = new Set<string>();
  const out: ParsedSpendingItem[] = [];
  for (const item of items) {
    const key = `${item.txn_date ?? ""}|${item.amount}|${item.description.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
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

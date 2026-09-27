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

import { LIFE_INSURANCE_CASH_VALUE_NOTE } from "@/lib/assets/categories";

export interface LifeInsuranceCashAsset {
  name: string;
  cashValue: number;
  notes: string;
}

function finiteAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function withSuffix(amount: number, suffix: string | undefined): number | null {
  const s = (suffix ?? "").toLowerCase();
  if (s === "k") return Math.round(amount * 1_000);
  if (s === "m") return Math.round(amount * 1_000_000);
  return Math.round(amount);
}

export function cashValueAssetName(hint: string | null | undefined): string {
  const text = hint ?? "";
  if (/\buniversal\b|\bul\b/i.test(text)) return "Universal life cash value";
  if (/whole[\s-]?life/i.test(text)) return "Whole life cash value";
  return "Life insurance cash value";
}

function asset(nameHint: string | null | undefined, cashValue: number): LifeInsuranceCashAsset {
  return {
    name: cashValueAssetName(nameHint),
    cashValue,
    notes: LIFE_INSURANCE_CASH_VALUE_NOTE,
  };
}

function dedupe(assets: LifeInsuranceCashAsset[]): LifeInsuranceCashAsset[] {
  const seen = new Set<string>();
  const out: LifeInsuranceCashAsset[] = [];
  for (const a of assets) {
    const key = `${a.name}|${a.cashValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function fromPolicy(policy: Record<string, unknown>): LifeInsuranceCashAsset | null {
  const cashValue = finiteAmount(policy.cash_value ?? policy.cashValue ?? policy.csv);
  if (cashValue == null) return null;
  const hint = [policy.name, policy.type, policy.owner].filter((v) => typeof v === "string").join(" ");
  return asset(hint, cashValue);
}

function fromCoverage(extracted: unknown): LifeInsuranceCashAsset[] {
  if (!extracted || typeof extracted !== "object") return [];
  const coverage = (extracted as { insurance_coverage?: unknown }).insurance_coverage ?? extracted;
  if (!coverage || typeof coverage !== "object") return [];
  const life = (coverage as { life?: unknown }).life;
  const out: LifeInsuranceCashAsset[] = [];

  if (life && typeof life === "object") {
    const record = life as Record<string, unknown>;
    if (Array.isArray(record.policies)) {
      for (const policy of record.policies) {
        if (!policy || typeof policy !== "object") continue;
        const row = fromPolicy(policy as Record<string, unknown>);
        if (row) out.push(row);
      }
    }
    if (out.length === 0) {
      const row = fromPolicy(record);
      if (row) out.push(row);
    }
  }

  const extras = (coverage as { cash_value_policies?: unknown }).cash_value_policies;
  if (Array.isArray(extras)) {
    for (const policy of extras) {
      if (!policy || typeof policy !== "object") continue;
      const row = fromPolicy(policy as Record<string, unknown>);
      if (row) out.push(row);
    }
  }

  return dedupe(out);
}

const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)`;
const SUFFIX = String.raw`\s*(k|m)?`;
const LABEL = String.raw`(?:csv|c\.s\.v\.|cash\s+surrender(?:\s+value)?|surrender\s+value|cash\s+value)`;

const BEFORE_LABEL = new RegExp(String.raw`\$?\s*${AMOUNT}${SUFFIX}\s*(?:in\s+)?${LABEL}\b`, "gi");
const AFTER_LABEL = new RegExp(
  String.raw`\b${LABEL}\b(?:\s+(?:of|is|was|:))?\s*\$?\s*${AMOUNT}${SUFFIX}\b`,
  "gi",
);

export function cashValueAssetsFromText(text: string): LifeInsuranceCashAsset[] {
  if (!text.trim()) return [];
  const found: LifeInsuranceCashAsset[] = [];

  const collect = (pattern: RegExp, amountGroup: number, suffixGroup: number) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const base = Number(match[amountGroup].replace(/,/g, ""));
      if (!Number.isFinite(base)) continue;
      const cashValue = withSuffix(base, match[suffixGroup]);
      if (cashValue == null || cashValue <= 0) continue;
      const start = Math.max(0, match.index - 80);
      const hint = text.slice(start, match.index + match[0].length);
      found.push(asset(hint, cashValue));
    }
  };

  collect(BEFORE_LABEL, 1, 2);
  collect(AFTER_LABEL, 1, 2);
  return dedupe(found);
}

/**
 * Cash value of permanent life insurance (universal / whole life).
 * Death benefit is ignored. Structured policies win over a transcript scan.
 */
export function cashValueAssetsFromFactFind(
  extracted: unknown,
  transcript?: string | null,
): LifeInsuranceCashAsset[] {
  const structured = fromCoverage(
    extracted && typeof extracted === "object" && "insurance_coverage" in (extracted as object)
      ? extracted
      : { insurance_coverage: extracted },
  );
  if (structured.length > 0) return structured;
  if (!transcript) return [];
  return cashValueAssetsFromText(transcript);
}

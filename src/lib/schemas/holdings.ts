import { z } from "zod";

export const ACCOUNT_CATEGORIES = {
  "Registered Personal": [
    { value: "RRSP", label: "RRSP" },
    { value: "TFSA", label: "TFSA" },
    { value: "FHSA", label: "FHSA" },
    { value: "RESP", label: "RESP" },
    { value: "RDSP", label: "RDSP" },
    { value: "RRIF", label: "RRIF" },
  ],
  "Registered Pension Plans": [
    { value: "DC-RPP", label: "Defined Contribution (DC) Pension" },
    { value: "Hybrid-RPP", label: "Hybrid / Combination RPP" },
    { value: "Target-Benefit", label: "Target Benefit / Shared-Risk" },
  ],
  "Employer-Sponsored": [
    { value: "Group-RRSP", label: "Group RRSP" },
    { value: "Group-TFSA", label: "Group TFSA" },
    { value: "DPSP", label: "DPSP" },
    { value: "EPSP", label: "EPSP" },
    { value: "PRPP", label: "PRPP" },
    { value: "VRSP", label: "VRSP (Quebec)" },
    { value: "SPP", label: "SPP (Saskatchewan)" },
  ],
  "Employee Equity / Stock": [
    { value: "ESOP", label: "ESOP" },
    { value: "ESPP", label: "ESPP" },
    { value: "DSPP", label: "DSPP" },
    { value: "RSU", label: "RSU" },
    { value: "Stock-Options", label: "Stock Options" },
    { value: "Phantom-Stock", label: "Phantom Stock / SARs" },
    { value: "EOT", label: "EOT" },
  ],
  "Locked-In Accounts": [
    { value: "LIRA", label: "LIRA" },
    { value: "LRSP", label: "LRSP" },
    { value: "RLSP", label: "RLSP" },
    { value: "LIF", label: "LIF" },
    { value: "LRIF", label: "LRIF" },
    { value: "PRIF", label: "PRIF" },
    { value: "RLIF", label: "RLIF" },
  ],
  "Non-Registered / Other": [
    { value: "Non-Reg", label: "Non-Registered / Cash / Margin" },
    { value: "Bank-Account", label: "Bank Account" },
    { value: "Joint", label: "Joint Investment Account" },
    { value: "Corporate", label: "Corporate Investment Account" },
    { value: "In-Trust", label: "In-Trust Account" },
    { value: "Annuity", label: "Prescribed Annuity" },
  ],
} as const;

type CategoryEntries = typeof ACCOUNT_CATEGORIES;
type AllEntries = CategoryEntries[keyof CategoryEntries][number];
/** DB-RPP is legacy-only (not selectable); may still appear from older data or mis-tagged imports. */
export type AccountType = AllEntries["value"] | "DB-RPP";

export const ACCOUNT_TYPES = [
  ...Object.values(ACCOUNT_CATEGORIES).flat().map((e) => e.value),
  "DB-RPP",
] as unknown as readonly [AccountType, ...AccountType[]];

export function getAccountLabel(value: string): string {
  if (value === "DB-RPP") return "Defined Benefit (DB) Pension";
  for (const entries of Object.values(ACCOUNT_CATEGORIES)) {
    const match = entries.find((e) => e.value === value);
    if (match) return match.label;
  }
  return value;
}

/**
 * Defined-benefit and pension-income streams do not belong in transferable investment holdings.
 * Use when ingesting fact-find or pre-filling holdings so DB rows and misclassified types are dropped.
 */
export function shouldExcludeFromInvestmentHoldings(
  accountType: string,
  description: string,
): boolean {
  const t = accountType.trim();
  if (t === "DB-RPP" || t.toLowerCase() === "db-rpp") return true;

  const d = (description || "").toLowerCase();
  if (!d.trim()) return false;

  if (/\bdefined\s+benefit\b/.test(d)) return true;
  if (/\bdb\s*(pension|rpp)\b/.test(d)) return true;
  if (/\bdbpp\b/.test(d)) return true;
  if (
    /\bpays\s+\$[\d,]+.*\/(month|mo)\b/.test(d) &&
    /\bpension\b/.test(d) &&
    /\bat\s+age\b/.test(d)
  ) {
    return true;
  }
  return false;
}

const ACCOUNT_TYPE_DB_MAP: Record<string, string> = {
  "Non-Reg": "non-registered",
};

const DB_TO_DISPLAY_MAP: Record<string, string> = {
  "non-registered": "Non-Reg",
  pension: "DC-RPP",
  /** Legacy rows before migration 018 */
  "Savings-Account": "Bank-Account",
};

/** Lowercase snake_case keys from fact-find / AI output -> canonical display type (before DB map). */
const AI_ALIAS_TO_DISPLAY: Record<string, string> = {
  savings: "Bank-Account",
  savings_account: "Bank-Account",
  emergency_fund: "Bank-Account",
  bank_account: "Bank-Account",
  cash: "Bank-Account",
  high_yield_savings: "Bank-Account",
  hysa: "Bank-Account",
  checking: "Bank-Account",
  chequing: "Bank-Account",
  dc_rpp: "DC-RPP",
  defined_contribution: "DC-RPP",
  dcpp: "DC-RPP",
  non_registered: "Non-Reg",
  nonreg: "Non-Reg",
  taxable: "Non-Reg",
  margin: "Non-Reg",
  rrsp: "RRSP",
  tfsa: "TFSA",
  fhsa: "FHSA",
  resp: "RESP",
  rdsp: "RDSP",
  rrif: "RRIF",
};

function normalizeAccountTypeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Maps UI / fact-find account labels to values allowed by `investment_holdings.valid_account_type`.
 */
export function toDbAccountType(displayType: string): string {
  const trimmed = displayType.trim();
  if (!trimmed) return "non-registered";

  if (ACCOUNT_TYPE_DB_MAP[trimmed]) {
    return ACCOUNT_TYPE_DB_MAP[trimmed];
  }

  const allValues = ACCOUNT_TYPES as readonly string[];
  const caseMatch = allValues.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (caseMatch) {
    return ACCOUNT_TYPE_DB_MAP[caseMatch] ?? caseMatch;
  }

  const key = normalizeAccountTypeKey(trimmed);
  const aliasDisplay = AI_ALIAS_TO_DISPLAY[key];
  if (aliasDisplay) {
    return ACCOUNT_TYPE_DB_MAP[aliasDisplay] ?? aliasDisplay;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[toDbAccountType] Unknown account type; defaulting to non-registered:",
      displayType,
    );
  }
  return "non-registered";
}

export function fromDbAccountType(dbType: string): AccountType {
  const db = toDbAccountType(dbType);
  const mapped = DB_TO_DISPLAY_MAP[db];
  if (mapped) return mapped as AccountType;
  const allValues = ACCOUNT_TYPES as readonly string[];
  if (allValues.includes(db)) return db as AccountType;
  return "Non-Reg";
}

export const holdingSchema = z.object({
  tickerOrName: z.string().max(100, "Name too long").optional().default(""),
  balance: z
    .number({ message: "Balance is required" })
    .min(0, "Balance must be positive"),
  units: z.number().min(0, "Units must be positive").optional(),
});

export const accountSchema = z.object({
  id: z.string(),
  accountType: z.string().min(1, "Please select an account type"),
  accountName: z.string().max(100).optional(),
  holdings: z.array(holdingSchema).min(1, "Add at least one holding"),
});

export const holdingsSchema = z.object({
  accounts: z.array(accountSchema).min(1, "Add at least one account"),
});

export type HoldingFormData = z.infer<typeof holdingSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type HoldingsFormData = z.infer<typeof holdingsSchema>;

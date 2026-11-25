import {
  fromDbAccountType,
  getAccountLabel,
  toDbAccountType,
  type AccountType,
} from "@/lib/schemas/holdings";

/** Hard limit enforced by the holdings form schema. */
export const PREFILL_NAME_MAX = 100;

/** A consultation label is a few words, not a sentence. */
export const PREFILL_LABEL_MAX = 40;

const SENTENCE_PUNCTUATION = /[.!?]/;
const DOLLAR_AMOUNT = /\$|\b\d[\d,]*\s*k\b/i;

export function isShortLabel(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > PREFILL_LABEL_MAX) return false;
  if (SENTENCE_PUNCTUATION.test(text)) return false;
  if (DOLLAR_AMOUNT.test(text)) return false;
  return true;
}

export function isCashAccountType(accountType: string): boolean {
  return toDbAccountType(accountType) === "Bank-Account";
}

function isCashLikeName(name: string): boolean {
  const text = name.trim().toLowerCase();
  if (!text) return false;
  return /^cash\b/.test(text) || /^(savings|chequing|checking)$/.test(text);
}

function cap(value: string): string {
  const text = value.trim();
  if (text.length <= PREFILL_NAME_MAX) return text;
  return text.slice(0, PREFILL_NAME_MAX).trim();
}

/** True when text is a consultation sentence rather than a name the person chose. */
function isConsultationSentence(value: string): boolean {
  return (
    value.length > PREFILL_NAME_MAX ||
    SENTENCE_PUNCTUATION.test(value) ||
    DOLLAR_AMOUNT.test(value)
  );
}

export function shortAccountTypeLabel(accountType: string): string {
  if (isCashAccountType(accountType)) return "Cash";
  const display = fromDbAccountType(accountType);
  if (display === "Non-Reg") return "Non-registered";
  return cap(getAccountLabel(display));
}

/**
 * Account name written into the holdings form from a consultation or a statement.
 * Bank and cash accounts are always "Cash". Other accounts keep a short label,
 * or fall back to the account type.
 */
export function prefillAccountName(accountType: string, description?: string | null): string {
  if (isCashAccountType(accountType)) return "Cash";
  const text = (description ?? "").trim();
  if (isShortLabel(text)) return text;
  return shortAccountTypeLabel(accountType);
}

/**
 * Holding line written into the form.
 * Cash is the word "Cash" with no ticker. A real symbol stays a symbol, with the
 * fund name only when that name is already a short label.
 */
export function prefillHoldingLabel(holding: {
  ticker?: string | null;
  name?: string | null;
}): string {
  const ticker = (holding.ticker ?? "").trim();
  const name = (holding.name ?? "").trim();
  const tickerUpper = ticker.toUpperCase();
  const tickerMissing = !ticker || tickerUpper === "UNKNOWN" || tickerUpper === "CASH";

  if (tickerUpper === "CASH" || (tickerMissing && isCashLikeName(name))) {
    return "Cash";
  }

  if (!tickerMissing) {
    if (isShortLabel(name) && name.toUpperCase() !== tickerUpper) {
      const combined = `${name} (${ticker})`;
      if (combined.length <= PREFILL_NAME_MAX) return combined;
    }
    return cap(ticker);
  }

  if (isShortLabel(name)) return name;
  if (name) return "Holding";
  return "";
}

/** Keep a saved or drafted name when it is already within the limit and is not a sentence. */
export function tidyStoredAccountName(
  accountType: string,
  accountName?: string | null,
): string | undefined {
  const name = (accountName ?? "").trim();
  if (!name) return undefined;
  if (name.length <= PREFILL_NAME_MAX && !isConsultationSentence(name)) return name;
  return prefillAccountName(accountType, name);
}

/** Keep a saved holding label, and turn a pasted consultation line into a short one. */
export function tidyStoredHoldingLabel(label?: string | null): string {
  const text = (label ?? "").trim();
  if (!text) return "";
  if (/\(CASH\)\s*$/i.test(text)) return "Cash";
  if (text.length <= PREFILL_NAME_MAX && !isConsultationSentence(text)) return text;
  const embedded = text.match(/^(.*)\(([A-Za-z][A-Za-z0-9.]{0,14})\)\s*$/);
  if (embedded) {
    return prefillHoldingLabel({ name: embedded[1], ticker: embedded[2] });
  }
  return prefillHoldingLabel({ name: text });
}

function savedHoldingLabel(holding: PrefillHoldingInput): string {
  const ticker = (holding.ticker ?? "").trim();
  const name = (holding.name ?? "").trim();
  if (ticker.toUpperCase() === "CASH") return "Cash";
  if (ticker && name && ticker.toUpperCase() !== name.toUpperCase()) {
    return prefillHoldingLabel(holding);
  }
  return tidyStoredHoldingLabel(ticker || name);
}

export interface PrefillHoldingInput {
  ticker?: string | null;
  name?: string | null;
  balance?: number | null;
  units?: number | null;
}

export interface PrefilledHolding {
  tickerOrName: string;
  balance: number;
  units?: number;
}

/** One consultation account, ready for the holdings form. */
export function prefillFactFindAccount(input: {
  accountType: string;
  description?: string | null;
  approximateBalance?: number | null;
  holdings?: PrefillHoldingInput[] | null;
}): { accountType: AccountType; accountName: string; holdings: PrefilledHolding[] } {
  const rows = (input.holdings ?? []).filter(
    (row) => row != null && (row.balance != null || row.ticker || row.name),
  );
  const holdings: PrefilledHolding[] =
    rows.length > 0
      ? rows.map((row) => ({
          tickerOrName: prefillHoldingLabel(row),
          balance: Number(row.balance ?? 0),
          ...(row.units == null ? {} : { units: Number(row.units) }),
        }))
      : [
          {
            tickerOrName: isCashAccountType(input.accountType) ? "Cash" : "",
            balance: Number(input.approximateBalance ?? 0),
          },
        ];

  return {
    accountType: fromDbAccountType(input.accountType),
    accountName: prefillAccountName(input.accountType, input.description),
    holdings,
  };
}

export interface SavedHoldingRow {
  id: string;
  account_type: string;
  display_name?: string | null;
  holdings?: unknown;
  total_value?: number | null;
}

export interface SavedHoldingAccount {
  id: string;
  accountType: AccountType;
  accountName?: string;
  holdings: { localId: string; tickerOrName: string; balance: number; units?: number }[];
  collapsed: boolean;
}

function holdingRecords(raw: unknown): PrefillHoldingInput[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (row == null || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    return [
      {
        ticker: typeof record.ticker === "string" ? record.ticker : "",
        name: typeof record.name === "string" ? record.name : "",
        balance: Number(record.balance ?? 0),
        units: record.units == null || record.units === "" ? null : Number(record.units),
      },
    ];
  });
}

/** Saved investment_holdings rows, with consultation sentences shortened. */
export function accountsFromSavedHoldings(rows: SavedHoldingRow[]): SavedHoldingAccount[] {
  return rows.map((row) => {
    const parsed = holdingRecords(row.holdings);
    const holdings =
      parsed.length > 0
        ? parsed.map((holding, index) => ({
            localId: `${row.id}-${index}`,
            tickerOrName: savedHoldingLabel(holding),
            balance: Number(holding.balance ?? 0),
            ...(holding.units == null ? {} : { units: Number(holding.units) }),
          }))
        : [
            {
              localId: `${row.id}-0`,
              tickerOrName: isCashAccountType(row.account_type) ? "Cash" : "",
              balance: Number(row.total_value ?? 0),
            },
          ];
    const accountType = fromDbAccountType(row.account_type);
    return {
      id: row.id,
      accountType,
      accountName: tidyStoredAccountName(accountType, row.display_name),
      holdings,
      collapsed: false,
    };
  });
}

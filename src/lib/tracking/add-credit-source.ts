import { classifyLiability, formatSnapshotLabel } from "@/lib/net-worth/tracking";
import { accountKey } from "@/lib/tracking/goal-class";

export interface AddedCreditSource {
  key: string;
  name: string;
}

interface DebtRow {
  type: string;
  balance: number;
  rate?: number;
  monthly_payment?: number;
  credit_limit?: number;
  term?: "short" | "long";
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const n = Number(value.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function existingDebts(raw: unknown): DebtRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const debt = row as Record<string, unknown>;
    const type = String(debt.type ?? debt.name ?? "").trim();
    const balance = finiteNumber(debt.balance ?? debt.amount);
    if (!type || balance == null) return [];
    const rate = finiteNumber(debt.rate);
    const payment = finiteNumber(debt.monthly_payment);
    const limit = finiteNumber(debt.credit_limit);
    return [
      {
        type,
        balance,
        ...(rate != null ? { rate } : {}),
        ...(payment != null ? { monthly_payment: payment } : {}),
        ...(limit != null && limit >= 0 ? { credit_limit: limit } : {}),
        term: debt.term === "short" || debt.term === "long" ? debt.term : classifyLiability(type),
      },
    ];
  });
}

/**
 * Add a card or line of credit on Net Worth at a zero balance.
 * The next check-in is where the balance changes.
 */
export async function addCreditSource(label: string): Promise<AddedCreditSource | null> {
  const name = label.trim();
  if (!name) return null;

  try {
    const holdRes = await fetch("/api/holdings", { credentials: "include" });
    if (!holdRes.ok) return null;
    const json = (await holdRes.json()) as { financialProfile?: { major_debts?: unknown } | null } | null;
    const rawDebts = json?.financialProfile?.major_debts;
    const rows = existingDebts(rawDebts);
    if (Array.isArray(rawDebts) && rawDebts.length > 0 && rows.length === 0) return null;
    const match = rows.find((row) => row.type.toLowerCase() === name.toLowerCase());
    if (!match) {
      rows.push({ type: name, balance: 0, term: classifyLiability(name) });
    }

    const saved = await fetch("/api/financial-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ debts: rows }),
    });
    if (!saved.ok) return null;

    const type = match?.type ?? name;
    return { key: accountKey({ type, value: 0 }, "debt"), name: formatSnapshotLabel(type) };
  } catch {
    return null;
  }
}

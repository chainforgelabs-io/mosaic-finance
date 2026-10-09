"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyLiability, type LiabilityTerm } from "@/lib/net-worth/tracking";
import { formatMoneyExact } from "@/lib/tracking/format";
import type { UnlockItem } from "@/components/tracking/UnlockToast";

const ACCOUNT_LABELS: Record<string, string> = {
  RRSP: "RRSP",
  TFSA: "TFSA",
  FHSA: "FHSA",
  RESP: "RESP",
  RDSP: "RDSP",
  RRIF: "RRIF",
  "non-registered": "Non-Registered",
  "Bank-Account": "Bank Account",
};

interface HoldingAccount {
  id: string;
  account_type: string;
  total_value: number;
}

interface FixedAsset {
  id: string;
  name: string;
  estimated_value: number;
}

interface DebtItem {
  type: string;
  amount: number;
  rate?: number;
  monthly_payment?: number;
  credit_limit?: number | null;
  term?: "short" | "long" | null;
}

const STEPS = ["Investments", "Fixed assets", "Debts", "Save"] as const;

export function MonthlyCheckIn({
  holdings,
  fixedAssets,
  debts,
  open,
  onClose,
  onSaved,
}: {
  holdings: HoldingAccount[];
  fixedAssets: FixedAsset[];
  debts: DebtItem[];
  open: boolean;
  onClose: () => void;
  onSaved: (unlocks: UnlockItem[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdVals, setHoldVals] = useState<Record<string, string>>({});
  const [assetVals, setAssetVals] = useState<Record<string, string>>({});
  const [debtVals, setDebtVals] = useState<Record<string, string>>({});
  const [limitVals, setLimitVals] = useState<Record<string, string>>({});
  const [termVals, setTermVals] = useState<Record<string, LiabilityTerm>>({});

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setHoldVals(Object.fromEntries(holdings.map((h) => [h.id, String(h.total_value)])));
    setAssetVals(Object.fromEntries(fixedAssets.map((a) => [a.id, String(a.estimated_value)])));
    setDebtVals(Object.fromEntries(debts.map((d, i) => [`${i}`, String(d.amount)])));
    setLimitVals(Object.fromEntries(debts.map((d, i) => [`${i}`, d.credit_limit != null ? String(d.credit_limit) : ""])));
    setTermVals(Object.fromEntries(debts.map((d, i) => [`${i}`, classifyLiability(d.type, d.term)])));
  }, [open, holdings, fixedAssets, debts]);

  if (!open) return null;

  const invTotal = Object.values(holdVals).reduce((s, v) => s + (Number(v) || 0), 0);
  const fixTotal = Object.values(assetVals).reduce((s, v) => s + (Number(v) || 0), 0);
  const debtTotal = Object.values(debtVals).reduce((s, v) => s + (Number(v) || 0), 0);
  const net = invTotal + fixTotal - debtTotal;

  async function persist() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        holdings.map((h) => {
          const next = Number(holdVals[h.id]);
          if (!Number.isFinite(next) || next === h.total_value) return Promise.resolve();
          return fetch("/api/holdings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: h.id, total_value: next }),
          });
        }),
      );
      await Promise.all(
        fixedAssets.map((a) => {
          const next = Number(assetVals[a.id]);
          if (!Number.isFinite(next) || next === a.estimated_value) return Promise.resolve();
          return fetch("/api/fixed-assets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: a.id, estimated_value: next }),
          });
        }),
      );
      const nextDebts = debts.map((d, i) => {
        const limitRaw = (limitVals[`${i}`] ?? "").trim();
        const limit = limitRaw === "" ? undefined : Number(limitRaw);
        return {
          type: d.type,
          balance: Number(debtVals[`${i}`]) || 0,
          rate: d.rate,
          monthly_payment: d.monthly_payment,
          ...(limit != null && Number.isFinite(limit) && limit >= 0 ? { credit_limit: limit } : {}),
          term: termVals[`${i}`] ?? classifyLiability(d.type, d.term),
        };
      });
      await fetch("/api/financial-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ debts: nextDebts }),
      });

      const snapRes = await fetch("/api/net-worth/snapshots", {
        method: "POST",
        credentials: "include",
      });
      const json = await snapRes.json();
      if (!snapRes.ok) throw new Error(json.error ?? "Failed to save snapshot");
      onSaved(json.gamification?.newUnlocks ?? []);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--warm-200)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Monthly check-in</h2>
            <p className="font-body text-xs text-[var(--text-muted)]">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="flex gap-1 px-5 pt-3">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= step ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]",
              )}
            />
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <ValueList
              empty="No investment accounts yet."
              items={holdings.map((h) => ({
                id: h.id,
                label: ACCOUNT_LABELS[h.account_type] ?? h.account_type,
                value: holdVals[h.id] ?? "",
              }))}
              onChange={(id, v) => setHoldVals((p) => ({ ...p, [id]: v }))}
            />
          )}
          {step === 1 && (
            <ValueList
              empty="No fixed assets yet."
              items={fixedAssets.map((a) => ({
                id: a.id,
                label: a.name,
                value: assetVals[a.id] ?? "",
              }))}
              onChange={(id, v) => setAssetVals((p) => ({ ...p, [id]: v }))}
            />
          )}
          {step === 2 && (
            <ValueList
              empty="No debts on file."
              items={debts.map((d, i) => ({
                id: `${i}`,
                label: d.type,
                value: debtVals[`${i}`] ?? "",
                secondary: {
                  label: "Credit limit (optional)",
                  value: limitVals[`${i}`] ?? "",
                  placeholder: "Leave blank for loans",
                },
                term: termVals[`${i}`] ?? classifyLiability(d.type, d.term),
              }))}
              onChange={(id, v) => setDebtVals((p) => ({ ...p, [id]: v }))}
              onSecondaryChange={(id, v) => setLimitVals((p) => ({ ...p, [id]: v }))}
              onTermChange={(id, term) => setTermVals((p) => ({ ...p, [id]: term }))}
              hint="Balances count against net worth. A credit limit lets the Tracking tab show available credit and liquidity. Short vs long-term is a guess from the name — change it if it is wrong."
            />
          )}
          {step === 3 && (
            <div className="space-y-3">
              <SummaryRow label="Investments" value={invTotal} />
              <SummaryRow label="Fixed assets" value={fixTotal} />
              <SummaryRow label="Debts" value={debtTotal} negative />
              <div className="border-t border-[var(--warm-200)] pt-3">
                <SummaryRow label="Net worth" value={net} emphasis />
              </div>
              <p className="font-body text-xs text-[var(--text-muted)]">
                This overwrites this month’s snapshot if you already saved one.
              </p>
              {error && <p className="font-body text-sm text-[var(--error)]">{error}</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-[var(--warm-200)] p-4">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            <ChevronLeft className="size-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={persist}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save snapshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ValueList({
  items,
  empty,
  hint,
  onChange,
  onSecondaryChange,
  onTermChange,
}: {
  items: {
    id: string;
    label: string;
    value: string;
    secondary?: { label: string; value: string; placeholder?: string };
    term?: LiabilityTerm;
  }[];
  empty: string;
  hint?: string;
  onChange: (id: string, value: string) => void;
  onSecondaryChange?: (id: string, value: string) => void;
  onTermChange?: (id: string, term: LiabilityTerm) => void;
}) {
  if (items.length === 0) {
    return <p className="font-body text-sm text-[var(--text-muted)]">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {hint && <p className="font-body text-xs text-[var(--text-muted)]">{hint}</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={cn(item.secondary && "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2")}>
            <div>
              <label className="font-body text-xs font-medium text-[var(--text-secondary)]">
                {item.label}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.value}
                onChange={(e) => onChange(item.id, e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm tabular-nums"
              />
            </div>
            {item.secondary && (
              <div>
                <label className="font-body text-xs font-medium text-[var(--text-muted)]">
                  {item.secondary.label}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.secondary.value}
                  placeholder={item.secondary.placeholder}
                  onChange={(e) => onSecondaryChange?.(item.id, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--warm-200)] px-3 py-2 font-body text-sm tabular-nums"
                />
              </div>
            )}
            {item.term && onTermChange && (
              <div className={cn(item.secondary && "col-span-2")}>
                <p className="mb-1 font-body text-xs font-medium text-[var(--text-muted)]">Term</p>
                <div className="inline-flex rounded-full border border-[var(--warm-200)] p-0.5">
                  {(["short", "long"] as LiabilityTerm[]).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => onTermChange(item.id, term)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold",
                        item.term === term ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
                      )}
                    >
                      {term === "short" ? "Short-term" : "Long-term"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  negative,
  emphasis,
}: {
  label: string;
  value: number;
  negative?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("font-body text-sm", emphasis ? "font-semibold" : "text-[var(--text-secondary)]")}>
        {label}
      </span>
      <span
        className={cn(
          "font-display tabular-nums",
          emphasis ? "text-lg font-bold" : "text-sm font-semibold",
          negative ? "text-red-600" : "text-[var(--text-primary)]",
        )}
      >
        {formatMoneyExact(value)}
      </span>
    </div>
  );
}

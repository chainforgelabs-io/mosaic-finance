"use client";

import { useState } from "react";
import { parseCalculatorNumber } from "@/lib/calculations/calculator-input";
import {
  illustratePreTaxContribution,
  type TaxLeg,
} from "@/lib/calculations/canadian-accounts";

/** Number box that shows a hint of 0 until the person types, then keeps what they typed. */
export function CalculatorNumberField({
  label,
  value,
  onValue,
  hint,
}: {
  label: string;
  value: number;
  onValue: (next: number) => void;
  hint?: string;
}) {
  const [text, setText] = useState(() => (value === 0 ? "" : String(value)));

  return (
    <label className="block min-w-0">
      <span className="block font-body text-sm leading-snug text-text-secondary">{label}</span>
      {hint ? (
        <span className="mt-0.5 block font-body text-xs leading-relaxed text-text-muted">{hint}</span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        placeholder="0"
        value={text}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const next = parseCalculatorNumber(event.target.value);
          setText(next.text);
          onValue(next.value);
        }}
        className="mt-1.5 w-full min-w-0 rounded-lg border border-warm-200 bg-white px-3 py-3 font-body text-base tabular-nums text-text-primary outline-none focus:border-emerald"
      />
    </label>
  );
}

export function moneyCad(amount: number): string {
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function TaxPicture({
  preTax,
  bracketNow,
  bracketLater,
}: {
  preTax: number;
  bracketNow: number;
  bracketLater: number;
}) {
  if (preTax <= 0 || bracketNow <= 0) return null;
  const picture = illustratePreTaxContribution(preTax, bracketNow, bracketLater);
  const rows: { label: string; note: string; leg: TaxLeg }[] = [
    {
      label: "RRSP",
      note: "Deducted now. Taxed when withdrawn.",
      leg: picture.rrsp,
    },
    {
      label: "TFSA",
      note: "After-tax dollars in. Withdrawal is not taxed.",
      leg: picture.tfsa,
    },
    {
      label: "FHSA, qualifying withdrawal",
      note: "Deducted now. A qualifying first-home withdrawal is not taxed.",
      leg: picture.fhsaQualifying,
    },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-xl border border-warm-200 p-4">
          <p className="font-display text-sm font-semibold">{row.label}</p>
          <p className="mt-1 font-body text-xs leading-relaxed text-text-muted">{row.note}</p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="Goes into the account" value={moneyCad(row.leg.deposited)} />
            <Stat label="Tax reduced now" value={moneyCad(row.leg.taxReducedNow)} />
            <Stat label="Left after withdrawal tax" value={moneyCad(row.leg.leftAfterWithdrawal)} />
          </dl>
        </div>
      ))}
      <p className="max-w-prose font-body text-sm leading-relaxed text-text-muted">
        This uses the contribution itself, with no growth. A non-qualifying FHSA withdrawal is
        taxed, like the RRSP line. The gap is the tax treatment, not a forecast, and not a pick of
        which account to use.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-body text-xs leading-snug text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-base font-bold tabular-nums">{value}</dd>
    </div>
  );
}

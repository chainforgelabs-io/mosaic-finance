"use client";

import { useState } from "react";
import { CalculatorNumberField, TaxPicture, moneyCad } from "@/components/marketing/calculator-field";
import { CalculatorShell } from "@/components/marketing/calculator-shell";
import {
  RRSP_MAX_LIMIT_2025,
  TFSA_ANNUAL_LIMIT_2025,
  calculateRRSPContributionRoom,
  calculateTFSARoom,
} from "@/lib/calculations/canadian-accounts";

export default function RrspVsTfsaPage() {
  const [income, setIncome] = useState(80000);
  const [age, setAge] = useState(32);
  const [unusedRrsp, setUnusedRrsp] = useState(0);
  const [pensionAdjustment, setPensionAdjustment] = useState(0);
  const [tfsaContributed, setTfsaContributed] = useState(0);
  const [preTax, setPreTax] = useState(0);
  const [bracketNow, setBracketNow] = useState(0);
  const [bracketLater, setBracketLater] = useState(0);
  const yearTurnedEighteen = new Date().getFullYear() - age + 18;
  const rrsp = calculateRRSPContributionRoom(income, pensionAdjustment, unusedRrsp);
  const tfsa = calculateTFSARoom(yearTurnedEighteen, tfsaContributed);

  return (
    <CalculatorShell title="RRSP vs TFSA room (illustrative)">
      <div className="space-y-5">
        <CalculatorNumberField label="Last year's earned income" value={income} onValue={setIncome} />
        <CalculatorNumberField label="Age" value={age} onValue={setAge} />
        <CalculatorNumberField
          label="RRSP room already carried in"
          hint="Unused room from earlier years. Leave blank if you are only estimating this year's new room."
          value={unusedRrsp}
          onValue={setUnusedRrsp}
        />
        <CalculatorNumberField
          label="Pension adjustment"
          hint="From a T4, if you have one. Leave blank if none."
          value={pensionAdjustment}
          onValue={setPensionAdjustment}
        />
        <CalculatorNumberField
          label="Already contributed to a TFSA"
          hint="Subtracted from room accumulated since the year you turned 18."
          value={tfsaContributed}
          onValue={setTfsaContributed}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-warm-200 p-4">
            <p className="font-body text-xs leading-snug text-text-muted">RRSP room in this illustration</p>
            <p className="mt-2 break-words font-display text-2xl font-bold tabular-nums">{moneyCad(rrsp)}</p>
            <p className="mt-2 font-body text-xs leading-relaxed text-text-muted">
              18% of last year&apos;s earned income, up to {moneyCad(RRSP_MAX_LIMIT_2025)}, plus room
              carried in, minus the pension adjustment.
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-warm-200 p-4">
            <p className="font-body text-xs leading-snug text-text-muted">TFSA room still unused</p>
            <p className="mt-2 break-words font-display text-2xl font-bold tabular-nums">{moneyCad(tfsa)}</p>
            <p className="mt-2 font-body text-xs leading-relaxed text-text-muted">
              Accumulated from the year you turned 18, minus what you have already contributed. This
              year&apos;s TFSA limit in the illustration is {moneyCad(TFSA_ANNUAL_LIMIT_2025)}.
            </p>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-warm-200 p-4">
          <div>
            <p className="font-display text-sm font-semibold leading-snug">Same dollars, different tax</p>
            <p className="mt-1 max-w-prose font-body text-sm leading-relaxed text-text-muted">
              Optional. A pre-tax amount, the bracket this year, and a later withdrawal bracket.
            </p>
          </div>
          <CalculatorNumberField label="Pre-tax amount" value={preTax} onValue={setPreTax} />
          <CalculatorNumberField
            label="Combined bracket this year (%)"
            value={bracketNow}
            onValue={setBracketNow}
          />
          <CalculatorNumberField
            label="Combined bracket at withdrawal (%)"
            value={bracketLater}
            onValue={setBracketLater}
          />
          <TaxPicture preTax={preTax} bracketNow={bracketNow} bracketLater={bracketLater} />
        </div>

        <p className="max-w-prose font-body text-sm leading-relaxed text-text-muted">
          Confirm both room figures in CRA My Account. This does not pick an account.
        </p>
      </div>
    </CalculatorShell>
  );
}

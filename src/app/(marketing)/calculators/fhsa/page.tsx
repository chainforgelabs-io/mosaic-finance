"use client";

import { useState } from "react";
import { CalculatorNumberField, TaxPicture, moneyCad } from "@/components/marketing/calculator-field";
import { CalculatorShell } from "@/components/marketing/calculator-shell";
import {
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT,
  FHSA_MAX_CARRYFORWARD,
  checkFHSAEligibility,
  fhsaRoomThisYear,
} from "@/lib/calculations/canadian-accounts";

function eligibilityCopy(owned: boolean, age: number): string | null {
  const result = checkFHSAEligibility(owned, age);
  if (result.eligible) return null;
  if (owned) {
    return "The FHSA is for a first home. Having owned a home in Canada generally means a new FHSA is not available.";
  }
  if (age < 18) return "A first home savings account is available from age 18.";
  return "A new FHSA is not available after the year you turn 71.";
}

export default function FhsaCalculatorPage() {
  const [age, setAge] = useState(30);
  const [owned, setOwned] = useState(false);
  const [years, setYears] = useState(1);
  const [carry, setCarry] = useState(0);
  const [before, setBefore] = useState(0);
  const [thisYear, setThisYear] = useState(0);
  const [preTax, setPreTax] = useState(0);
  const [bracketNow, setBracketNow] = useState(0);
  const [bracketLater, setBracketLater] = useState(0);
  const blocked = eligibilityCopy(owned, age);
  const picture = fhsaRoomThisYear({
    yearsOpen: years,
    carryIntoThisYear: carry,
    contributedBeforeThisYear: before,
    contributedThisYear: thisYear,
  });

  return (
    <CalculatorShell title="FHSA contribution room">
      <div className="space-y-5">
        <CalculatorNumberField label="Age" value={age} onValue={setAge} />
        <label className="flex items-start gap-3 font-body text-sm leading-snug text-text-secondary">
          <input
            type="checkbox"
            checked={owned}
            onChange={(event) => setOwned(event.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>I have owned a home in Canada</span>
        </label>
        <CalculatorNumberField
          label="Years the FHSA has been open"
          hint="Use 1 for the year it opened. Clear the box if it is not open yet."
          value={years}
          onValue={setYears}
        />
        <CalculatorNumberField
          label="Unused room carried into this year"
          hint={`Capped at ${moneyCad(FHSA_MAX_CARRYFORWARD)}. A first year has none. CRA My Account shows the figure.`}
          value={carry}
          onValue={setCarry}
        />
        <CalculatorNumberField label="Contributed before this year" value={before} onValue={setBefore} />
        <CalculatorNumberField label="Contributed this year" value={thisYear} onValue={setThisYear} />

        {blocked ? (
          <p className="max-w-prose font-body text-sm leading-relaxed text-text-secondary">{blocked}</p>
        ) : !picture.open ? (
          <p className="max-w-prose font-body text-sm leading-relaxed text-text-secondary">
            An FHSA that is not open yet has no contribution room. The {moneyCad(FHSA_ANNUAL_LIMIT)}{" "}
            annual limit starts the year the account opens, up to {moneyCad(FHSA_LIFETIME_LIMIT)} over
            its life.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-warm-200 bg-warm-50 p-4">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-text-muted">
                Room left this year
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums leading-none">
                {moneyCad(picture.roomLeft)}
              </p>
              <p className="mt-3 max-w-prose font-body text-sm leading-relaxed text-text-secondary">
                Started the year at {moneyCad(picture.roomAtStart)}: the {moneyCad(FHSA_ANNUAL_LIMIT)}{" "}
                annual limit
                {picture.carryUsed > 0 ? ` plus ${moneyCad(picture.carryUsed)} carried in` : ""}. This
                year&apos;s contributions are already subtracted.
              </p>
            </div>
            {years <= 1 && carry > 0 && (
              <p className="max-w-prose font-body text-sm leading-relaxed text-text-muted">
                Carry-forward starts in the second year, so this illustration uses no carried room.
              </p>
            )}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Fact label="Lifetime room still unused" value={moneyCad(picture.lifetimeRemaining)} />
              <Fact label="Years left in the 15-year window" value={String(picture.yearsLeftInWindow)} />
            </dl>
            <p className="max-w-prose font-body text-sm leading-relaxed text-text-muted">
              The most the rules allow in one calendar year is {moneyCad(FHSA_ANNUAL_LIMIT + FHSA_MAX_CARRYFORWARD)},
              and lifetime contributions stop at {moneyCad(FHSA_LIFETIME_LIMIT)}. The account also has to
              close by the end of the year you turn 71, if that comes first. Confirm the room in CRA My
              Account. This does not say whether to open an FHSA or how much to contribute.
            </p>
          </div>
        )}

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
      </div>
    </CalculatorShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-warm-200 p-4">
      <dt className="font-body text-xs leading-snug text-text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

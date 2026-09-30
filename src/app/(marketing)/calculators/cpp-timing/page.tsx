"use client";

import { useMemo, useState } from "react";
import { CalculatorNumberField, moneyCad } from "@/components/marketing/calculator-field";
import { CalculatorShell } from "@/components/marketing/calculator-shell";

/** Simplified educational illustration of CPP timing adjustments. */
function cppFactor(age: number): number {
  if (age <= 60) return 0.64;
  if (age >= 70) return 1.42;
  if (age < 65) return 1 - (65 - age) * 0.072;
  return 1 + (age - 65) * 0.084;
}

const MARKS = [60, 65, 70] as const;

export default function CppTimingPage() {
  const [base, setBase] = useState(13600);
  const [age, setAge] = useState(65);
  const annual = useMemo(() => Math.round(base * cppFactor(age)), [base, age]);
  const monthly = Math.round(annual / 12);

  return (
    <CalculatorShell title="CPP at 60 vs 65 vs 70">
      <div className="space-y-5">
        <CalculatorNumberField
          label="Estimated CPP at 65 (annual)"
          hint="A Service Canada statement shows this. The boxes below scale that amount."
          value={base}
          onValue={setBase}
        />
        <label className="block min-w-0">
          <span className="block font-body text-sm leading-snug text-text-secondary">
            Start age: {age}
          </span>
          <input
            type="range"
            min={60}
            max={70}
            value={age}
            onChange={(event) => setAge(Number(event.target.value))}
            className="mt-3 w-full"
          />
        </label>

        <div className="rounded-xl border border-warm-200 bg-warm-50 p-4 sm:p-5">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-text-muted">
            At age {age}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums leading-none">
            {moneyCad(monthly)}
            <span className="ml-1 font-body text-base font-medium text-text-muted">/ month</span>
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-text-secondary">
            {moneyCad(annual)} a year in this illustration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MARKS.map((mark) => {
            const markAnnual = Math.round(base * cppFactor(mark));
            const selected = age === mark;
            return (
              <button
                key={mark}
                type="button"
                onClick={() => setAge(mark)}
                className={`min-w-0 rounded-xl border p-4 text-left ${
                  selected ? "border-emerald bg-emerald/5" : "border-warm-200 bg-white"
                }`}
              >
                <p className="font-body text-xs leading-snug text-text-muted">Start at {mark}</p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums">
                  {moneyCad(Math.round(markAnnual / 12))}
                </p>
                <p className="mt-1 font-body text-xs leading-relaxed text-text-muted">
                  {moneyCad(markAnnual)} / year
                </p>
              </button>
            );
          })}
        </div>

        <p className="max-w-prose font-body text-sm leading-relaxed text-text-muted">
          Early CPP is reduced by 0.6% per month before 65 (36% lower at 60). Delayed CPP increases
          by 0.7% per month after 65, up to 42% higher at 70. Starting earlier lowers the monthly
          amount. Starting later raises it. This illustration does not choose a start age, and it is
          not a Service Canada estimate.
        </p>
      </div>
    </CalculatorShell>
  );
}

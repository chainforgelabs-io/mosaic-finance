"use client";

import { useMemo, useState } from "react";
import { CalculatorShell } from "@/components/marketing/calculator-shell";

/** Simplified educational illustration of CPP timing adjustments. */
function cppFactor(age: number): number {
  if (age <= 60) return 0.64;
  if (age >= 70) return 1.42;
  if (age < 65) return 1 - (65 - age) * 0.072;
  return 1 + (age - 65) * 0.084;
}

export default function CppTimingPage() {
  const [base, setBase] = useState(13600);
  const [age, setAge] = useState(65);
  const annual = useMemo(() => Math.round(base * cppFactor(age)), [base, age]);

  return (
    <CalculatorShell title="CPP at 60 vs 65 vs 70">
      <div className="space-y-4">
        <label className="block font-body text-sm">
          Estimated CPP at 65 (annual)
          <input
            type="number"
            value={base}
            onChange={(e) => setBase(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <label className="block font-body text-sm">
          Start age: {age}
          <input
            type="range"
            min={60}
            max={70}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <p className="font-display text-2xl font-bold">
          Illustrated annual: ${annual.toLocaleString()}
        </p>
        <p className="font-body text-sm text-text-muted">
          Early CPP is reduced by 0.6% per month before 65; delayed CPP increases by
          0.7% per month after 65, up to 70. This is an educational illustration, not
          a Service Canada estimate.
        </p>
      </div>
    </CalculatorShell>
  );
}

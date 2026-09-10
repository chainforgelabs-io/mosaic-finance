"use client";

import { useState } from "react";
import { CalculatorShell } from "@/components/marketing/calculator-shell";
import {
  calculateRRSPContributionRoom,
  calculateTFSARoom,
} from "@/lib/calculations/canadian-accounts";

export default function RrspVsTfsaPage() {
  const [income, setIncome] = useState(80000);
  const [age, setAge] = useState(32);
  const rrsp = calculateRRSPContributionRoom(income);
  const tfsa = calculateTFSARoom(new Date().getFullYear() - age + 18, 0);

  return (
    <CalculatorShell title="RRSP vs TFSA room (illustrative)">
      <div className="space-y-4">
        <label className="block font-body text-sm">
          Last year&apos;s earned income
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <label className="block font-body text-sm">
          Age
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-warm-200 p-4">
            <p className="font-body text-xs uppercase text-text-muted">RRSP room est.</p>
            <p className="mt-2 font-display text-2xl font-bold">${rrsp.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-warm-200 p-4">
            <p className="font-body text-xs uppercase text-text-muted">TFSA lifetime room est.</p>
            <p className="mt-2 font-display text-2xl font-bold">${tfsa.toLocaleString()}</p>
          </div>
        </div>
        <p className="font-body text-sm text-text-muted">
          RRSP room is 18% of prior earned income up to the annual ceiling. TFSA room
          accumulates from the year you turned 18. Confirm both in CRA My Account.
        </p>
      </div>
    </CalculatorShell>
  );
}

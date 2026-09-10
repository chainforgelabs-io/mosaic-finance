"use client";

import { useState } from "react";
import { CalculatorShell } from "@/components/marketing/calculator-shell";
import { calculateFHSAContributionRoom, checkFHSAEligibility } from "@/lib/calculations/canadian-accounts";

export default function FhsaCalculatorPage() {
  const [age, setAge] = useState(30);
  const [owned, setOwned] = useState(false);
  const [years, setYears] = useState(1);
  const [contributed, setContributed] = useState(0);
  const eligibility = checkFHSAEligibility(owned, age);
  const room = eligibility.eligible
    ? calculateFHSAContributionRoom(years, contributed)
    : 0;

  return (
    <CalculatorShell title="FHSA contribution room">
      <div className="space-y-4">
        <label className="block font-body text-sm">
          Age
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 font-body text-sm">
          <input type="checkbox" checked={owned} onChange={(e) => setOwned(e.target.checked)} />
          I have owned a home in Canada
        </label>
        <label className="block font-body text-sm">
          Years the FHSA has been open
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <label className="block font-body text-sm">
          Total contributed so far
          <input
            type="number"
            value={contributed}
            onChange={(e) => setContributed(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2"
          />
        </label>
        <p className="font-display text-2xl font-bold">
          {eligibility.eligible
            ? `Estimated room: $${room.toLocaleString()}`
            : eligibility.reason}
        </p>
      </div>
    </CalculatorShell>
  );
}

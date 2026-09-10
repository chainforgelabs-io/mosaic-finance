import {
  calculateRRSPContributionRoom,
  calculateTFSARoom,
  checkFHSAEligibility,
  FHSA_ANNUAL_LIMIT,
} from "@/lib/calculations/canadian-accounts";

export interface TaxPackInput {
  age: number | null;
  province: string | null;
  annualIncome: number | null;
  accountTypes: string[];
  hasOwnedHome?: boolean;
}

export interface TaxPackResult {
  year: number;
  contributionRooms: {
    rrsp: number | null;
    tfsa: number | null;
    fhsa: { eligible: boolean; annual: number; reason?: string };
  };
  slips: string[];
  checklist: string[];
  deadlines: { label: string; date: string }[];
  harvestNote: string;
}

export function buildTaxPack(input: TaxPackInput): TaxPackResult {
  const year = new Date().getFullYear();
  const age = input.age ?? 35;
  const income = input.annualIncome ?? 0;
  const types = new Set(input.accountTypes.map((t) => t.toUpperCase()));

  const rrsp = income > 0 ? calculateRRSPContributionRoom(income) : null;
  const yearTurned18 = new Date().getFullYear() - age + 18;
  const tfsa = calculateTFSARoom(yearTurned18, 0);
  const fhsa = checkFHSAEligibility(Boolean(input.hasOwnedHome), age);

  const slips: string[] = ["T4 / T4A (employment or pension income)"];
  if (types.has("RRSP") || types.has("GROUP-RRSP")) slips.push("T4RSP / RRSP contribution receipt");
  if (types.has("TFSA") || types.has("GROUP-TFSA")) slips.push("TFSA contribution room notice (CRA My Account)");
  if (types.has("FHSA")) slips.push("FHSA contribution / qualifying withdrawal slips");
  if (types.has("RESP")) slips.push("RESP contribution statement (for CESG tracking)");
  if (types.has("NON-REGISTERED") || types.has("JOINT")) slips.push("T5 / T3 / T5008 for non-registered accounts");
  slips.push("Property tax / charitable receipts if applicable");

  const checklist = [
    "Confirm RRSP contributions before the first 60 days of the next calendar year.",
    "Check TFSA room in CRA My Account before contributing.",
    "If you have an FHSA, confirm first-time home buyer eligibility still holds.",
    "Gather investment slips for non-registered accounts before filing.",
    "Review withholding on any RRSP/RRIF withdrawals.",
    input.province === "QC"
      ? "Quebec filers: prepare the TP-1 alongside the federal T1."
      : "File your T1 by the April deadline (or June 15 if self-employed).",
  ];

  const deadlines = [
    { label: "RRSP contribution deadline", date: `${year + 1}-03-01` },
    { label: "T1 filing (most individuals)", date: `${year + 1}-04-30` },
    { label: "T1 filing (self-employed)", date: `${year + 1}-06-15` },
    { label: "TFSA / FHSA calendar-year cutoff", date: `${year}-12-31` },
  ];

  return {
    year,
    contributionRooms: {
      rrsp,
      tfsa,
      fhsa: {
        eligible: fhsa.eligible,
        annual: FHSA_ANNUAL_LIMIT,
        reason: fhsa.reason,
      },
    },
    slips,
    checklist,
    deadlines,
    harvestNote:
      "Capital losses in a non-registered account may be used to offset capital gains. This is educational context only — confirm with a licensed tax professional before acting.",
  };
}

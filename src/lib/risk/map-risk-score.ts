import type { RiskLabel } from "@/types";

/** Map DB risk_profiles.risk_score string to display label */
export function mapRiskScoreToLabel(score: string | undefined): RiskLabel {
  const m: Record<string, RiskLabel> = {
    conservative: "Conservative",
    "moderate-conservative": "Moderately Conservative",
    balanced: "Balanced",
    "moderate-growth": "Growth",
    growth: "Growth",
    aggressive: "Aggressive",
  };
  return m[score ?? ""] ?? "Balanced";
}

/** Approximate numeric score for queue table display */
export function mapRiskScoreToNumber(score: string | undefined): number {
  const map: Record<string, number> = {
    conservative: 20,
    "moderate-conservative": 35,
    balanced: 50,
    "moderate-growth": 65,
    growth: 75,
    aggressive: 90,
  };
  return map[score ?? ""] ?? 0;
}

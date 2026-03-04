import { z } from "zod";

export const RISK_LABELS = [
  "Conservative",
  "Moderately Conservative",
  "Balanced",
  "Growth",
  "Aggressive",
] as const;

export type RiskLabel = (typeof RISK_LABELS)[number];

export interface RiskQuestion {
  id: string;
  question: string;
  options: { value: number; label: string }[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "q1",
    question: "How would you react if your portfolio dropped 20% in one month?",
    options: [
      { value: 1, label: "Sell everything immediately" },
      { value: 2, label: "Sell some to reduce risk" },
      { value: 3, label: "Hold and wait for recovery" },
      { value: 4, label: "Buy more at the lower prices" },
    ],
  },
  {
    id: "q2",
    question: "What is your primary investment goal?",
    options: [
      { value: 1, label: "Preserve my capital at all costs" },
      { value: 2, label: "Steady income with some growth" },
      { value: 3, label: "Balanced growth and income" },
      { value: 4, label: "Maximum long-term growth" },
    ],
  },
  {
    id: "q3",
    question: "When do you expect to need this money?",
    options: [
      { value: 1, label: "Within 1–3 years" },
      { value: 2, label: "In 3–7 years" },
      { value: 3, label: "In 7–15 years" },
      { value: 4, label: "15+ years from now" },
    ],
  },
  {
    id: "q4",
    question: "How much investment experience do you have?",
    options: [
      { value: 1, label: "None — I'm just getting started" },
      { value: 2, label: "Some — GICs, savings, basic funds" },
      { value: 3, label: "Moderate — ETFs, stocks, balanced portfolios" },
      { value: 4, label: "Extensive — options, alternatives, active trading" },
    ],
  },
  {
    id: "q5",
    question: "Which statement best describes your comfort with volatility?",
    options: [
      { value: 1, label: "I can't tolerate any loss of principal" },
      { value: 2, label: "Small losses are okay for modest returns" },
      { value: 3, label: "I accept moderate swings for better growth" },
      { value: 4, label: "I'm comfortable with large swings for maximum growth" },
    ],
  },
  {
    id: "q6",
    question: "How stable is your current income?",
    options: [
      { value: 1, label: "Unstable — variable or uncertain" },
      { value: 2, label: "Somewhat stable — some variability" },
      { value: 3, label: "Stable — steady employment" },
      { value: 4, label: "Very stable — multiple income sources or guaranteed" },
    ],
  },
];

export const questionnaireSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

export const riskProfileSchema = z.object({
  questionnaireAnswers: z.record(z.string(), z.number()),
  riskScore: z.number().min(1).max(100),
  riskLabel: z.enum(RISK_LABELS),
});

export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;
export type RiskProfileFormData = z.infer<typeof riskProfileSchema>;

export function computeRiskScore(answers: Record<string, number>): {
  score: number;
  label: RiskLabel;
  segmentIndex: number;
} {
  const values = Object.values(answers);
  if (values.length === 0) return { score: 50, label: "Balanced", segmentIndex: 2 };

  const sum = values.reduce((a, b) => a + b, 0);
  const max = values.length * 4;
  const normalized = Math.round((sum / max) * 100);

  let label: RiskLabel;
  let segmentIndex: number;
  if (normalized <= 25) {
    label = "Conservative";
    segmentIndex = 0;
  } else if (normalized <= 44) {
    label = "Moderately Conservative";
    segmentIndex = 1;
  } else if (normalized <= 63) {
    label = "Balanced";
    segmentIndex = 2;
  } else if (normalized <= 81) {
    label = "Growth";
    segmentIndex = 3;
  } else {
    label = "Aggressive";
    segmentIndex = 4;
  }

  return { score: normalized, label, segmentIndex };
}

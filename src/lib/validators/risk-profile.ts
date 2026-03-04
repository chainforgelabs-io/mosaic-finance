import { z } from 'zod';

const RISK_SCORES = [
  'conservative',
  'moderate-conservative',
  'balanced',
  'moderate-growth',
  'growth',
  'aggressive',
] as const;

export const CreateRiskProfileSchema = z.object({
  riskScore: z.enum(RISK_SCORES),
  questionnaireResponses: z.record(z.string(), z.unknown()).optional(),
  conversationalInsights: z.string().max(10000).optional(),
  confirmedByUser: z.boolean().default(false),
});

export type CreateRiskProfileInput = z.infer<typeof CreateRiskProfileSchema>;
export type RiskScore = (typeof RISK_SCORES)[number];

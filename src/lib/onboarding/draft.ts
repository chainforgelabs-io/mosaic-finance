/** In-progress onboarding answers, stored on the discovery session so a refresh can restore them. */

export interface RiskDraft {
  phase: "questionnaire" | "followup" | "review";
  currentQ: number;
  answers: Record<string, number>;
}

export interface OnboardingDraft {
  risk?: RiskDraft;
  holdings?: unknown[];
  goals?: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function readRiskDraft(value: unknown): RiskDraft | null {
  if (!isRecord(value)) return null;
  if (value.phase !== "questionnaire" && value.phase !== "followup" && value.phase !== "review") {
    return null;
  }
  if (typeof value.currentQ !== "number" || !Number.isInteger(value.currentQ) || value.currentQ < 0 || value.currentQ > 30) {
    return null;
  }
  if (!isRecord(value.answers)) return null;
  const answers: Record<string, number> = {};
  for (const [key, answer] of Object.entries(value.answers)) {
    if (typeof answer === "number" && Number.isFinite(answer)) answers[key] = answer;
  }
  return { phase: value.phase, currentQ: value.currentQ, answers };
}

export function readOnboardingDraft(metadata: unknown): OnboardingDraft {
  if (!isRecord(metadata) || !isRecord(metadata.onboarding_draft)) return {};
  const draft = metadata.onboarding_draft;
  const risk = readRiskDraft(draft.risk);
  return {
    ...(risk ? { risk } : {}),
    ...(Array.isArray(draft.holdings) ? { holdings: draft.holdings } : {}),
    ...(Array.isArray(draft.goals) ? { goals: draft.goals } : {}),
  };
}

export function mergeOnboardingDraft(
  metadata: unknown,
  partial: Partial<Record<keyof OnboardingDraft, unknown>>,
): Record<string, unknown> {
  const base = isRecord(metadata) ? { ...metadata } : {};
  const prev = isRecord(base.onboarding_draft) ? { ...base.onboarding_draft } : {};
  for (const [key, value] of Object.entries(partial)) {
    if (value == null) delete prev[key];
    else prev[key] = value;
  }
  return { ...base, onboarding_draft: prev };
}

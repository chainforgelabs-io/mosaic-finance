/**
 * Stored reports were written as instructions. Screens and the PDF show the
 * descriptive sentences that remain. The stored JSON is not rewritten.
 */

const DISCLAIMER =
  /educational information, not financial advice|licensed (financial |insurance )?advisor/i;

const INSTRUCTION_START =
  /^(?:please\s+)?(?:track|review|explore|consider|confirm|request|monitor|revisit|coordinate|recognize|build|clarify|close|reassess|check|ask|model|direct|allocate|prioriti[sz]e)\b/i;

const ADVICE_PHRASE =
  /\b(?:you should|we recommend|worth exploring|worth checking|consider modeling|close the gap)\b/i;

const ASSUMPTION =
  /\b(?:\d+(?:\.\d+)?\s*%[^.]{0,48}\breturn\b|assuming\b[^.]{0,48}\breturn\b|nominal return|expected return|mathematically optimal|insurance gap|coverage gap|life insurance gap|potential gap of|estimated gap|gap of roughly|gap of about)\b/i;

function lead(text: string): string {
  return text.replace(/^[\s→•*\-\d.)]+/, "").trim();
}

export function isInstruction(text: string): boolean {
  const trimmed = lead(text);
  if (!trimmed) return true;
  if (DISCLAIMER.test(trimmed) && trimmed.length < 220) return true;
  if (INSTRUCTION_START.test(trimmed)) return true;
  if (ADVICE_PHRASE.test(trimmed)) return true;
  if (ASSUMPTION.test(trimmed)) return true;
  return false;
}

export function descriptiveText(text: string): string {
  const kept = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !isInstruction(sentence));
  return kept.join(" ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function descriptiveNotes(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const notes: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const text = descriptiveText(item);
    if (text && !isInstruction(text)) notes.push(text);
  }
  return notes;
}

const PROSE_KEYS = [
  "gap_analysis",
  "rrsp_strategy",
  "tfsa_strategy",
  "fhsa_strategy",
  "current_portfolio_assessment",
  "account_location_strategy",
  "rebalancing_schedule",
  "rrsp_room_analysis",
  "tfsa_room_analysis",
  "tfsa_strategy",
  "fhsa_analysis",
  "tax_loss_harvesting_opportunities",
  "income_splitting_opportunities",
  "provincial_tax_considerations",
  "recommendation_rationale",
  "refinancing_analysis",
  "monthly_schedule_summary",
  "disability_insurance_analysis",
  "critical_illness_analysis",
  "macro_environment",
  "portfolio_specific_risks",
  "portfolio_specific_opportunities",
  "rate_environment_impact",
  "canadian_market_context",
  "decade_by_decade_summary",
  "emergency_fund_status",
  "net_worth_trend",
  "reason",
  "rationale",
] as const;

const NOTE_KEYS = [
  "action_items",
  "key_findings",
  "key_assumptions",
  "current_decade_priorities",
  "next_decade_priorities",
] as const;

function cleanSection(section: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...section };
  for (const key of NOTE_KEYS) {
    if (key in next) next[key] = descriptiveNotes(next[key]);
  }
  for (const key of PROSE_KEYS) {
    if (typeof next[key] === "string") next[key] = descriptiveText(next[key]);
  }
  delete next.life_insurance_gap;
  if (Array.isArray(next.coverage_recommendations)) {
    next.coverage_recommendations = next.coverage_recommendations.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const rec = { ...(item as Record<string, unknown>) };
      if (typeof rec.rationale === "string") rec.rationale = descriptiveText(rec.rationale);
      if (typeof rec.rationale !== "string" || rec.rationale.length === 0) return [];
      return [rec];
    });
  }
  if (Array.isArray(next.net_worth_milestones)) {
    next.net_worth_milestones = next.net_worth_milestones.map((item) => {
      if (!item || typeof item !== "object") return item;
      const milestone = { ...(item as Record<string, unknown>) };
      if (typeof milestone.key_actions === "string") {
        milestone.key_actions = descriptiveText(milestone.key_actions);
      }
      return milestone;
    });
  }
  if (Array.isArray(next.debt_ranking)) {
    next.debt_ranking = next.debt_ranking.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = { ...(item as Record<string, unknown>) };
      if (typeof row.reason === "string") row.reason = descriptiveText(row.reason);
      return row;
    });
  }
  return next;
}

export function describeStoredReport(planData: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...planData };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = cleanSection(value as Record<string, unknown>);
    }
  }
  return next;
}

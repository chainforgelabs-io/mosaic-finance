/**
 * Stored reports were written as instructions. Screens and the PDF show the
 * descriptive sentences that remain. The stored JSON is not rewritten.
 */

const DISCLAIMER =
  /educational information, not financial advice|licensed (financial |insurance )?advisor/i;

const INSTRUCTION_START =
  /^(?:please\s+)?(?:track|review|explore|consider|confirm|request|monitor|revisit|coordinate|recognize|build|clarify|close|reassess|check|ask|model|direct|allocate|prioriti[sz]e|evaluate|adjust)\b/i;

const ADVICE_PHRASE =
  /\b(?:you should|we recommend|worth (?:exploring|checking|reviewing)|consider modeling|close the gap|could be explored|may not align|personalized projection|accelerat\w*|specific attention|adjust(?:ing)? (?:the |your |a )?savings|evaluate progress|gap persists|this gap|the gap|a gap\b|shortfall|prioriti[sz]\w*|higher-rate|higher rate debt|tackling|verify with a professional|growth-oriented)\b/i;

/** A period in these abbreviations is not the end of a sentence. */
const ABBREVIATION =
  /(?:^|[\s(])(?:vs|approx|e\.g|i\.e|mr|mrs|ms|dr|st|jr|sr|inc|ltd|etc|fig|no|u\.s|u\.k)$/i;

function sentenceParts(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== "." && char !== "!" && char !== "?") continue;
    const next = text[i + 1];
    if (next != null && !/\s/.test(next)) continue;
    if (char === "." && ABBREVIATION.test(text.slice(start, i))) continue;
    const sentence = text.slice(start, i + 1).trim();
    if (sentence) parts.push(sentence);
    start = i + 1;
    while (start < text.length && /\s/.test(text[start])) start += 1;
    i = start - 1;
  }
  const rest = text.slice(start).trim();
  if (rest) parts.push(rest);
  return parts;
}

const ASSUMPTION =
  /\b(?:\d+(?:\.\d+)?\s*%[^.]{0,48}\breturn\b|assuming\b[^.]{0,48}\breturn\b|nominal return|expected return|mathematically optimal|insurance gaps?|coverage gaps?|life insurance gaps?|potential gap of|estimated gap|gap of roughly|gap of about|closing insurance)\b/i;

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
  const kept = sentenceParts(text).filter((sentence) => sentence.length > 0 && !isInstruction(sentence));
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
        const text = descriptiveText(milestone.key_actions);
        if (text) milestone.key_actions = text;
        else delete milestone.key_actions;
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

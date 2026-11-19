/** Pure rules for resuming a discovery chat and for what the confirmation card may claim. */

export interface FactFindSessionRef {
  id: string;
  status: string;
  metadata: unknown;
  lastActivityAt: string;
  messageCount: number;
}

export interface FactFindPicture {
  monthly_expenses?: number | null;
  monthly_savings?: number | null;
  emergency_fund_months?: number | null;
  retirement_target_age?: number | null;
  major_debts?: unknown;
}

export function hasExtractedFactFind(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const extracted = (metadata as { extracted_data?: unknown }).extracted_data;
  return extracted != null && typeof extracted === "object" && !Array.isArray(extracted);
}

export function extractedFactFind(metadata: unknown): Record<string, unknown> | null {
  if (!hasExtractedFactFind(metadata)) return null;
  return omitUnaskedInvestmentKnowledge(
    (metadata as { extracted_data: Record<string, unknown> }).extracted_data,
  );
}

/** Discovery does not ask this, so a guessed label must not be stored or shown. */
export function omitUnaskedInvestmentKnowledge<T extends Record<string, unknown>>(data: T): T {
  if (!("investment_knowledge" in data)) return data;
  const next = { ...data };
  delete next.investment_knowledge;
  return next;
}

export function factFindMetadataConfirmed(metadata: unknown): boolean {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      (metadata as { confirmed?: unknown }).confirmed === true,
  );
}

export function profileHasFactFindPicture(profile: FactFindPicture | null | undefined): boolean {
  if (!profile) return false;
  if (profile.monthly_expenses != null) return true;
  if (profile.monthly_savings != null) return true;
  if (profile.emergency_fund_months != null) return true;
  if (profile.retirement_target_age != null) return true;
  return Array.isArray(profile.major_debts) && profile.major_debts.length > 0;
}

/**
 * The discovery step is finished only after the person confirms the card.
 * A completed model transcript is not enough: that is the card, still open.
 * A saved monthly picture covers sessions confirmed before this flag existed.
 */
export function isFactFindStepComplete(input: {
  sessions: Array<{ status: string; metadata: unknown }>;
  profile: FactFindPicture | null | undefined;
}): boolean {
  if (profileHasFactFindPicture(input.profile)) return true;
  return input.sessions.some(
    (session) =>
      session.status === "completed" && factFindMetadataConfirmed(session.metadata),
  );
}

/**
 * Prefer the transcript that already has a summary, then the longest transcript.
 * A refresh that opened a second, shorter session must not win.
 */
export function pickFactFindSession<T extends FactFindSessionRef>(sessions: T[]): T | null {
  const open = sessions.filter((session) => session.status !== "abandoned");
  if (open.length === 0) return null;
  return [...open].sort((a, b) => {
    const summary = Number(hasExtractedFactFind(b.metadata)) - Number(hasExtractedFactFind(a.metadata));
    if (summary !== 0) return summary;
    if (a.messageCount !== b.messageCount) return b.messageCount - a.messageCount;
    return b.lastActivityAt.localeCompare(a.lastActivityAt);
  })[0];
}

/** Shorter sessions with no summary are restarts and should not stay active. */
export function factFindSessionsToAbandon<T extends FactFindSessionRef>(
  sessions: T[],
  picked: T | null,
): string[] {
  if (!picked) return [];
  return sessions
    .filter(
      (session) =>
        session.id !== picked.id &&
        session.status !== "abandoned" &&
        !hasExtractedFactFind(session.metadata) &&
        session.messageCount <= picked.messageCount,
    )
    .map((session) => session.id);
}

export function shouldShowFactFindSummary(input: {
  status: string;
  hasExtracted: boolean;
  lastMessageRole: "user" | "assistant" | null;
  lastMessageContent: string;
}): boolean {
  if (!input.hasExtracted) return false;
  if (input.lastMessageRole === "user") return false;
  if (input.status === "completed") return true;
  return /pull everything together/i.test(input.lastMessageContent);
}

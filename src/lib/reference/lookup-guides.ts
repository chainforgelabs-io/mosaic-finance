/**
 * Figures someone could not name in the discovery chat.
 * The report stores only the facts (topic, missing, institution).
 * Titles, checklists, and links are built here so a wording fix reaches old reports.
 */

export const LOOKUP_TOPICS = [
  "income",
  "savings",
  "investments",
  "insurance",
  "debts",
] as const;

export type LookupTopic = (typeof LOOKUP_TOPICS)[number];

export interface InformationGap {
  topic: LookupTopic;
  missing: string;
  institution: string | null;
}

export interface LookupGuide {
  topic: LookupTopic;
  title: string;
  missing: string;
  institution: string | null;
  howToReach: string;
  checklist: string[];
  href: string | null;
  linkLabel: string | null;
}

export const FIGURES_TO_ADD_SECTION = {
  id: "information_to_gather",
  title: "Figures to add",
  subtitle: "What you were not sure of when you talked with Charlie, and where to find it.",
  disclaimer: "This is educational information, not financial advice.",
} as const;

export const LOOK_UP_LATER_LABEL = "To look up later";

export const SEE_WHERE_TO_FIND_THEM = "See where to find them.";

const FIELD_MAX = 60;
const GAP_CAP = 6;

const HOW_TO_REACH =
  "Use the number on your card or a recent statement, or the institution's own website.";

const TOPIC_TITLES: Record<LookupTopic, string> = {
  income: "How to find your income figures",
  savings: "How to find your savings and cash balances",
  investments: "How to find your investment account balances",
  insurance: "How to find your insurance coverage",
  debts: "How to find your debt balances",
};

const TOPIC_CHECKLISTS: Record<LookupTopic, string[]> = {
  income: [
    "Look at your latest pay stub or T4 for gross (before tax) pay.",
    "CRA My Account also shows T4 amounts for prior years.",
    "Do not send a SIN or a full account number in Mosaic chat.",
  ],
  savings: [
    "Sign in to online banking and open chequing, savings, and any high-interest savings.",
    "Note the current balance of each.",
  ],
  investments: [
    "Sign in to online banking or the brokerage.",
    "Note the current balance of each registered and non-registered account (RRSP, TFSA, FHSA, RESP, non-registered).",
  ],
  insurance: [
    "If coverage is through work, open the group benefits portal or the benefits booklet.",
    "Otherwise sign in with the insurer named on the policy.",
    "Note the coverage amount. For whole life or universal life only, also note the cash surrender value and add that cash value on Net Worth. The death benefit is coverage, not an asset.",
  ],
  debts: [
    "Open a recent statement or online banking.",
    "Note the outstanding balance, interest rate, and regular payment.",
  ],
};

const DESTINATIONS: Record<
  LookupTopic,
  { href: string; linkLabel: string } | null
> = {
  income: { href: "/dashboard/cash-flow/plan", linkLabel: "Add it in Budget plan" },
  savings: { href: "/dashboard/assets", linkLabel: "Add it in Net Worth" },
  investments: { href: "/dashboard/assets", linkLabel: "Add it in Net Worth" },
  debts: { href: "/dashboard/assets", linkLabel: "Add it in Net Worth" },
  insurance: null,
};

function isLookupTopic(value: string): value is LookupTopic {
  return (LOOKUP_TOPICS as readonly string[]).includes(value);
}

function clip(value: string): string {
  return value.trim().slice(0, FIELD_MAX);
}

export function parseInformationGaps(raw: unknown): InformationGap[] {
  if (!Array.isArray(raw)) return [];
  const gaps: InformationGap[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (gaps.length >= GAP_CAP) break;
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const topic = typeof record.topic === "string" ? record.topic : "";
    if (!isLookupTopic(topic)) continue;
    const missingSource =
      typeof record.missing === "string" && record.missing.trim()
        ? record.missing
        : topic;
    const missing = clip(missingSource);
    if (!missing) continue;
    const institution =
      typeof record.institution === "string" && record.institution.trim()
        ? clip(record.institution)
        : null;
    const key = `${topic}:${missing.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    gaps.push({
      topic,
      missing,
      institution: institution || null,
    });
  }
  return gaps;
}

/**
 * The list belongs on the first report after the chat. A later report, including
 * a monthly regeneration, drops it. A failed report does not count: the caller
 * leaves failed dates out. A chat done again counts as new, because older
 * reports then sit before chatCompletedAt.
 */
export function gapsForReport(
  gaps: InformationGap[],
  input: { chatCompletedAt: string | null; earlierReportDates: string[] },
): InformationGap[] {
  if (gaps.length === 0) return [];
  const chatAt = input.chatCompletedAt ? Date.parse(input.chatCompletedAt) : Number.NaN;
  const reportAlreadyFollowedTheChat = input.earlierReportDates.some((date) => {
    const at = Date.parse(date);
    if (!Number.isFinite(at)) return false;
    if (!Number.isFinite(chatAt)) return true;
    return at > chatAt;
  });
  return reportAlreadyFollowedTheChat ? [] : gaps;
}

export function buildLookupGuides(gaps: InformationGap[]): LookupGuide[] {
  return gaps.map((gap) => {
    const destination = DESTINATIONS[gap.topic];
    return {
      topic: gap.topic,
      title: TOPIC_TITLES[gap.topic],
      missing: gap.missing,
      institution: gap.institution,
      howToReach: HOW_TO_REACH,
      checklist: [...TOPIC_CHECKLISTS[gap.topic]],
      href: destination?.href ?? null,
      linkLabel: destination?.linkLabel ?? null,
    };
  });
}

export function lookupGuidesFromPlanData(
  planData: Record<string, unknown>,
): LookupGuide[] {
  return buildLookupGuides(parseInformationGaps(planData.information_to_gather));
}

export function figuresToAddLead(missing: string[]): string | null {
  const figures = missing.map((item) => item.trim()).filter(Boolean);
  if (figures.length === 0) return null;
  return `This report was put together without ${figures.length} figures you were not sure of: ${figures.join(", ")}.`;
}

export function figuresToAddNote(missing: string[]): string | null {
  const lead = figuresToAddLead(missing);
  if (!lead) return null;
  return `${lead} ${SEE_WHERE_TO_FIND_THEM}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

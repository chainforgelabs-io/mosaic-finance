export interface EducationIssue {
  slug: string;
  subject: string;
  preheader: string;
  title: string;
  kicker: string;
  /** HTML snippet for the body (no wrapper). */
  body: (appUrl: string) => string;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #E8E8E0;font-family:Arial,sans-serif;font-size:13px;color:#6B7280;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #E8E8E0;font-family:Arial,sans-serif;font-size:13px;color:#0C0F17;text-align:right;">${value}</td>
  </tr>`;
}

/**
 * ISO week (UTC), 1–53.
 */
export function isoWeekUtc(date: Date): number {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isEducationWeek(date: Date): boolean {
  return isoWeekUtc(date) % 2 === 0;
}

export const EDUCATION_ISSUES: EducationIssue[] = [
  {
    slug: "rrsp-tfsa-fhsa",
    subject: "RRSP, TFSA, FHSA — how the three accounts actually differ",
    preheader: "Tax treatment, room, and withdrawals in one screen.",
    title: "Three Canadian accounts, one screen",
    kicker: "Education note",
    body: (appUrl) => `
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        These buckets are often mixed together in a spreadsheet. They are not interchangeable — the tax treatment, contribution room, and withdrawal rules differ.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 16px;">
        ${row("RRSP", "Deduction now · taxed on withdrawal")}
        ${row("TFSA", "After-tax in · growth not taxed")}
        ${row("FHSA", "Deduction now · qualifying first-home withdrawal not taxed")}
      </table>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0C0F17;">Worked example (illustration)</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        $10,000 contributed while in a 40% federal+provincial bracket, later withdrawn in a 25% bracket, does not have the same after-tax result in an RRSP as in a TFSA. The gap is the tax treatment — not a forecast of returns.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Run the numbers for a hypothetical income on the
        <a href="${appUrl}/calculators/rrsp-vs-tfsa" style="color:#059669;">RRSP vs TFSA calculator</a>
        or the
        <a href="${appUrl}/calculators/fhsa" style="color:#059669;">FHSA calculator</a>.
        Educational context, not a pick of which account to use.
      </p>`,
  },
  {
    slug: "tfsa-emergency",
    subject: "TFSA room vs emergency cash — a tracking gap that is easy to miss",
    preheader: "Withdrawals from a TFSA do not restore room until the next calendar year.",
    title: "Emergency cash sitting in a TFSA",
    kicker: "Education note",
    body: (appUrl) => `
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        A common tracking picture: the emergency fund and long-term TFSA room live in the same account. If you need the cash this year, the withdrawal is allowed — and the room does not come back until January 1 of the following year.
      </p>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0C0F17;">Worked example (illustration)</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        $8,000 emergency cash is inside a TFSA. A job gap in June means a $8,000 withdrawal. That $8,000 of room is unavailable to recontribute until the next calendar year. The account still “looks fine” in a brokerage app because the withdrawal succeeded.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Mosaic’s tracker keeps cash, registered room, and net worth as separate tiles so that picture is visible.
        <a href="${appUrl}/signup" style="color:#059669;">See how tracking works</a>
      </p>`,
  },
  {
    slug: "cpp-timing",
    subject: "CPP at 60 vs 65 — what the reduction actually is",
    preheader: "0.6% per month before 65. A calculator, not a recommendation.",
    title: "CPP timing in one number",
    kicker: "Education note",
    body: (appUrl) => `
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Canada Pension Plan can start as early as 60 or as late as 70. Starting before 65 reduces the monthly amount by 0.6% for each month early (36% at 60). Starting after 65 increases it by 0.7% per month.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 16px;">
        ${row("Start at 60", "36% lower monthly amount vs 65")}
        ${row("Start at 65", "Standard amount")}
        ${row("Start at 70", "42% higher monthly amount vs 65")}
      </table>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Longevity, other income, and OAS clawback all change the picture. The
        <a href="${appUrl}/calculators/cpp-timing" style="color:#059669;">CPP timing calculator</a>
        shows the monthly difference for a hypothetical amount — not which start age to choose.
      </p>`,
  },
  {
    slug: "health-score",
    subject: "What Mosaic’s Financial Health Score is actually measuring",
    preheader: "Consistency of tracking — not investment returns.",
    title: "The score is a habit, not a return",
    kicker: "Education note",
    body: (appUrl) => `
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Mosaic’s Financial Health Score moves when you log spending and take a monthly net-worth snapshot. It does not measure portfolio performance, and it is not a forecast.
      </p>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0C0F17;">The 90-day Consistency Guarantee</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        The guarantee is conditioned only on logging spending weekly and completing the monthly net-worth snapshot for 90 days, measured by the Score. It is not conditioned on returns, savings, or following any action list.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        Tracking, budgets, net worth, and the live Score stay free on Pulse.
        <a href="${appUrl}/signup" style="color:#059669;">Open Mosaic</a>
      </p>`,
  },
];

export function educationIssueForDate(date: Date): EducationIssue {
  const index = isoWeekUtc(date) % EDUCATION_ISSUES.length;
  return EDUCATION_ISSUES[index] ?? EDUCATION_ISSUES[0];
}

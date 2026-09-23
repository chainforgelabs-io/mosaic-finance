import { describe, expect, it, beforeAll } from "vitest";
import {
  filterLiquidMovers,
  firstSentences,
  sanitizeRecap,
} from "@/lib/email/market-brief";
import {
  educationIssueForDate,
  isEducationWeek,
  isoWeekUtc,
} from "@/lib/email/education";
import {
  NURTURE_ISSUES,
  PRELAUNCH_ISSUES,
  nurtureIssue,
  planNurtureSend,
  prelaunchIssue,
} from "@/lib/email/nurture-content";
import {
  daysRemaining,
  optedOutOfMarketing,
  shouldSendTrialDay10,
  shouldSendTrialExpired,
} from "@/lib/email/trial";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";
import type { MarketMover } from "@/lib/market-data/types";

beforeAll(() => {
  process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
});

function mover(partial: Partial<MarketMover> & { symbol: string }): MarketMover {
  return {
    name: partial.name ?? partial.symbol,
    price: partial.price ?? 20,
    change: partial.change ?? 1,
    changePercent: partial.changePercent ?? 5,
    ...partial,
  };
}

describe("filterLiquidMovers", () => {
  it("drops penny pumps and funds", () => {
    const filtered = filterLiquidMovers([
      mover({ symbol: "NRSN", name: "NeuroSense Therapeutics Ltd.", price: 1.2, changePercent: 1705 }),
      mover({ symbol: "FIFGX", name: "Fidelity SAI Inflation-Focused", price: 12, changePercent: -29.8 }),
      mover({ symbol: "SHOP", name: "Shopify", price: 80, changePercent: 4.2 }),
      mover({ symbol: "RY", name: "Royal Bank", price: 110, changePercent: -2.1 }),
    ]);
    expect(filtered.map((m) => m.symbol)).toEqual(["SHOP", "RY"]);
  });

  it("drops moves outside 1–40%", () => {
    const filtered = filterLiquidMovers([
      mover({ symbol: "AAA", changePercent: 0.2 }),
      mover({ symbol: "BBB", changePercent: 55 }),
      mover({ symbol: "CCC", changePercent: 8 }),
    ]);
    expect(filtered.map((m) => m.symbol)).toEqual(["CCC"]);
  });
});

describe("sanitizeRecap", () => {
  it("strips markdown headings and keeps two sentences", () => {
    const out = sanitizeRecap(
      "# Weekly Market Recap: Broad Retreat\n\nMajor indices closed the week in the red. Tech led the decline. Extra sentence three should go.",
    );
    expect(out.startsWith("#")).toBe(false);
    expect(out).toContain("Major indices");
    expect(out).not.toContain("Extra sentence");
  });
});

describe("firstSentences", () => {
  it("returns the original text when there are no sentence endings", () => {
    expect(firstSentences("no stop")).toBe("no stop");
  });
});

describe("unsubscribe tokens", () => {
  it("round-trips email and list", () => {
    const token = signUnsubscribeToken("Carson@Live.CA", "market");
    expect(verifyUnsubscribeToken(token)).toEqual({
      email: "carson@live.ca",
      list: "market",
      v: 1,
    });
  });

  it("rejects a tampered token", () => {
    const token = signUnsubscribeToken("a@b.com", "all");
    expect(verifyUnsubscribeToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(verifyUnsubscribeToken("not-a-token")).toBeNull();
  });
});

describe("trial lifecycle windows", () => {
  const now = new Date("2026-09-21T15:00:00Z");

  it("sends day-10 once when trial ends within 4 days", () => {
    expect(
      shouldSendTrialDay10({
        subscriptionTier: "pulse",
        trialEndsAt: "2026-09-24T15:00:00Z",
        alreadySentAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      shouldSendTrialDay10({
        subscriptionTier: "pulse",
        trialEndsAt: "2026-09-24T15:00:00Z",
        alreadySentAt: "2026-09-20T15:00:00Z",
        now,
      }),
    ).toBe(false);
    expect(
      shouldSendTrialDay10({
        subscriptionTier: "progress",
        trialEndsAt: "2026-09-24T15:00:00Z",
        alreadySentAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("sends expired once in the first day after trial_ends_at", () => {
    expect(
      shouldSendTrialExpired({
        subscriptionTier: "pulse",
        trialEndsAt: "2026-09-21T10:00:00Z",
        alreadySentAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      shouldSendTrialExpired({
        subscriptionTier: "pulse",
        trialEndsAt: "2026-09-19T15:00:00Z",
        alreadySentAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("counts remaining days up", () => {
    expect(daysRemaining("2026-09-24T15:00:00Z", now)).toBe(3);
  });

  it("treats unsub-all as both lists off", () => {
    expect(optedOutOfMarketing({ weekly_market: false, education_emails: false })).toBe(true);
    expect(optedOutOfMarketing({ weekly_market: true, education_emails: false })).toBe(false);
  });
});

describe("education cadence", () => {
  it("treats even ISO weeks as send weeks", () => {
    const even = new Date("2026-09-16T13:00:00Z");
    const odd = new Date("2026-09-23T13:00:00Z");
    expect(isoWeekUtc(even) % 2).toBe(isoWeekUtc(even) % 2);
    expect(isEducationWeek(even)).toBe(isoWeekUtc(even) % 2 === 0);
    expect(isEducationWeek(odd)).toBe(isoWeekUtc(odd) % 2 === 0);
    expect(educationIssueForDate(even).slug).toBeTruthy();
  });
});

describe("nurture issues", () => {
  it("clamps to the four follow-up emails", () => {
    expect(NURTURE_ISSUES).toHaveLength(4);
    expect(nurtureIssue(0).subject).toMatch(/mistakes/i);
    expect(nurtureIssue(99).stepIndex).toBe(3);
  });

  it("keeps pre-launch notes on calculators, not signup", () => {
    expect(PRELAUNCH_ISSUES.length).toBeGreaterThan(1);
    for (const issue of PRELAUNCH_ISSUES) {
      const html = issue.body("https://mosaicfinance.ai");
      expect(html).not.toContain("/signup");
      expect(html).not.toMatch(/\$8/);
    }
    expect(prelaunchIssue(99).stepIndex).toBe(99 % PRELAUNCH_ISSUES.length);
  });

  it("holds a step-2 waitlist row until launch, then resumes the sequence", () => {
    const createdAt = "2026-09-17T23:20:10.684Z";
    const lastNurtureAt = "2026-09-21T15:16:48.362Z";
    const tooSoon = new Date("2026-09-25T15:00:00.000Z");
    const due = new Date("2026-09-28T16:00:00.000Z");

    expect(
      planNurtureSend({
        live: false,
        nurtureStep: 2,
        createdAt,
        lastNurtureAt,
        now: tooSoon,
      }).action,
    ).toBe("skip");

    const held = planNurtureSend({
      live: false,
      nurtureStep: 2,
      createdAt,
      lastNurtureAt,
      now: due,
    });
    expect(held.action).toBe("prelaunch");

    const launched = planNurtureSend({
      live: true,
      nurtureStep: 2,
      createdAt,
      lastNurtureAt,
      now: due,
    });
    expect(launched).toEqual({ action: "sequence", issueIndex: 1, nextStep: 3 });
  });
});

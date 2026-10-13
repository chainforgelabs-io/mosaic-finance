import { describe, expect, it } from "vitest";
import {
  GUARANTEE_ACTIONS,
  GUARANTEE_LONG,
  GUARANTEE_SHORT,
  OFFER_BONUSES,
  OFFER_FOOTNOTE,
  OFFER_NAME,
  OUTCOME_HEADLINE,
} from "@/lib/config/offer";

/**
 * AGENTS.md: the Consistency Guarantee is conditioned only on weekly logging
 * and the monthly net-worth snapshot for 90 days, measured by the Financial
 * Health Score. Never on returns, savings, or following action steps.
 */
const FORBIDDEN = [
  /financial advisor(?! before)/i, // allowed only as "speak with a licensed financial advisor before…"
  /financial planner/i,
  /AI advisor/i,
  /asset allocation/i,
  /which account to prioriti[sz]e/i,
  /we recommend/i,
  /guaranteed return/i,
  /investment return(?!s\.)/i, // "not investment returns." is the disclaimer, allowed
  /dollars saved/i,
  /follow(ing)? (the )?action/i,
  /you should (buy|sell)/i,
];

const ALL_COPY = [
  OFFER_NAME,
  OUTCOME_HEADLINE,
  GUARANTEE_SHORT,
  GUARANTEE_LONG,
  OFFER_FOOTNOTE,
  ...GUARANTEE_ACTIONS.map((a) => `${a.label} ${a.cadence}`),
  ...OFFER_BONUSES.flatMap((b) => [b.title, b.desc]),
];

describe("offer copy compliance", () => {
  it("names the offer and the outcome without advice language", () => {
    expect(OFFER_NAME).toBe("The 90-Day Canadian Money Reset");
    expect(OUTCOME_HEADLINE).toBe("Is your money moving the right way?");
  });

  it("conditions the Guarantee on logging, snapshots, 90 days, and the Score only", () => {
    for (const text of [GUARANTEE_SHORT, GUARANTEE_LONG]) {
      expect(text).toMatch(/log/i);
      expect(text).toMatch(/snapshot/i);
      expect(text).toMatch(/90 days/);
      expect(text).toMatch(/Financial Health Score/);
    }
  });

  it("never uses forbidden advice or performance language", () => {
    for (const text of ALL_COPY) {
      for (const pattern of FORBIDDEN) {
        expect(text, `"${text}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps bonus prices on the published ladder", () => {
    const founding = OFFER_BONUSES.find((b) => b.title.includes("Founding"));
    expect(founding?.desc).toContain("$8/mo");
    expect(founding?.desc).toContain("$80/yr");
  });
});

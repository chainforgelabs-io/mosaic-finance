import { describe, expect, it } from "vitest";
import {
  cashValueAssetsFromFactFind,
  cashValueAssetsFromText,
} from "@/lib/assets/life-insurance-cash-value";
import { goalRowFromExtracted } from "@/lib/tracking/sync-goals";

const UL_SENTENCE =
  "Yes about 1.5million in life insurance for me term 20s 100k of that is a UL policy with 9k csv. She has 400k in life plus work coverage for 2x her salary. We both have ci coverage for 150k each. Other insurance premiums are about 1000 annually for the term and 200 a month for the UL which only 60 is for the insurance";

describe("life insurance cash value", () => {
  it("reads a UL cash surrender value and ignores the death benefit", () => {
    const assets = cashValueAssetsFromText(UL_SENTENCE);
    expect(assets).toEqual([
      expect.objectContaining({
        name: "Universal life cash value",
        cashValue: 9000,
      }),
    ]);
  });

  it("reads cash value stated after the label", () => {
    expect(cashValueAssetsFromText("The whole life cash surrender value is $12,500.")).toEqual([
      expect.objectContaining({
        name: "Whole life cash value",
        cashValue: 12500,
      }),
    ]);
  });

  it("ignores premiums and term coverage with no cash value", () => {
    expect(
      cashValueAssetsFromText("Term is $1,000 a year and the UL costs $200 a month, of which $60 is insurance."),
    ).toEqual([]);
  });

  it("prefers structured policy cash values over the death benefit", () => {
    const assets = cashValueAssetsFromFactFind({
      insurance_coverage: {
        life: {
          amount: 1_500_000,
          cash_value: 9000,
          policies: [
            { name: "Term 20", type: "term", death_benefit: 1_400_000, cash_value: null },
            { name: "UL", type: "universal", death_benefit: 100_000, cash_value: 9300 },
          ],
        },
      },
    });
    expect(assets).toEqual([
      expect.objectContaining({ name: "Universal life cash value", cashValue: 9300 }),
    ]);
  });

  it("falls back to the transcript when the summary has no cash value", () => {
    const assets = cashValueAssetsFromFactFind(
      { insurance_coverage: { life: { amount: 1_500_000, cash_value: null } } },
      UL_SENTENCE,
    );
    expect(assets).toEqual([
      expect.objectContaining({ name: "Universal life cash value", cashValue: 9000 }),
    ]);
  });
});

describe("goal names from fact-find", () => {
  it("uses name when type and goal are missing", () => {
    expect(
      goalRowFromExtracted({ name: "Cabin", target_amount: null, priority: "medium" }, 55),
    ).toMatchObject({
      name: "Cabin",
      goal_type: "other",
      target_amount: null,
      amount_unknown: true,
    });
  });
});

import { describe, expect, it } from "vitest";
import { expectedPriceCents, matchesPublishedCadAmount } from "@/lib/config/pricing";

describe("expectedPriceCents", () => {
  it("matches the published CAD ladder", () => {
    expect(expectedPriceCents("progress", "monthly")).toBe(1700);
    expect(expectedPriceCents("progress", "annual")).toBe(17000);
    expect(expectedPriceCents("progress", "monthly", true)).toBe(800);
    expect(expectedPriceCents("progress", "annual", true)).toBe(8000);
    expect(expectedPriceCents("mastery", "monthly")).toBe(4400);
    expect(expectedPriceCents("mastery", "annual")).toBe(35000);
    expect(expectedPriceCents("academy", "monthly")).toBe(2600);
    expect(expectedPriceCents("academy", "annual")).toBe(26000);
  });
});

describe("matchesPublishedCadAmount", () => {
  it("accepts a CAD price at the published amount", () => {
    expect(
      matchesPublishedCadAmount({ currency: "cad", unit_amount: 35000 }, 35000),
    ).toBe(true);
  });

  it("accepts a CAD currency option when the price default is not CAD", () => {
    expect(
      matchesPublishedCadAmount(
        {
          currency: "usd",
          unit_amount: 25500,
          currency_options: { cad: { unit_amount: 35000 } },
        },
        35000,
      ),
    ).toBe(true);
  });

  it("rejects a non-CAD price with no matching CAD option", () => {
    expect(
      matchesPublishedCadAmount({ currency: "usd", unit_amount: 35000 }, 35000),
    ).toBe(false);
    expect(
      matchesPublishedCadAmount({ currency: "cad", unit_amount: 4400 }, 35000),
    ).toBe(false);
  });
});

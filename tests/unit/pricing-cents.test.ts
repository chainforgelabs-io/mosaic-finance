import { describe, expect, it } from "vitest";
import { expectedPriceCents } from "@/lib/config/pricing";

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

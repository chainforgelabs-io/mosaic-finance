import { describe, expect, it } from "vitest";
import { formatCompact, formatMoney, formatMoneyExact } from "@/lib/tracking/format";

describe("money format", () => {
  it("puts the minus before the dollar sign", () => {
    expect(formatMoney(-410)).toBe("-$410");
    expect(formatMoneyExact(-8)).toBe("-$8.00");
    expect(formatCompact(-8000)).toBe("-$8K");
    expect(formatMoney(410)).toBe("$410");
  });
});

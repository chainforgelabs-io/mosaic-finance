import { describe, expect, it } from "vitest";
import { publicWaitlistCount } from "@/lib/marketing/waitlist-count";

describe("publicWaitlistCount", () => {
  it("hides the tally until the list is past 100", () => {
    expect(publicWaitlistCount(0)).toBeNull();
    expect(publicWaitlistCount(5)).toBeNull();
    expect(publicWaitlistCount(100)).toBeNull();
    expect(publicWaitlistCount(null)).toBeNull();
  });

  it("shows the tally once the list is over 100", () => {
    expect(publicWaitlistCount(101)).toBe(101);
    expect(publicWaitlistCount(240)).toBe(240);
  });
});

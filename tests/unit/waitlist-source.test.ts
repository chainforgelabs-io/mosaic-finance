import { describe, expect, it } from "vitest";
import { waitlistSource } from "@/lib/marketing/waitlist-source";

describe("waitlistSource", () => {
  it("keeps the form name when there is no utm", () => {
    expect(waitlistSource("guide", null)).toBe("guide");
    expect(waitlistSource("calculator-fhsa", "")).toBe("calculator-fhsa");
  });

  it("appends a sanitized utm source", () => {
    expect(waitlistSource("guide", "X")).toBe("guide-x");
    expect(waitlistSource("hero", "twitter ads")).toBe("hero-twitterads");
  });
});
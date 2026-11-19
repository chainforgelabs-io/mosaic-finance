import { describe, expect, it } from "vitest";
import { marketingSectionHref } from "@/lib/marketing/section-href";

describe("marketingSectionHref", () => {
  it("keeps section links on the homepage and on /test", () => {
    expect(marketingSectionHref("/#pricing", "/")).toBe("#pricing");
    expect(marketingSectionHref("/#offer", "/test")).toBe("#offer");
  });

  it("sends other pages back to the homepage section", () => {
    expect(marketingSectionHref("/#trust", "/privacy")).toBe("/#trust");
  });

  it("leaves ordinary links alone", () => {
    expect(marketingSectionHref("/signup", "/test")).toBe("/signup");
  });
});

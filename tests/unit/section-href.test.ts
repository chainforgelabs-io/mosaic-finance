import { describe, expect, it } from "vitest";
import { marketingNavShowsSignIn, marketingSectionHref } from "@/lib/marketing/section-href";

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

describe("marketingNavShowsSignIn", () => {
  it("shows Sign In on /test even while the homepage hides it", () => {
    expect(marketingNavShowsSignIn("/test", true)).toBe(true);
    expect(marketingNavShowsSignIn("/", true)).toBe(false);
  });

  it("shows Sign In wherever the nav is allowed to show auth", () => {
    expect(marketingNavShowsSignIn("/", false)).toBe(true);
    expect(marketingNavShowsSignIn("/privacy", false)).toBe(true);
  });
});

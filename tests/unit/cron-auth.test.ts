import { afterEach, describe, expect, it } from "vitest";
import { bearerMatches, isCronRequest } from "@/lib/cron-auth";

function req(authorization: string | null) {
  return { headers: { get: (name: string) => (name === "authorization" ? authorization : null) } };
}

describe("bearerMatches", () => {
  it("matches only the exact bearer token", () => {
    expect(bearerMatches("Bearer abc123", "abc123")).toBe(true);
    expect(bearerMatches("Bearer abc124", "abc123")).toBe(false);
    expect(bearerMatches("Bearer abc12", "abc123")).toBe(false);
    expect(bearerMatches("abc123", "abc123")).toBe(false);
  });

  it("fails closed when the secret is missing", () => {
    expect(bearerMatches("Bearer undefined", undefined)).toBe(false);
    expect(bearerMatches("Bearer ", "")).toBe(false);
    expect(bearerMatches(null, "abc123")).toBe(false);
  });
});

describe("isCronRequest", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("rejects everything when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(req("Bearer undefined"))).toBe(false);
    expect(isCronRequest(req(null))).toBe(false);
  });

  it("accepts the configured secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronRequest(req("Bearer s3cret"))).toBe(true);
    expect(isCronRequest(req("Bearer other"))).toBe(false);
  });
});

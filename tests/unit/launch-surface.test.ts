import { describe, expect, it } from "vitest";
import {
  DEFERRED_DASHBOARD_PREFIXES,
  isDeferredDashboardPath,
  isPublicCheckoutTier,
  MASTERY_PUBLIC,
  PUBLIC_TIERS,
  TRIAL_COPY,
  TRIAL_DURATION_DAYS,
  trialEndsAtIso,
} from "@/lib/config/launch-surface";
import { ENTITLEMENT_COPY } from "@/lib/entitlements";
import { TIER_FEATURES } from "@/lib/config/pricing";

describe("launch surface", () => {
  it("keeps Mastery off the public site", () => {
    expect(MASTERY_PUBLIC).toBe(false);
    expect(PUBLIC_TIERS).toEqual(["pulse", "progress"]);
    expect(isPublicCheckoutTier("progress")).toBe(true);
    expect(isPublicCheckoutTier("mastery")).toBe(false);
    expect(isPublicCheckoutTier("academy")).toBe(false);
  });

  it("uses a 7-day reverse trial", () => {
    expect(TRIAL_DURATION_DAYS).toBe(7);
    expect(TRIAL_COPY.hyphen).toBe("7-day");
    const from = new Date("2026-10-09T12:00:00.000Z");
    expect(trialEndsAtIso(from)).toBe("2026-10-16T12:00:00.000Z");
  });

  it("redirects deferred dashboard routes", () => {
    expect(isDeferredDashboardPath("/dashboard/market-context")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/market-context/guide")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/tax-pack")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/academy")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/money-club")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/priority")).toBe(true);
    expect(isDeferredDashboardPath("/dashboard/meeting")).toBe(false);
    expect(isDeferredDashboardPath("/dashboard/plan")).toBe(false);
    expect(DEFERRED_DASHBOARD_PREFIXES.length).toBeGreaterThan(0);
  });

  it("keeps statement parsing on Progress and drops Mastery from public copy", () => {
    expect(TIER_FEATURES.progress.join(" ")).toMatch(/Statement and receipt parsing/i);
    expect(TIER_FEATURES.pulse.join(" ")).toContain(TRIAL_COPY.hyphen);
    expect(ENTITLEMENT_COPY.charlie).toContain(TRIAL_COPY.hyphen);
    expect(ENTITLEMENT_COPY.charlie).not.toMatch(/Mastery/);
    expect(ENTITLEMENT_COPY.report).not.toMatch(/Mastery/);
    expect(ENTITLEMENT_COPY.parse).not.toMatch(/Mastery/);
    expect(ENTITLEMENT_COPY.charlieCap).not.toMatch(/Mastery/);
    expect(ENTITLEMENT_COPY.reportCap).not.toMatch(/Mastery/);
  });
});

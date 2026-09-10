import { describe, expect, it } from "vitest";
import { isTrialActive, normalizeTier, resolveEntitlements } from "@/lib/entitlements";

describe("normalizeTier", () => {
  it("maps legacy names", () => {
    expect(normalizeTier("snapshot")).toBe("pulse");
    expect(normalizeTier("plan")).toBe("progress");
    expect(normalizeTier("advisor")).toBe("mastery");
  });
});

describe("resolveEntitlements", () => {
  it("gives Pulse tracking-only access", () => {
    const e = resolveEntitlements({ subscription_tier: "pulse" });
    expect(e.effectiveTier).toBe("pulse");
    expect(e.canUseCharlie).toBe(false);
    expect(e.canGenerateReport).toBe(false);
    expect(e.canParseUploads).toBe(false);
    expect(e.hasClub).toBe(false);
  });

  it("promotes an active trial to Progress", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const e = resolveEntitlements({
      subscription_tier: "pulse",
      trial_ends_at: future,
    });
    expect(e.trialActive).toBe(true);
    expect(e.effectiveTier).toBe("progress");
    expect(e.canUseCharlie).toBe(true);
    expect(e.canGenerateReport).toBe(true);
  });

  it("does not promote an expired trial", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(isTrialActive(past)).toBe(false);
    const e = resolveEntitlements({
      subscription_tier: "pulse",
      trial_ends_at: past,
    });
    expect(e.effectiveTier).toBe("pulse");
  });

  it("gives Mastery club, tax pack, and annual academy", () => {
    const e = resolveEntitlements({
      subscription_tier: "mastery",
      subscription_interval: "annual",
    });
    expect(e.hasClub).toBe(true);
    expect(e.hasTaxPack).toBe(true);
    expect(e.hasAcademy).toBe(true);
    expect(e.reportRegenCap).toBeNull();
    expect(e.charlieSoftCap).toEqual({ kind: "conversations", limit: 100 });
  });

  it("caps Progress report regen at 1", () => {
    const e = resolveEntitlements({ subscription_tier: "progress" });
    expect(e.reportRegenCap).toBe(1);
    expect(e.charlieSoftCap).toEqual({ kind: "messages", limit: 100 });
  });
});

describe("price mapping", () => {
  it("keeps founding Progress cheaper than list in config", async () => {
    const { FOUNDING_PRICING, TIER_PRICING } = await import("@/lib/config/pricing");
    expect(FOUNDING_PRICING.monthly).toBe("$8");
    expect(TIER_PRICING.progress.monthly).toBe("$17");
    expect(TIER_PRICING.mastery.annual).toBe("$350");
  });
});

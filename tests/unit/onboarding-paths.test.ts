import { describe, expect, it } from "vitest";
import {
  authLandingPath,
  onboardingResumePath,
  reportEntryPath,
  reportStarted,
  type OnboardingFlags,
} from "@/lib/onboarding/paths";

const fresh: OnboardingFlags = {
  profileComplete: false,
  factFindComplete: false,
  riskProfileComplete: false,
  holdingsExist: false,
  planExists: false,
};

describe("authLandingPath", () => {
  it("sends a new account to the tracking dashboard", () => {
    expect(authLandingPath(fresh)).toBe("/dashboard");
  });

  it("keeps someone mid fact-find on the dashboard until they choose the report", () => {
    expect(
      authLandingPath({
        ...fresh,
        profileComplete: true,
        factFindComplete: true,
      }),
    ).toBe("/dashboard");
  });

  it("sends an admin who already has holdings to the approval queue", () => {
    expect(
      authLandingPath({ ...fresh, isAdmin: true, holdingsExist: true }),
    ).toBe("/admin/approval-queue");
  });

  it("does not send a new admin into the queue", () => {
    expect(authLandingPath({ ...fresh, isAdmin: true })).toBe("/dashboard");
  });
});

describe("onboardingResumePath", () => {
  it("stays on the profile step until that step is saved", () => {
    expect(onboardingResumePath(fresh)).toBe("/onboarding");
  });

  it("advances to the next unfinished report step", () => {
    expect(onboardingResumePath({ ...fresh, profileComplete: true })).toBe(
      "/onboarding/fact-find",
    );
    expect(
      onboardingResumePath({
        ...fresh,
        profileComplete: true,
        factFindComplete: true,
      }),
    ).toBe("/onboarding/goals");
    expect(
      onboardingResumePath({
        ...fresh,
        profileComplete: true,
        factFindComplete: true,
        riskProfileComplete: true,
      }),
    ).toBe("/onboarding/holdings");
  });

  it("leaves onboarding once holdings or a report exist", () => {
    expect(onboardingResumePath({ ...fresh, holdingsExist: true })).toBe("/dashboard");
    expect(onboardingResumePath({ ...fresh, planExists: true })).toBe("/dashboard");
  });
});

describe("reportEntryPath", () => {
  it("starts at the profile step", () => {
    expect(reportEntryPath(fresh)).toBe("/onboarding");
    expect(reportStarted(fresh)).toBe(false);
  });

  it("resumes the unfinished report step, including holdings without a report", () => {
    expect(reportEntryPath({ ...fresh, profileComplete: true })).toBe(
      "/onboarding/fact-find",
    );
    expect(
      reportEntryPath({ ...fresh, holdingsExist: true, riskProfileComplete: true }),
    ).toBe("/onboarding/holdings");
    expect(reportStarted({ ...fresh, profileComplete: true })).toBe(true);
  });
});

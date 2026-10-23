export interface OnboardingFlags {
  profileComplete: boolean;
  factFindComplete: boolean;
  riskProfileComplete: boolean;
  holdingsExist: boolean;
  planExists: boolean;
  isAdmin?: boolean;
  /** Progress, Mastery, or an active trial. Pulse without a trial stays on the dashboard. */
  reportEntitled?: boolean;
}

/**
 * Where a signed-in person lands.
 * Signup order: demographics, Charlie, risk profile, assets, goals, then the dashboard.
 * A report means that sequence is finished. Assets alone do not.
 */
export function authLandingPath(flags: OnboardingFlags): string {
  if (flags.isAdmin && (flags.planExists || flags.holdingsExist)) {
    return "/admin/approval-queue";
  }
  if (flags.planExists) return "/dashboard";
  if (flags.reportEntitled === false && flags.profileComplete) return "/dashboard";
  return onboardingResumePath(flags);
}

/**
 * Next unfinished signup step.
 * Order: profile, Charlie, risk profile, assets, goals.
 */
export function onboardingResumePath(flags: OnboardingFlags): string {
  if (flags.planExists) return "/dashboard";
  if (flags.holdingsExist) return "/onboarding/goals";
  if (flags.riskProfileComplete) return "/onboarding/holdings";
  if (flags.factFindComplete) return "/onboarding/risk-profile";
  if (flags.profileComplete) return "/onboarding/fact-find";
  return "/onboarding";
}

/** Where the dashboard invitation sends someone who wants a Progress Report. */
export function reportEntryPath(flags: OnboardingFlags): string {
  return onboardingResumePath(flags);
}

export function reportStarted(flags: OnboardingFlags): boolean {
  return (
    flags.profileComplete ||
    flags.factFindComplete ||
    flags.riskProfileComplete ||
    flags.holdingsExist ||
    flags.planExists
  );
}

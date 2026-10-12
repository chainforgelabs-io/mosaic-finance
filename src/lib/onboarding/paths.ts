export interface OnboardingFlags {
  profileComplete: boolean;
  factFindComplete: boolean;
  riskProfileComplete: boolean;
  holdingsExist: boolean;
  planExists: boolean;
  isAdmin?: boolean;
}

/**
 * Where a signed-in person lands. Tracking is available before a Progress Report,
 * so auth no longer drops new accounts into the fact-find.
 */
export function authLandingPath(flags: OnboardingFlags): string {
  if (flags.isAdmin && (flags.planExists || flags.holdingsExist)) {
    return "/admin/approval-queue";
  }
  return "/dashboard";
}

/**
 * Skip a profile step the person already finished when they open onboarding
 * on purpose. Holdings or a report means that path is done.
 */
export function onboardingResumePath(flags: OnboardingFlags): string {
  if (flags.planExists || flags.holdingsExist) return "/dashboard";
  if (flags.riskProfileComplete) return "/onboarding/holdings";
  if (flags.factFindComplete) return "/onboarding/goals";
  if (flags.profileComplete) return "/onboarding/fact-find";
  return "/onboarding";
}

/** Where the dashboard invitation sends someone who wants a Progress Report. */
export function reportEntryPath(flags: OnboardingFlags): string {
  if (flags.planExists) return "/dashboard";
  if (flags.riskProfileComplete || flags.holdingsExist) return "/onboarding/holdings";
  if (flags.factFindComplete) return "/onboarding/goals";
  if (flags.profileComplete) return "/onboarding/fact-find";
  return "/onboarding";
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

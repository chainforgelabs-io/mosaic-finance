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
 * Where a signed-in person lands. Discovery (profile + Charlie) comes first when
 * the Progress Report has not been started and Charlie is available.
 */
export function authLandingPath(flags: OnboardingFlags): string {
  if (flags.isAdmin && (flags.planExists || flags.holdingsExist)) {
    return "/admin/approval-queue";
  }
  if (!flags.planExists && !flags.holdingsExist && flags.reportEntitled !== false) {
    return onboardingResumePath(flags);
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

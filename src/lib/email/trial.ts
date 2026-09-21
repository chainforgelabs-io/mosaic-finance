const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function optedOutOfMarketing(prefs: {
  weekly_market?: boolean;
  education_emails?: boolean;
} | null | undefined): boolean {
  return prefs?.weekly_market === false && prefs?.education_emails === false;
}

export function daysRemaining(trialEndsAt: string, now = new Date()): number {
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / ONE_DAY_MS));
}

export function shouldSendTrialDay10(opts: {
  subscriptionTier: string;
  trialEndsAt: string | null | undefined;
  alreadySentAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (opts.subscriptionTier !== "pulse") return false;
  if (opts.alreadySentAt) return false;
  if (!opts.trialEndsAt) return false;
  const now = opts.now ?? new Date();
  const end = new Date(opts.trialEndsAt).getTime();
  const t = now.getTime();
  return end > t && end <= t + FOUR_DAYS_MS;
}

export function shouldSendTrialExpired(opts: {
  subscriptionTier: string;
  trialEndsAt: string | null | undefined;
  alreadySentAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (opts.subscriptionTier !== "pulse") return false;
  if (opts.alreadySentAt) return false;
  if (!opts.trialEndsAt) return false;
  const now = opts.now ?? new Date();
  const end = new Date(opts.trialEndsAt).getTime();
  const t = now.getTime();
  return end <= t && end > t - ONE_DAY_MS;
}

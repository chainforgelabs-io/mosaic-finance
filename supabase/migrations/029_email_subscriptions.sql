-- Email subscription hygiene: unsubscribe, trial send idempotency, education cadence.
-- Additive only. Existing notification_preferences rows keep working; new keys merge in app code.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS trial_day10_emailed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expired_emailed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_education_email_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_lower_idx
  ON public.user_profiles (lower(email))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.email IS
  'Cached auth email for outbound mail and unsubscribe matching. Not a login identifier.';
COMMENT ON COLUMN public.user_profiles.trial_day10_emailed_at IS
  'When the 4-days-left Progress trial email was sent. Null means not yet sent.';
COMMENT ON COLUMN public.user_profiles.trial_expired_emailed_at IS
  'When the trial-ended Pulse email was sent. Null means not yet sent.';
COMMENT ON COLUMN public.user_profiles.last_education_email_at IS
  'Last biweekly education email send. Used as a retry guard.';

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.waitlist_signups.unsubscribed_at IS
  'Set when the address unsubscribes from Mosaic marketing email.';
COMMENT ON COLUMN public.waitlist_signups.converted_at IS
  'Set when this waitlist email creates an app account. Stops nurture.';

ALTER TABLE public.user_profiles
  ALTER COLUMN notification_preferences SET DEFAULT
    '{"plan_ready": true, "weekly_market": true, "education_emails": true, "quarterly_replan": false}'::jsonb;

COMMENT ON COLUMN public.user_profiles.notification_preferences IS
  'User email toggles: plan_ready, weekly_market, education_emails, quarterly_replan';

-- Chosen day of the month for the net-worth snapshot reminder,
-- last month an email was sent, and a stamp when goals from discovery
-- have been checked.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS net_worth_reminder_day SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_net_worth_reminder_day_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_net_worth_reminder_day_check
    CHECK (net_worth_reminder_day BETWEEN 1 AND 28);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS net_worth_reminder_sent_for TEXT;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.net_worth_reminder_day IS
  'Day of month (1–28) to remind the household to save a net worth snapshot.';

COMMENT ON COLUMN public.user_profiles.net_worth_reminder_sent_for IS
  'YYYY-MM of the last net-worth reminder email, so each month sends once.';

COMMENT ON COLUMN public.goals.reviewed_at IS
  'Set when the person confirms or edits a goal after discovery.';

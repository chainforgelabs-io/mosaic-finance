-- Last Monday-start week (YYYY-MM-DD) a "log this week" email was sent.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS weekly_log_reminder_sent_for TEXT;

COMMENT ON COLUMN public.user_profiles.weekly_log_reminder_sent_for IS
  'Monday YYYY-MM-DD of the last weekly log reminder, so each week sends once.';

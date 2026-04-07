-- Notification preferences for email toggles (Settings > Notifications)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"plan_ready": true, "weekly_market": true, "quarterly_replan": false}'::jsonb;

COMMENT ON COLUMN public.user_profiles.notification_preferences IS 'User email notification toggles: plan_ready, weekly_market, quarterly_replan';

-- Pulse / Progress / Mastery + subscription columns used by entitlements
-- Drop the old check first: snapshot/plan/advisor cannot be rewritten to
-- pulse/progress/mastery while valid_subscription_tier still forbids those values.

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS valid_subscription_tier;

UPDATE public.user_profiles SET subscription_tier = 'pulse' WHERE subscription_tier IN ('snapshot', 'free');
UPDATE public.user_profiles SET subscription_tier = 'progress' WHERE subscription_tier IN ('plan', 'essential');
UPDATE public.user_profiles SET subscription_tier = 'mastery' WHERE subscription_tier IN ('advisor', 'pro', 'premium');

ALTER TABLE public.user_profiles ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('pulse', 'progress', 'mastery'));

ALTER TABLE public.user_profiles ALTER COLUMN subscription_tier SET DEFAULT 'pulse';

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_interval TEXT
    CHECK (subscription_interval IS NULL OR subscription_interval IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS academy_access BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS user_profiles_founding_idx
  ON public.user_profiles (is_founding_member)
  WHERE is_founding_member = true;

CREATE INDEX IF NOT EXISTS user_profiles_trial_ends_idx
  ON public.user_profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

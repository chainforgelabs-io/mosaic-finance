-- Snapshot / Plan / Advisor — replace Free / Essential / Pro / Premium

UPDATE public.user_profiles SET subscription_tier = 'snapshot' WHERE subscription_tier = 'free';
UPDATE public.user_profiles SET subscription_tier = 'plan' WHERE subscription_tier = 'essential';
UPDATE public.user_profiles SET subscription_tier = 'advisor' WHERE subscription_tier IN ('pro', 'premium');

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS valid_subscription_tier;

ALTER TABLE public.user_profiles ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('snapshot', 'plan', 'advisor'));

ALTER TABLE public.user_profiles ALTER COLUMN subscription_tier SET DEFAULT 'snapshot';

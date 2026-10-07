-- Migration 035: entitlement columns on user_profiles are service-role only.
--
-- The "user_own_data" policy (002) lets a signed-in user UPDATE or INSERT any
-- column of their own profile through the Supabase REST API, including
-- subscription_tier, role, trial_ends_at, is_founding_member, academy_access,
-- and the Stripe identifiers. Those drive every entitlement and admin check.
--
-- This trigger leaves normal profile edits alone and only intervenes when a
-- request made with an end-user JWT (role anon/authenticated) tries to change
-- an entitlement column. Service-role requests (Stripe webhook, cron, admin
-- scripts) and direct SQL (no JWT) are unaffected.
--
-- Additive: no drops, no data changes. Roll back with
--   DROP TRIGGER IF EXISTS protect_profile_entitlements ON public.user_profiles;
--   DROP FUNCTION IF EXISTS public.protect_profile_entitlements();

CREATE OR REPLACE FUNCTION public.protect_profile_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := auth.role();
BEGIN
  -- Only end-user requests are constrained.
  IF jwt_role IS NULL OR jwt_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A fresh profile created from the browser always starts on Pulse as a
    -- plain user. The app sets trial_ends_at at signup, so that one stays.
    NEW.subscription_tier := 'pulse';
    NEW.role := 'user';
    NEW.is_founding_member := false;
    NEW.academy_access := false;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.is_founding_member IS DISTINCT FROM OLD.is_founding_member
     OR NEW.academy_access IS DISTINCT FROM OLD.academy_access
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
  THEN
    RAISE EXCEPTION 'entitlement columns can only be changed by the service role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_entitlements ON public.user_profiles;

CREATE TRIGGER protect_profile_entitlements
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_entitlements();

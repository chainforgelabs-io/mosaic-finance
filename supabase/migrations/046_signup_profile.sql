-- Migration 046: create the profile row when the auth user is created.
--
-- Signup inserts auth.users first, then user_profiles. If the browser stops
-- between those steps, later writes fail because every table references the
-- profile. This trigger inserts a Pulse profile from signup metadata. The
-- app's own insert then hits the primary key and continues.
--
-- Additive. Roll back with:
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_alias TEXT := NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'alias', '')), 30), '');
  raw_province TEXT := upper(left(COALESCE(NEW.raw_user_meta_data->>'province', ''), 2));
  province_code TEXT := NULL;
BEGIN
  IF raw_province IN ('ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS', 'NB', 'PE', 'NL', 'NT', 'NU', 'YT') THEN
    province_code := raw_province;
  END IF;

  INSERT INTO public.user_profiles (id, alias, province, email, subscription_tier, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(raw_alias, 'member'),
    province_code,
    NEW.email,
    'pulse',
    now() + interval '7 days'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A profile problem must not block the auth user. The app inserts again after signup.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

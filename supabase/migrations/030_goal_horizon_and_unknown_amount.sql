-- Goals can be timed by a calendar date or a target age.
-- amount_unknown marks a goal whose cost the user wants help estimating.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS target_age INTEGER,
  ADD COLUMN IF NOT EXISTS amount_unknown BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_target_age_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_target_age_check
  CHECK (target_age IS NULL OR (target_age >= 1 AND target_age <= 120));

COMMENT ON COLUMN public.goals.target_age IS
  'Target age for the goal when the user chose an age instead of a calendar date.';
COMMENT ON COLUMN public.goals.amount_unknown IS
  'True when the user is not sure of the target amount and wants to find out what the goal will cost.';

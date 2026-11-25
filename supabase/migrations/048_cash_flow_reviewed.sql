-- Set when the person confirms the cash-flow plan, including a plan
-- they built themselves. Null means a seeded plan is still waiting
-- to be checked. Rollback: drop this column.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cash_flow_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.cash_flow_reviewed_at IS
  'Set when the person confirms the cash-flow plan, or saves one they built themselves.';

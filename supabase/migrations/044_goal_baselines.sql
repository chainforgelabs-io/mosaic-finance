-- Remember the debt balances when a payoff goal began, and a monthly amount a goal asks for.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS baseline_balances JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS monthly_need NUMERIC;

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_tracking_class_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_tracking_class_check
  CHECK (
    tracking_class IS NULL
    OR tracking_class IN ('balance', 'debt', 'retirement_age', 'retirement_income', 'cost_of_living', 'note')
  );

COMMENT ON COLUMN public.goals.baseline_balances IS
  'Account key to dollar balance when the goal began. Payoff goals use this as the start.';
COMMENT ON COLUMN public.goals.monthly_need IS
  'Monthly amount the person entered for retirement spending or cost of living.';

-- How a purchase is paid for, and a name on a savings account that is separate from its type.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS funding_method TEXT,
  ADD COLUMN IF NOT EXISTS payoff_months INTEGER;

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_funding_method_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_funding_method_check
  CHECK (
    funding_method IS NULL
    OR funding_method IN ('set_aside', 'existing', 'cash_flow', 'credit')
  );

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_payoff_months_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_payoff_months_check
  CHECK (payoff_months IS NULL OR (payoff_months >= 1 AND payoff_months <= 120));

COMMENT ON COLUMN public.goals.funding_method IS
  'How a trip is paid for: a savings account set aside, savings already on file, cash flow, or a card.';
COMMENT ON COLUMN public.goals.payoff_months IS
  'Months entered for paying down a card used for a trip.';

ALTER TABLE public.investment_holdings
  ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMENT ON COLUMN public.investment_holdings.display_name IS
  'Name the person gave this account. The account type stays the kind of account.';

-- One figure for what the household owes on credit cards and lines of credit.
-- Updated at setup or a balance check. Not a balance per card.

ALTER TABLE public.cash_anchors
  ADD COLUMN IF NOT EXISTS owed_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS owed_as_of DATE;

ALTER TABLE public.balance_checks
  ADD COLUMN IF NOT EXISTS owed_balance NUMERIC;

COMMENT ON COLUMN public.cash_anchors.owed_balance IS
  'What the household owes on credit cards and lines of credit, as one figure. Null until entered. Updated at setup or a balance check.';

COMMENT ON COLUMN public.cash_anchors.owed_as_of IS
  'The date owed_balance was last entered.';

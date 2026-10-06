-- Statement baseline: tag each line so card payments and transfers
-- are not counted as spending, and store the confirmed monthly picture.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS line_role TEXT NOT NULL DEFAULT 'purchase';

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_line_role_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_line_role_check
  CHECK (line_role IN ('purchase', 'income', 'card_payment', 'transfer', 'fee', 'interest'));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS instrument TEXT;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_instrument_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_instrument_check
  CHECK (instrument IS NULL OR instrument IN ('credit', 'debit'));

CREATE TABLE IF NOT EXISTS public.spending_baselines (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id),
  income_monthly NUMERIC NOT NULL,
  needs_monthly NUMERIC NOT NULL,
  flexible_monthly NUMERIC NOT NULL,
  left_monthly NUMERIC NOT NULL,
  credit_growth_monthly NUMERIC NOT NULL DEFAULT 0,
  months_covered INTEGER NOT NULL CHECK (months_covered > 0),
  partial BOOLEAN NOT NULL DEFAULT false,
  flexible_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spending_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own spending baseline" ON public.spending_baselines;
CREATE POLICY "Users manage own spending baseline"
  ON public.spending_baselines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_spending_baselines_updated_at ON public.spending_baselines;
CREATE TRIGGER set_spending_baselines_updated_at
  BEFORE UPDATE ON public.spending_baselines
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

COMMENT ON TABLE public.spending_baselines IS
  'Confirmed three-month picture from household statements. Sets left to spend.';

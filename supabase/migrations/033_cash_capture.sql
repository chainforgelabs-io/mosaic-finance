-- Keypad capture: money in or out, scheduled bills and paycheques,
-- a starting cash balance, and balance checks that can close a gap.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'out';

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_direction_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_direction_check CHECK (direction IN ('in', 'out'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual', 'screenshot', 'scheduled', 'balance_check', 'catchup'));

CREATE TABLE IF NOT EXISTS public.recurring_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category ~ '^[a-z][a-z0-9_]{0,39}$'),
  direction TEXT NOT NULL DEFAULT 'out' CHECK (direction IN ('in', 'out')),
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'biweekly', 'monthly')),
  next_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recurring_items_user_next_idx
  ON public.recurring_items (user_id, next_date);

ALTER TABLE public.recurring_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring items" ON public.recurring_items;
CREATE POLICY "Users manage own recurring items"
  ON public.recurring_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_recurring_items_updated_at ON public.recurring_items;
CREATE TRIGGER set_recurring_items_updated_at
  BEFORE UPDATE ON public.recurring_items
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_item_id UUID REFERENCES public.recurring_items(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.cash_anchors (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id),
  starting_balance NUMERIC NOT NULL,
  anchor_date DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cash_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cash anchor" ON public.cash_anchors;
CREATE POLICY "Users manage own cash anchor"
  ON public.cash_anchors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_cash_anchors_updated_at ON public.cash_anchors;
CREATE TRIGGER set_cash_anchors_updated_at
  BEFORE UPDATE ON public.cash_anchors
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS public.balance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  check_date DATE NOT NULL,
  actual_balance NUMERIC NOT NULL,
  expected_balance NUMERIC NOT NULL,
  gap_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS balance_checks_user_date_idx
  ON public.balance_checks (user_id, check_date DESC);

ALTER TABLE public.balance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own balance checks" ON public.balance_checks;
CREATE POLICY "Users manage own balance checks"
  ON public.balance_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.cash_anchors IS
  'Household cash balance at the end of anchor_date. Later transactions move the expected balance.';

COMMENT ON TABLE public.balance_checks IS
  'A typed bank balance compared with the expected balance. A check counts as the weekly log.';
